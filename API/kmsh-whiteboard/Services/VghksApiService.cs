using System.Text;
using System.Text.Json;
using kmsh_whiteboard.Models.Common;
using kmsh_whiteboard.Models.Lab;
using kmsh_whiteboard.Models.NonExSchList;
using kmsh_whiteboard.Models.Patient;
using kmsh_whiteboard.Models.Ward;
using kmsh_whiteboard.Settings;
using Microsoft.Extensions.Options;

namespace kmsh_whiteboard.Services;

/// <summary>
/// 高榮（VGHKS）HIS API 代理實作：透過具名 HttpClient（BaseAddress 由 DI 設定）以 POST JSON 呼叫院方端點。
/// 認證／識別參數（KeyId、hid、apid）由 VghksApiOptions 設定並於每次請求自動帶入。
/// JSON 反序列化採大小寫不敏感，並對清單型回應的多種陣列包裝 key 做容錯解析。
/// </summary>
public class VghksApiService : IVghksApiService
{
    // JSON 反序列化選項：屬性名稱大小寫不敏感，以容忍院方回應欄位大小寫差異
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly HttpClient _http;
    private readonly VghksApiOptions _options;
    private readonly ILogger<VghksApiService> _logger;

    /// <summary>建構子：注入具名 HttpClient、VghksApiOptions（認證參數與 MAAS 主機設定）與 Logger。</summary>
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
    /// <summary>
    /// 呼叫高榮 AMDRService amdr/ord/qrynonexschlist（POST JSON）查詢未執行檢查及會診清單；
    /// 自動帶入 KeyId/hid/apid，回傳以 "resultList" 為陣列 key 解析後的清單回應。
    /// </summary>
    public async Task<VghksApiResponse<NonExSchListItem>> GetNonExSchListAsync(
        string hhisnum, string? hcasetyp = null, CancellationToken ct = default)
    {
        var body = new { KeyId = _options.KeyId, hid = _options.Hid, apid = _options.Apid, hhisnum, hcasetyp };
        var rawJson = await PostRawAsync("AMDRService/amdr/ord/qrynonexschlist", body, ct);
        return ParseListResponse<NonExSchListItem>(rawJson, "resultList");
    }

    // ── 急診/住院病房清單 ──────────────────────────────────────────
    /// <summary>
    /// 呼叫高榮 AMDRService amdr/bed/getHnurstaList（POST JSON）取得病房清單；hcsetyp 預設 "E"（急診）。
    /// 自動帶入 KeyId/hid/apid，回傳以 "resultList" 為陣列 key 解析後的清單回應。
    /// </summary>
    public async Task<VghksApiResponse<HnurstaItem>> GetHnurstaListAsync(
        string hcsetyp = "E", CancellationToken ct = default)
    {
        var body = new { KeyId = _options.KeyId, hid = _options.Hid, hcsetyp, apid = _options.Apid };
        var rawJson = await PostRawAsync("AMDRService/amdr/bed/getHnurstaList", body, ct);
        return ParseListResponse<HnurstaItem>(rawJson, "resultList");
    }

    // ── 病房病人床位清單 ───────────────────────────────────────────
    /// <summary>
    /// 呼叫高榮 AMDRService amdr/bed/getBedList（POST JSON）取得指定病房（hnursta）的病人床位清單；hcasetyp 預設 "E"。
    /// 自動帶入 KeyId/hid/apid，回傳以 "hbedList" 為陣列 key 解析後的清單回應。
    /// </summary>
    public async Task<VghksApiResponse<BedListItem>> GetBedListAsync(
        string hnursta, string hcasetyp = "E", CancellationToken ct = default)
    {
        var body = new { KeyId = _options.KeyId, hid = _options.Hid, hcasetyp, hnursta, apid = _options.Apid };
        var rawJson = await PostRawAsync("AMDRService/amdr/bed/getBedList", body, ct);
        return ParseListResponse<BedListItem>(rawJson, "hbedList");
    }

    // ── 急診病人詳細 ───────────────────────────────────────────────
    /// <summary>
    /// 呼叫高榮 AMDRService amdr/patient/getERPat（POST JSON）取得急診病人詳細資料；
    /// 以 hhisnum、hcaseno 指定病人，hnursta/hbedno 可選填，自動帶入 KeyId/hid/apid。
    /// </summary>
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
    /// <summary>
    /// 呼叫高榮 AMDRService amdr/patient/getAMPat（POST JSON）取得住院病人詳細資料；
    /// 以 hhisnum、hcaseno 指定病人並固定帶 dataType="1"，自動帶入 KeyId/hid/apid。
    /// </summary>
    public async Task<AmdrCaseResponse> GetAMPatAsync(
        string hhisnum, string hcaseno, CancellationToken ct = default)
    {
        var body = new { KeyId = _options.KeyId, hid = _options.Hid, apid = _options.Apid, hhisnum, hcaseno, dataType = "1" };
        var rawJson = await PostRawAsync("AMDRService/amdr/patient/getAMPat", body, ct);
        return ParseAmdrCaseResponse(rawJson);
    }

    // ── #5-5 過敏紀錄（UDSPService）─────────────────────────────
    /// <summary>
    /// 呼叫高榮 UDSPService ud/udsp/udhcpatsJSON（POST JSON）取得指定病歷號（hhisnum）的過敏紀錄；
    /// 帶入 hhisnum 與 hid，並嘗試多個可能的陣列 key（resultList／udhcpats／data）做容錯解析。
    /// </summary>
    public async Task<VghksApiResponse<AllergyItem>> GetAllergyAsync(
        string hhisnum, CancellationToken ct = default)
    {
        var body = new { hhisnum, hid = _options.Hid };
        var rawJson = await PostRawAsync("UDSPService/ud/udsp/udhcpatsJSON", body, ct);
        // 嘗試多個可能的陣列 key
        return ParseListResponseMultiKey<AllergyItem>(rawJson, "resultList", "udhcpats", "data");
    }

    // ── #8-2 病患基本資訊（MAASService，不同主機）─────────────────
    /// <summary>
    /// 呼叫高榮 MAASService maas/patient/getPatientInfo（POST JSON）取得病患基本資訊；以 hhisnum 或 hidno 查詢。
    /// 若 Options 設有 MaasBaseUrl（MAAS 位於不同主機）則改用絕對 URL 呼叫，否則沿用預設 BaseAddress；
    /// 回傳為空時以 Success="N" 的預設物件代替。
    /// </summary>
    public async Task<MaasPatientResponse> GetPatientInfoAsync(
        string? hhisnum = null, string? hidno = null, CancellationToken ct = default)
    {
        var body = new { hhisnum, hidno, apid = _options.Apid, hid = _options.Hid };

        string rawJson;
        if (!string.IsNullOrWhiteSpace(_options.MaasBaseUrl))
        {
            var maasUrl = _options.MaasBaseUrl.TrimEnd('/') + "/MAASService/maas/patient/getPatientInfo";
            rawJson = await PostRawAbsoluteAsync(maasUrl, body, ct);
        }
        else
        {
            rawJson = await PostRawAsync("MAASService/maas/patient/getPatientInfo", body, ct);
        }

        return JsonSerializer.Deserialize<MaasPatientResponse>(rawJson, _jsonOptions)
               ?? new MaasPatientResponse { Success = "N", Msg = "回傳資料為空" };
    }

    // ── #9 依標籤檢核急作（LABService）────────────────────────────
    /// <summary>
    /// 呼叫高榮 LABService lab/ord/islaburgent（POST JSON）依檢驗標籤號（stickrno）檢核是否為急作；
    /// 帶入 hid 與 function（= apid），回傳為空時以 Success="N" 的預設物件代替。
    /// </summary>
    public async Task<LabUrgentResponse> IsLabUrgentAsync(
        string stickrno, CancellationToken ct = default)
    {
        var body = new { hid = _options.Hid, function = _options.Apid, stickrno };
        var rawJson = await PostRawAsync("LABService/lab/ord/islaburgent", body, ct);
        return JsonSerializer.Deserialize<LabUrgentResponse>(rawJson, _jsonOptions)
               ?? new LabUrgentResponse { Success = "N", Msg = "回傳資料為空" };
    }

    // ── 私有輔助方法 ───────────────────────────────────────────────

    /// <summary>以 POST JSON 呼叫相對路徑（path，相對於 HttpClient.BaseAddress），確認 HTTP 成功後回傳原始 JSON 字串。</summary>
    private async Task<string> PostRawAsync(string path, object body, CancellationToken ct)
    {
        _logger.LogInformation("呼叫 {Path}", path);
        var response = await _http.PostAsJsonAsync(path, body, ct);
        response.EnsureSuccessStatusCode();
        var rawJson = await response.Content.ReadAsStringAsync(ct);
        _logger.LogDebug("{Path} 回應: {Json}", path, rawJson);
        return rawJson;
    }

    /// <summary>以 POST JSON 呼叫絕對 URL（用於 MAAS 等不同主機），手動序列化並設定 UTF-8 application/json，確認成功後回傳原始 JSON 字串。</summary>
    private async Task<string> PostRawAbsoluteAsync(string absoluteUrl, object body, CancellationToken ct)
    {
        _logger.LogInformation("呼叫（絕對 URL）{Url}", absoluteUrl);
        var json = JsonSerializer.Serialize(body);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri(absoluteUrl)) { Content = content };
        var response = await _http.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();
        var rawJson = await response.Content.ReadAsStringAsync(ct);
        _logger.LogDebug("{Url} 回應: {Json}", absoluteUrl, rawJson);
        return rawJson;
    }

    /// <summary>
    /// 解析清單型回應：自根節點取 success/msg，並由指定的 listKey 取出清單；
    /// listKey 值為陣列直接反序列化，為（內含 JSON 的）字串則先取字串再反序列化。
    /// </summary>
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

    /// <summary>
    /// 與 ParseListResponse 相同，但依序嘗試多個可能的陣列 key（keys），取到第一個有效清單即停止；
    /// 用於回應包裝 key 不固定的端點（如過敏紀錄）。
    /// </summary>
    private VghksApiResponse<T> ParseListResponseMultiKey<T>(string rawJson, params string[] keys)
    {
        using var doc = JsonDocument.Parse(rawJson);
        var root = doc.RootElement;

        var result = new VghksApiResponse<T>
        {
            Success = root.TryGetProperty("success", out var s) ? s.GetString() : null,
            Msg = root.TryGetProperty("msg", out var m) ? m.GetString() : null,
        };

        foreach (var key in keys)
        {
            if (!root.TryGetProperty(key, out var list)) continue;

            if (list.ValueKind == JsonValueKind.Array)
            {
                result.ResultList = JsonSerializer.Deserialize<List<T>>(list.GetRawText(), _jsonOptions);
                break;
            }
            if (list.ValueKind == JsonValueKind.String)
            {
                var inner = list.GetString();
                if (!string.IsNullOrWhiteSpace(inner))
                {
                    result.ResultList = JsonSerializer.Deserialize<List<T>>(inner, _jsonOptions);
                    break;
                }
            }
        }

        return result;
    }

    /// <summary>將病人詳細回應 JSON 反序列化為 AmdrCaseResponse；為空時回傳 Success="N" 的預設物件。</summary>
    private AmdrCaseResponse ParseAmdrCaseResponse(string rawJson)
    {
        return JsonSerializer.Deserialize<AmdrCaseResponse>(rawJson, _jsonOptions)
               ?? new AmdrCaseResponse { Success = "N", Msg = "回傳資料為空" };
    }
}
