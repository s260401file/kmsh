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

        // 院方 Board_bed 曾（2026-07）join 用藥 → 同病人每筆用藥一列（例：AICU 8 人卻回 515 列）。
        // 用藥已改由獨立端點 Board_AICUUD（見 GetAicuUdAsync／antibiotic-live），此處只保留「以病歷號去重為一床一列」，
        // 不再彙整用藥；院方若仍回多列，去重為冪等不影響（census 與用藥解耦）。
        var deduped = list
            .Where(x => !string.IsNullOrWhiteSpace(x.Hhisnum))
            .GroupBy(x => x.Hhisnum!.Trim())
            .Select(g => g.First())
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

    /// <summary>AICUPHY（AICU 身體約束）清單；同主機同 x-api-key。失敗回空清單（白板不中斷）。</summary>
    public async Task<List<AicuPhyItem>> GetAicuRestraintAsync(CancellationToken ct = default)
    {
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, "api/v1/AICUPHY") { Content = JsonContent.Create(new { }) };
            if (!string.IsNullOrWhiteSpace(_options.ApiKey))
                req.Headers.TryAddWithoutValidation("x-api-key", _options.ApiKey);
            var resp = await _http.SendAsync(req, ct);
            resp.EnsureSuccessStatusCode();
            var raw = await resp.Content.ReadAsStringAsync(ct);
            var parsed = JsonSerializer.Deserialize<AicuPhyResponse>(raw, _json);
            var list = parsed?.Data ?? new List<AicuPhyItem>();
            foreach (var it in list)
            {
                it.Hhisnum = Trim(it.Hhisnum); it.Hnamec = Trim(it.Hnamec);
                it.Ward = Trim(it.Ward); it.Hbed = Trim(it.Hbed); it.Restraint = Trim(it.Restraint);
            }
            return list;
        }
        catch (Exception ex) { _logger.LogWarning(ex, "AICUPHY 取得失敗，約束以空續行"); return new(); }
    }

    /// <summary>Board_Examine（院方檢查）全院清單；同主機同 x-api-key。失敗回空清單（白板不中斷）。</summary>
    public async Task<List<BoardExamineItem>> GetExamineAsync(CancellationToken ct = default)
    {
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, "api/v1/Board_Examine") { Content = JsonContent.Create(new { }) };
            if (!string.IsNullOrWhiteSpace(_options.ApiKey))
                req.Headers.TryAddWithoutValidation("x-api-key", _options.ApiKey);
            var resp = await _http.SendAsync(req, ct);
            resp.EnsureSuccessStatusCode();
            var raw = await resp.Content.ReadAsStringAsync(ct);
            var parsed = JsonSerializer.Deserialize<BoardExamineResponse>(raw, _json);
            var list = parsed?.Data ?? new List<BoardExamineItem>();
            foreach (var it in list)
            {
                it.Hhisnum = Trim(it.Hhisnum); it.Hnamec = Trim(it.Hnamec); it.Category = Trim(it.Category);
                it.Ward = Trim(it.Ward); it.Hbed = Trim(it.Hbed); it.AdmitDate = Trim(it.AdmitDate);
                it.Status = Trim(it.Status); it.ExamName = Trim(it.ExamName);
            }
            return list;
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Board_Examine 取得失敗，檢查以空續行"); return new(); }
    }

    /// <summary>Board_AICUUD（院方 AICU 用藥/抗生素）清單；同主機同 x-api-key。失敗回空清單（白板不中斷）。</summary>
    public async Task<List<BoardAicuUdItem>> GetAicuUdAsync(CancellationToken ct = default)
    {
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, "api/v1/Board_AICUUD") { Content = JsonContent.Create(new { }) };
            if (!string.IsNullOrWhiteSpace(_options.ApiKey))
                req.Headers.TryAddWithoutValidation("x-api-key", _options.ApiKey);
            var resp = await _http.SendAsync(req, ct);
            resp.EnsureSuccessStatusCode();
            var raw = await resp.Content.ReadAsStringAsync(ct);
            var parsed = JsonSerializer.Deserialize<BoardAicuUdResponse>(raw, _json);
            var list = parsed?.Data ?? new List<BoardAicuUdItem>();
            foreach (var it in list)
            {
                it.Hhisnum = Trim(it.Hhisnum); it.Hnamec = Trim(it.Hnamec); it.Drug = Trim(it.Drug);
                it.StartDate = Trim(it.StartDate); it.StartTime = Trim(it.StartTime);
                it.EndDate = Trim(it.EndDate); it.EndTime = Trim(it.EndTime);
            }
            return list;
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Board_AICUUD 取得失敗，抗生素以空續行"); return new(); }
    }

    /// <summary>Board_HCA（院方策盟註記，≠0＝轉入）清單；同主機同 x-api-key。失敗回空清單（白板不中斷）。</summary>
    public async Task<List<BoardHcaItem>> GetHcaAsync(CancellationToken ct = default)
    {
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, "api/v1/Board_HCA") { Content = JsonContent.Create(new { }) };
            if (!string.IsNullOrWhiteSpace(_options.ApiKey))
                req.Headers.TryAddWithoutValidation("x-api-key", _options.ApiKey);
            var resp = await _http.SendAsync(req, ct);
            resp.EnsureSuccessStatusCode();
            var raw = await resp.Content.ReadAsStringAsync(ct);
            var parsed = JsonSerializer.Deserialize<BoardHcaResponse>(raw, _json);
            var list = parsed?.Data ?? new List<BoardHcaItem>();
            foreach (var it in list)
            {
                it.Hhisnum = Trim(it.Hhisnum); it.Hnamec = Trim(it.Hnamec);
                it.Ward = Trim(it.Ward); it.Hbed = Trim(it.Hbed); it.HcaMark = Trim(it.HcaMark);
            }
            return list;
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Board_HCA 取得失敗，轉入以 overlay 續行"); return new(); }
    }

    /// <summary>Board_Note（院方臨床註記：洗腎／禁治療／禁食）全院清單；同主機同 x-api-key。失敗回空清單（白板不中斷）。</summary>
    public async Task<List<BoardNoteItem>> GetNoteAsync(CancellationToken ct = default)
    {
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, "api/v1/Board_Note") { Content = JsonContent.Create(new { }) };
            if (!string.IsNullOrWhiteSpace(_options.ApiKey))
                req.Headers.TryAddWithoutValidation("x-api-key", _options.ApiKey);
            var resp = await _http.SendAsync(req, ct);
            resp.EnsureSuccessStatusCode();
            var raw = await resp.Content.ReadAsStringAsync(ct);
            var parsed = JsonSerializer.Deserialize<BoardNoteResponse>(raw, _json);
            var list = parsed?.Data ?? new List<BoardNoteItem>();
            foreach (var it in list)
            {
                it.Hhisnum = Trim(it.Hhisnum); it.Hnamec = Trim(it.Hnamec); it.Ward = Trim(it.Ward); it.Hbed = Trim(it.Hbed);
                it.Dialysis = Trim(it.Dialysis); it.NoTreat = Trim(it.NoTreat); it.Npo = Trim(it.Npo);
            }
            return list;
        }
        catch (Exception ex) { _logger.LogWarning(ex, "Board_Note 取得失敗，洗腎／禁治療／禁食以後台續行"); return new(); }
    }

    /// <summary>OR_SYSTEM（院方手術流程時間軸：到達／進房／結束／離開＋去向 SEND_OPT）全院清單；同主機同 x-api-key。失敗回空清單（白板不中斷）。</summary>
    public async Task<List<OrSystemItem>> GetOrSystemAsync(CancellationToken ct = default)
    {
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, "api/v1/OR_SYSTEM") { Content = JsonContent.Create(new { }) };
            if (!string.IsNullOrWhiteSpace(_options.ApiKey))
                req.Headers.TryAddWithoutValidation("x-api-key", _options.ApiKey);
            var resp = await _http.SendAsync(req, ct);
            resp.EnsureSuccessStatusCode();
            var raw = await resp.Content.ReadAsStringAsync(ct);
            var parsed = JsonSerializer.Deserialize<OrSystemResponse>(raw, _json);
            var list = parsed?.Data ?? new List<OrSystemItem>();
            foreach (var it in list)
            {
                it.Room = Trim(it.Room); it.Hhisnum = Trim(it.Hhisnum); it.Hnamec = Trim(it.Hnamec);
                it.ComTime = Trim(it.ComTime); it.EntTime = Trim(it.EntTime); it.CutTime = Trim(it.CutTime);
                it.ResTime = Trim(it.ResTime); it.SendOpt = Trim(it.SendOpt);
            }
            return list;
        }
        catch (Exception ex) { _logger.LogWarning(ex, "OR_SYSTEM 取得失敗，OR 狀態以排程續行"); return new(); }
    }

    /// <summary>去除前後半形與全形空白。</summary>
    private static string? Trim(string? s)
        => string.IsNullOrEmpty(s) ? s : s.Trim().Trim('　');
}
