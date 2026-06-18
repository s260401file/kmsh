using System.Text.Json;
using System.Xml.Linq;
using kmsh_whiteboard.Models.Hr;
using kmsh_whiteboard.Models.Maintenance;
using kmsh_whiteboard.Models.Patient;
using kmsh_whiteboard.Models.Staff;
using kmsh_whiteboard.Settings;
using Microsoft.Extensions.Options;

namespace kmsh_whiteboard.Services;

/// <summary>
/// 高醫（KMUH）HIS API 代理實作：透過具名 HttpClient（BaseAddress 由 DI 設定）呼叫院方端點。
/// JSON 反序列化採大小寫不敏感（PropertyNameCaseInsensitive）。多數端點為 POST JSON 並回傳清單，
/// api/CNC 為 GET 且回應為 XML。
/// </summary>
public class KmuhApiService : IKmuhApiService
{
    // JSON 反序列化選項：屬性名稱大小寫不敏感，以容忍院方回應欄位大小寫差異
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly HttpClient _http;
    private readonly ILogger<KmuhApiService> _logger;

    /// <summary>建構子：注入具名 HttpClient 與 Logger；KmuhApiOptions 僅供 DI 設定 BaseAddress，此處不直接使用。</summary>
    public KmuhApiService(HttpClient http, IOptions<KmuhApiOptions> _, ILogger<KmuhApiService> logger)
    {
        _http = http;
        _logger = logger;
    }

    /// <summary>呼叫高醫 api/HRS（POST JSON，帶 UNITCODE）查詢在職人事資料，回傳人事清單。</summary>
    public async Task<List<HrsItem>> GetHrsAsync(string unitcode, CancellationToken ct = default)
    {
        var rawJson = await PostRawAsync("api/HRS", new { UNITCODE = unitcode }, ct);
        return ParseList<HrsItem>(rawJson);
    }

    /// <summary>呼叫高醫 api/UAS（POST JSON，帶 UNITCODE、MONTH）查詢該單位該月排班作業，回傳排班清單。</summary>
    public async Task<List<UasItem>> GetUasAsync(string unitcode, string month, CancellationToken ct = default)
    {
        var rawJson = await PostRawAsync("api/UAS", new { UNITCODE = unitcode, MONTH = month }, ct);
        return ParseList<UasItem>(rawJson);
    }

    /// <summary>呼叫高醫 api/ERS（POST JSON，帶 UNITCODE）查詢該單位維修單，回傳維修單清單。</summary>
    public async Task<List<ErsItem>> GetErsAsync(string unitcode, CancellationToken ct = default)
    {
        var rawJson = await PostRawAsync("api/ERS", new { UNITCODE = unitcode }, ct);
        return ParseList<ErsItem>(rawJson);
    }

    /// <summary>呼叫高醫 api/TMS（POST JSON，無參數）查詢近一年在職＋離職人員清單，回傳人員清單。</summary>
    public async Task<List<TmsItem>> GetTmsAsync(CancellationToken ct = default)
    {
        var rawJson = await PostRawAsync("api/TMS", new { }, ct);
        return ParseList<TmsItem>(rawJson);
    }

    /// <summary>呼叫高醫 api/UNIT（POST JSON，無參數）查詢所有單位資料，回傳單位清單。</summary>
    public async Task<List<UnitItem>> GetUnitAsync(CancellationToken ct = default)
    {
        var rawJson = await PostRawAsync("api/UNIT", new { }, ct);
        return ParseList<UnitItem>(rawJson);
    }

    // ── #8-1 KMUH 查床號（GET + XML 回應）────────────────────────
    /// <summary>
    /// 呼叫高醫 api/CNC（GET，回應為 XML），依病歷號 chartNo 查詢床號與病患基本資料。
    /// 將回應 XML 解析為 CncResult；回應為空字串或 XML 解析失敗時回傳 null（解析失敗會記錄警告）。
    /// </summary>
    public async Task<CncResult?> GetCncAsync(string chartNo, CancellationToken ct = default)
    {
        var path = $"api/CNC?ChartNO={Uri.EscapeDataString(chartNo)}";
        _logger.LogInformation("呼叫 kmuh {Path}", path);
        var response = await _http.GetAsync(path, ct);
        response.EnsureSuccessStatusCode();
        var xmlText = await response.Content.ReadAsStringAsync(ct);
        _logger.LogDebug("kmuh CNC 回應: {Xml}", xmlText);

        if (string.IsNullOrWhiteSpace(xmlText)) return null;

        try
        {
            var doc = XDocument.Parse(xmlText);
            var root = doc.Root;
            if (root is null) return null;

            return new CncResult
            {
                BedNo       = root.Element("Bed_No")?.Value,
                BirthDate   = root.Element("Birth_Date")?.Value,
                ChartNo     = root.Element("Chart_No")?.Value,
                Idno        = root.Element("Idno")?.Value,
                PatientName = root.Element("Patient_Name")?.Value,
                SexId       = root.Element("Sex_Id")?.Value,
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "CNC XML 解析失敗");
            return null;
        }
    }

    // ── 私有輔助方法 ───────────────────────────────────────────────

    /// <summary>以 POST JSON 呼叫指定相對路徑（path），確認 HTTP 成功後回傳原始 JSON 字串；過程寫入 Info/Debug 記錄。</summary>
    private async Task<string> PostRawAsync(string path, object body, CancellationToken ct)
    {
        _logger.LogInformation("呼叫 kmuh {Path}", path);
        var response = await _http.PostAsJsonAsync(path, body, ct);
        response.EnsureSuccessStatusCode();
        var rawJson = await response.Content.ReadAsStringAsync(ct);
        _logger.LogDebug("kmuh {Path} 回應: {Json}", path, rawJson);
        return rawJson;
    }

    /// <summary>
    /// 將院方回應 JSON 解析為 List&lt;T&gt;：根節點若為陣列直接反序列化；
    /// 若為物件則取其第一個為陣列的屬性反序列化；皆無則回傳空清單。
    /// </summary>
    private List<T> ParseList<T>(string rawJson)
    {
        using var doc = JsonDocument.Parse(rawJson);
        var root = doc.RootElement;

        if (root.ValueKind == JsonValueKind.Array)
            return JsonSerializer.Deserialize<List<T>>(rawJson, _jsonOptions) ?? [];

        foreach (var prop in root.EnumerateObject())
        {
            if (prop.Value.ValueKind == JsonValueKind.Array)
                return JsonSerializer.Deserialize<List<T>>(prop.Value.GetRawText(), _jsonOptions) ?? [];
        }

        return [];
    }
}
