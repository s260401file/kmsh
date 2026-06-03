using System.Text.Json;
using kmsh_whiteboard.Models.Common;
using kmsh_whiteboard.Models.NonExSchList;
using kmsh_whiteboard.Models.Patient;
using kmsh_whiteboard.Models.Ward;
using kmsh_whiteboard.Settings;
using Microsoft.Extensions.Options;

namespace kmsh_whiteboard.Services;

public class VghksApiService : IVghksApiService
{
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly HttpClient _http;
    private readonly VghksApiOptions _options;
    private readonly ILogger<VghksApiService> _logger;

    public VghksApiService(
        HttpClient http,
        IOptions<VghksApiOptions> options,
        ILogger<VghksApiService> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;
    }

    // ── 未執行檢查及會診清單 ───────────────────────────────────────
    public async Task<VghksApiResponse<NonExSchListItem>> GetNonExSchListAsync(
        string hhisnum, string? hcasetyp = null, CancellationToken ct = default)
    {
        var body = new { KeyId = _options.KeyId, hid = _options.Hid, apid = _options.Apid, hhisnum, hcasetyp };
        var rawJson = await PostRawAsync("AMDRService/amdr/ord/qrynonexschlist", body, ct);
        return ParseListResponse<NonExSchListItem>(rawJson, "resultList");
    }

    // ── 急診/住院病房清單 ──────────────────────────────────────────
    public async Task<VghksApiResponse<HnurstaItem>> GetHnurstaListAsync(
        string hcsetyp = "E", CancellationToken ct = default)
    {
        var body = new { KeyId = _options.KeyId, hid = _options.Hid, hcsetyp, apid = _options.Apid };
        var rawJson = await PostRawAsync("AMDRService/amdr/bed/getHnurstaList", body, ct);
        return ParseListResponse<HnurstaItem>(rawJson, "resultList");
    }

    // ── 病房病人床位清單 ───────────────────────────────────────────
    public async Task<VghksApiResponse<BedListItem>> GetBedListAsync(
        string hnursta, string hcasetyp = "E", CancellationToken ct = default)
    {
        var body = new { KeyId = _options.KeyId, hid = _options.Hid, hcasetyp, hnursta, apid = _options.Apid };
        var rawJson = await PostRawAsync("AMDRService/amdr/bed/getBedList", body, ct);
        // 文件顯示此 API 的清單 key 為 hbedList
        return ParseListResponse<BedListItem>(rawJson, "hbedList");
    }

    // ── 急診病人詳細 ───────────────────────────────────────────────
    public async Task<AmdrCaseResponse> GetERPatAsync(
        string hhisnum, string hcaseno,
        string? hnursta = null, string? hbedno = null,
        CancellationToken ct = default)
    {
        var body = new { KeyId = _options.KeyId, hid = _options.Hid, apid = _options.Apid, hhisnum, hcaseno, hnursta, hbedno };
        var rawJson = await PostRawAsync("AMDRService/amdr/patient/getERPat", body, ct);
        return ParseAmdrCaseResponse(rawJson);
    }

    // ── 住院病人詳細 ───────────────────────────────────────────────
    public async Task<AmdrCaseResponse> GetAMPatAsync(
        string hhisnum, string hcaseno, CancellationToken ct = default)
    {
        var body = new { KeyId = _options.KeyId, hid = _options.Hid, apid = _options.Apid, hhisnum, hcaseno, dataType = "1" };
        var rawJson = await PostRawAsync("AMDRService/amdr/patient/getAMPat", body, ct);
        return ParseAmdrCaseResponse(rawJson);
    }

    // ── 私有輔助方法 ───────────────────────────────────────────────

    private async Task<string> PostRawAsync(string path, object body, CancellationToken ct)
    {
        _logger.LogInformation("呼叫 {Path}", path);
        var response = await _http.PostAsJsonAsync(path, body, ct);
        response.EnsureSuccessStatusCode();
        var rawJson = await response.Content.ReadAsStringAsync(ct);
        _logger.LogDebug("{Path} 回應: {Json}", path, rawJson);
        return rawJson;
    }

    // 通用清單解析：處理 resultList/hbedList 可能是 JSON 字串或陣列的情況
    private VghksApiResponse<T> ParseListResponse<T>(string rawJson, string listKey)
    {
        using var doc = JsonDocument.Parse(rawJson);
        var root = doc.RootElement;

        var result = new VghksApiResponse<T>
        {
            Success = root.TryGetProperty("success", out var s) ? s.GetString() : null,
            Msg = root.TryGetProperty("msg", out var m) ? m.GetString() : null,
        };

        if (!root.TryGetProperty(listKey, out var list))
            return result;

        if (list.ValueKind == JsonValueKind.Array)
            result.ResultList = JsonSerializer.Deserialize<List<T>>(list.GetRawText(), _jsonOptions);
        else if (list.ValueKind == JsonValueKind.String)
        {
            var inner = list.GetString();
            if (!string.IsNullOrWhiteSpace(inner))
                result.ResultList = JsonSerializer.Deserialize<List<T>>(inner, _jsonOptions);
        }

        return result;
    }

    private AmdrCaseResponse ParseAmdrCaseResponse(string rawJson)
    {
        return JsonSerializer.Deserialize<AmdrCaseResponse>(rawJson, _jsonOptions)
               ?? new AmdrCaseResponse { Success = "N", Msg = "回傳資料為空" };
    }
}
