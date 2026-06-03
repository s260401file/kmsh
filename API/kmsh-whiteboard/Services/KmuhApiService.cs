using System.Text.Json;
using kmsh_whiteboard.Models.Hr;
using kmsh_whiteboard.Models.Maintenance;
using kmsh_whiteboard.Models.Staff;
using kmsh_whiteboard.Settings;
using Microsoft.Extensions.Options;

namespace kmsh_whiteboard.Services;

public class KmuhApiService : IKmuhApiService
{
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly HttpClient _http;
    private readonly ILogger<KmuhApiService> _logger;

    public KmuhApiService(HttpClient http, IOptions<KmuhApiOptions> _, ILogger<KmuhApiService> logger)
    {
        _http = http;
        _logger = logger;
    }

    public async Task<List<HrsItem>> GetHrsAsync(string unitcode, CancellationToken ct = default)
    {
        var rawJson = await PostRawAsync("api/HRS", new { UNITCODE = unitcode }, ct);
        return ParseList<HrsItem>(rawJson);
    }

    public async Task<List<UasItem>> GetUasAsync(string unitcode, string month, CancellationToken ct = default)
    {
        var rawJson = await PostRawAsync("api/UAS", new { UNITCODE = unitcode, MONTH = month }, ct);
        return ParseList<UasItem>(rawJson);
    }

    public async Task<List<ErsItem>> GetErsAsync(string unitcode, CancellationToken ct = default)
    {
        var rawJson = await PostRawAsync("api/ERS", new { UNITCODE = unitcode }, ct);
        return ParseList<ErsItem>(rawJson);
    }

    public async Task<List<TmsItem>> GetTmsAsync(CancellationToken ct = default)
    {
        var rawJson = await PostRawAsync("api/TMS", new { }, ct);
        return ParseList<TmsItem>(rawJson);
    }

    public async Task<List<UnitItem>> GetUnitAsync(CancellationToken ct = default)
    {
        var rawJson = await PostRawAsync("api/UNIT", new { }, ct);
        return ParseList<UnitItem>(rawJson);
    }

    // ── 私有輔助方法 ───────────────────────────────────────────────

    private async Task<string> PostRawAsync(string path, object body, CancellationToken ct)
    {
        _logger.LogInformation("呼叫 kmuh {Path}", path);
        var response = await _http.PostAsJsonAsync(path, body, ct);
        response.EnsureSuccessStatusCode();
        var rawJson = await response.Content.ReadAsStringAsync(ct);
        _logger.LogDebug("kmuh {Path} 回應: {Json}", path, rawJson);
        return rawJson;
    }

    // 處理回傳值可能是直接陣列或包在物件裡的情況
    private List<T> ParseList<T>(string rawJson)
    {
        using var doc = JsonDocument.Parse(rawJson);
        var root = doc.RootElement;

        if (root.ValueKind == JsonValueKind.Array)
            return JsonSerializer.Deserialize<List<T>>(rawJson, _jsonOptions) ?? [];

        // 若為物件，嘗試找第一個陣列屬性
        foreach (var prop in root.EnumerateObject())
        {
            if (prop.Value.ValueKind == JsonValueKind.Array)
                return JsonSerializer.Deserialize<List<T>>(prop.Value.GetRawText(), _jsonOptions) ?? [];
        }

        return [];
    }
}
