using System.Text.Json;
using kmsh_whiteboard.Models.Board;
using kmsh_whiteboard.Settings;
using Microsoft.Extensions.Options;

namespace kmsh_whiteboard.Services;

/// <summary>
/// 院方 Board API 代理實作：以具名 HttpClient（BaseAddress 由 DI 設定）POST JSON 呼叫
/// /api/v1/Board_bed，body 為 {"病房":"<ward>"}。如設定 ApiKey 則帶 x-api-key 標頭。
/// 回應字串多補空白（含全形），取出後一律 trim。
/// </summary>
public class BoardApiService : IBoardApiService
{
    private static readonly JsonSerializerOptions _json = new() { PropertyNameCaseInsensitive = true };

    private readonly HttpClient _http;
    private readonly BoardApiOptions _options;
    private readonly ILogger<BoardApiService> _logger;

    public BoardApiService(HttpClient http, IOptions<BoardApiOptions> options, ILogger<BoardApiService> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<List<BoardBedItem>> GetBedListAsync(string ward, CancellationToken ct = default)
    {
        // body 為中文鍵 {"病房":"W52"}，以字典序列化
        var body = new Dictionary<string, string> { ["病房"] = ward };
        using var req = new HttpRequestMessage(HttpMethod.Post, "api/v1/Board_bed")
        {
            Content = JsonContent.Create(body),
        };
        if (!string.IsNullOrWhiteSpace(_options.ApiKey))
            req.Headers.TryAddWithoutValidation("x-api-key", _options.ApiKey);

        _logger.LogInformation("呼叫 Board_bed 病房={Ward}", ward);
        var resp = await _http.SendAsync(req, ct);
        resp.EnsureSuccessStatusCode();
        var raw = await resp.Content.ReadAsStringAsync(ct);

        var parsed = JsonSerializer.Deserialize<BoardBedResponse>(raw, _json);
        var list = parsed?.Data ?? new List<BoardBedItem>();

        // 院方字串補空白（含全形）→ 一律 trim
        foreach (var it in list)
        {
            it.Hhisnum = Trim(it.Hhisnum);
            it.Hnamec  = Trim(it.Hnamec);
            it.Hidno   = Trim(it.Hidno);
            it.Hbirthdt = Trim(it.Hbirthdt);
            it.Hsex    = Trim(it.Hsex);
            it.Hnursta = Trim(it.Hnursta);
            it.Hbed    = Trim(it.Hbed);
            it.Doctor    = Trim(it.Doctor);
            it.AdmitDate = Trim(it.AdmitDate);
            it.Diagnosis = Trim(it.Diagnosis);
            it.Department = Trim(it.Department);
        }

        // 院方 Board_bed 自 2026-07 起 join 用藥 → 同一床位病人變成「每筆用藥一列」（例：AICU 8 人卻回 515 列）。
        // 病人/病房/床位欄位在同病人各列皆相同、僅用藥列不同 → 以病歷號去重為「一床一列」，
        // 回復看板/roster/occupancy 等消費端原本「一病人一列」的預期。若院方日後恢復單列，去重為冪等不影響。
        var deduped = list
            .Where(x => !string.IsNullOrWhiteSpace(x.Hhisnum))
            .GroupBy(x => x.Hhisnum!.Trim())
            .Select(g =>
            {
                var head = g.First();
                // 各列的用藥彙整到代表列（去重後保留完整用藥清單，供 antibiotic/live 帶入）
                head.Meds = g
                    .Where(r => !string.IsNullOrWhiteSpace(r.Med))
                    .Select(r => new BoardBedMed
                    {
                        Name = Trim(r.Med), StartDate = Trim(r.MedStartDate), StartTime = Trim(r.MedStartTime),
                        EndDate = Trim(r.MedEndDate), EndTime = Trim(r.MedEndTime),
                    })
                    .ToList();
                return head;
            })
            .ToList();
        _logger.LogInformation("Board_bed 病房={Ward}：原始 {Raw} 列，去重後 {Distinct} 人", ward, list.Count, deduped.Count);
        return deduped;
    }

    public async Task<List<BoardErItem>> GetErListAsync(CancellationToken ct = default)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, "api/v1/Board_ER")
        {
            Content = JsonContent.Create(new { }),   // body {}
        };
        if (!string.IsNullOrWhiteSpace(_options.ApiKey))
            req.Headers.TryAddWithoutValidation("x-api-key", _options.ApiKey);

        _logger.LogInformation("呼叫 Board_ER");
        var resp = await _http.SendAsync(req, ct);
        resp.EnsureSuccessStatusCode();
        var raw = await resp.Content.ReadAsStringAsync(ct);

        var parsed = JsonSerializer.Deserialize<BoardErResponse>(raw, _json);
        var list = parsed?.Data ?? new List<BoardErItem>();
        foreach (var it in list)
        {
            it.Hhisnum = Trim(it.Hhisnum); it.Hnamec = Trim(it.Hnamec); it.Hidno = Trim(it.Hidno);
            it.Hbirthdt = Trim(it.Hbirthdt); it.Hsex = Trim(it.Hsex); it.Doctor = Trim(it.Doctor);
            it.DoctorCard = Trim(it.DoctorCard); it.Ward = Trim(it.Ward); it.Flow = Trim(it.Flow);
            it.Triage = Trim(it.Triage); it.Category = Trim(it.Category); it.Hbed = Trim(it.Hbed);
            it.Diagnosis = Trim(it.Diagnosis); it.Department = Trim(it.Department);
        }
        return list;
    }

    /// <summary>Board_ER_TypeE（死亡類別在室，不佔床）筆數；失敗回 0（白板不中斷）。</summary>
    public async Task<int> GetErTypeECountAsync(CancellationToken ct = default)
        => (await GetErTypeEListAsync(ct)).Count;

    /// <summary>Board_ER_TypeE（死亡類別，不佔床）清單；失敗回空清單（白板不中斷）。</summary>
    public async Task<List<BoardErTypeEItem>> GetErTypeEListAsync(CancellationToken ct = default)
    {
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, "api/v1/Board_ER_TypeE") { Content = JsonContent.Create(new { }) };
            if (!string.IsNullOrWhiteSpace(_options.ApiKey))
                req.Headers.TryAddWithoutValidation("x-api-key", _options.ApiKey);
            var resp = await _http.SendAsync(req, ct);
            resp.EnsureSuccessStatusCode();
            var raw = await resp.Content.ReadAsStringAsync(ct);
            var parsed = JsonSerializer.Deserialize<BoardErTypeEResponse>(raw, _json);
            return parsed?.Data ?? new();
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Board_ER_TypeE 取得失敗，死亡清單以空續行"); return new(); }
    }

    public async Task<List<BoardOrItem>> GetOrListAsync(CancellationToken ct = default)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, "api/v1/Board_OR")
        {
            Content = JsonContent.Create(new { }),   // body {}
        };
        if (!string.IsNullOrWhiteSpace(_options.ApiKey))
            req.Headers.TryAddWithoutValidation("x-api-key", _options.ApiKey);

        _logger.LogInformation("呼叫 Board_OR");
        var resp = await _http.SendAsync(req, ct);
        resp.EnsureSuccessStatusCode();
        var raw = await resp.Content.ReadAsStringAsync(ct);

        var parsed = JsonSerializer.Deserialize<BoardOrResponse>(raw, _json);
        var list = parsed?.Data ?? new List<BoardOrItem>();
        foreach (var it in list)
        {
            it.Room = Trim(it.Room); it.Hhisnum = Trim(it.Hhisnum); it.Hnamec = Trim(it.Hnamec);
            it.Hsex = Trim(it.Hsex); it.Hbirthdt = Trim(it.Hbirthdt); it.Surgery = Trim(it.Surgery);
            it.Doctor = Trim(it.Doctor); it.Department = Trim(it.Department); it.Anes = Trim(it.Anes); it.Source = Trim(it.Source);
            it.OpDate = Trim(it.OpDate); it.OpTime = Trim(it.OpTime); it.Diagnosis = Trim(it.Diagnosis);
        }
        return list;
    }

    /// <summary>去除前後半形與全形空白。</summary>
    private static string? Trim(string? s)
        => string.IsNullOrEmpty(s) ? s : s.Trim().Trim('　');
}
