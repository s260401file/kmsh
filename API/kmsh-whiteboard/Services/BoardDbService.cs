using System.Text.Json;
using kmsh_whiteboard.Models.Board;

namespace kmsh_whiteboard.Services;

/// <summary>
/// IBoardApiService 的「本地快照」實作：改讀 [dbo].[Sync_Snapshot]（WhiteboardSync 定時落地的 JSON），
/// 還原成與原院方 HTTP 版完全相同的 item 型別，供 BoardController 消費（介面不變、Controller 免改）。
/// 目的：顯示端不再即時依賴院方 Board_* API；院方短暫不通時仍以最後一次快照顯示。
/// JSON 欄名＝各 SQL 原輸出欄（HHISNUM…）；此處把欄名對映回 DTO 屬性。值皆字串（同院方 API）。
/// </summary>
public sealed class BoardDbService : IBoardApiService
{
    private readonly SyncSnapshotStore _store;
    public BoardDbService(SyncSnapshotStore store) => _store = store;

    // 讀某 endpoint 快照 → 逐列 map。表無資料/空 → 空清單（看板不中斷）。
    private async Task<List<T>> ReadAsync<T>(string endpoint, Func<JsonElement, T> map, CancellationToken ct)
    {
        var snap = await _store.GetAsync(endpoint, ct);
        if (string.IsNullOrWhiteSpace(snap.Payload)) return new List<T>();
        using var doc = JsonDocument.Parse(snap.Payload);
        if (doc.RootElement.ValueKind != JsonValueKind.Array) return new List<T>();
        var list = new List<T>(doc.RootElement.GetArrayLength());
        foreach (var el in doc.RootElement.EnumerateArray()) list.Add(map(el));
        return list;
    }

    // JSON 欄取字串（值皆為字串或 null）
    private static string? S(JsonElement el, string col)
        => el.TryGetProperty(col, out var p) && p.ValueKind == JsonValueKind.String ? p.GetString() : null;

    // ── Board_bed（全院在床；GetBedListAsync 以 ward 過濾 HNURSTA）──
    public async Task<List<BoardBedItem>> GetBedListAsync(string ward, CancellationToken ct = default)
    {
        var all = await ReadAsync("Board_bed", el => new BoardBedItem
        {
            Hhisnum = S(el, "HHISNUM"), Hnamec = S(el, "HNAMEC"), Hidno = S(el, "HIDNO"),
            Hbirthdt = S(el, "HBIRTHDT"), Hsex = S(el, "HSEX"), Doctor = S(el, "HDOCNAMC"),
            AdmitDate = S(el, "HADATE"), Department = S(el, "HCURSVCL"), Diagnosis = S(el, "HDIAGTXT"),
            Movement = S(el, "HPATSTAT"), Hnursta = S(el, "HNURSTA"), Hbed = S(el, "HBED")
        }, ct);
        if (string.IsNullOrWhiteSpace(ward)) return all;
        return all.Where(x => string.Equals((x.Hnursta ?? "").Trim(), ward.Trim(), StringComparison.OrdinalIgnoreCase)).ToList();
    }

    // ── Board_ER ──
    public Task<List<BoardErItem>> GetErListAsync(CancellationToken ct = default)
        => ReadAsync("Board_ER", el => new BoardErItem
        {
            Hhisnum = S(el, "HHISNUM"), Hnamec = S(el, "HNAMEC"), Hidno = S(el, "HIDNO"),
            Hbirthdt = S(el, "HBIRTHDT"), Hsex = S(el, "HSEX"), Doctor = S(el, "HDOCNAMC"),
            Ward = S(el, "HNURSTA"), Flow = S(el, "HPATSTAT"), Triage = S(el, "HEMGTYPE"),
            Category = S(el, "HCASETYP"), Diagnosis = S(el, "HDIAGTXT"), Department = S(el, "HCURSVCL"),
            Hbed = S(el, "HBED"), ArrivalRaw = S(el, "HADATE")
        }, ct);

    // ── Board_ER_TypeE（死亡類別）──
    public Task<List<BoardErTypeEItem>> GetErTypeEListAsync(CancellationToken ct = default)
        => ReadAsync("Board_ER_TypeE", el => new BoardErTypeEItem
        {
            Hhisnum = S(el, "HHISNUM"), OutDate = S(el, "HDISDATE"), OutTime = S(el, "HDISTIME"),
            Ward = S(el, "HNURSTA"), Bed = S(el, "HBED")
        }, ct);

    public async Task<int> GetErTypeECountAsync(CancellationToken ct = default)
        => (await GetErTypeEListAsync(ct)).Count;

    // ── Board_OR ──
    public Task<List<BoardOrItem>> GetOrListAsync(CancellationToken ct = default)
        => ReadAsync("Board_OR", el => new BoardOrItem
        {
            Room = S(el, "OROPROOM"), Hhisnum = S(el, "ORHISNUM"), Hnamec = S(el, "HNAMEC"),
            Hsex = S(el, "HSEX"), Hbirthdt = S(el, "HBIRTHDT"), Surgery = S(el, "OROPNM1"),
            Doctor = S(el, "ORDOCNM"), Department = S(el, "ORCATGY"), Anes = S(el, "OROPAMED"),
            Source = S(el, "ORCASETP"), OpDate = S(el, "ORBGNDT"), OpTime = S(el, "ORBGNTM"),
            Diagnosis = S(el, "ORDIAG")
        }, ct);

    // ── AICUPHY（約束）──
    public Task<List<AicuPhyItem>> GetAicuRestraintAsync(CancellationToken ct = default)
        => ReadAsync("AICUPHY", el => new AicuPhyItem
        {
            Hhisnum = S(el, "HHISNUM"), Hnamec = S(el, "HNAMEC"), Restraint = S(el, "PHYSICALRESTRAINT")
        }, ct);

    // ── Board_Examine（僅 W52/AICU/CICU）──
    public Task<List<BoardExamineItem>> GetExamineAsync(CancellationToken ct = default)
        => ReadAsync("Board_Examine", el => new BoardExamineItem
        {
            Hhisnum = S(el, "HHISNUM"), Hnamec = S(el, "HNAMEC"), Category = S(el, "HCASETYP"),
            Ward = S(el, "HNURSTA"), Hbed = S(el, "HBED"), Status = S(el, "ORSTATUS"),
            ExamName = S(el, "ORPROCED"), ExamDate = S(el, "ORRCPDT"), ExamTime = S(el, "ORRCPTM")
        }, ct);

    // ── Board_AICUUD（抗生素/用藥）──
    public Task<List<BoardAicuUdItem>> GetAicuUdAsync(CancellationToken ct = default)
        => ReadAsync("Board_AICUUD", el => new BoardAicuUdItem
        {
            Hhisnum = S(el, "HHISNUM"), Hnamec = S(el, "HNAMEC"), Drug = S(el, "UDRPNAME"),
            StartDate = S(el, "UDBGNDT"), StartTime = S(el, "UDBGNTM"),
            EndDate = S(el, "UDENDDT"), EndTime = S(el, "UDENDTM")
        }, ct);

    // ── Board_HCA（策盟）──
    public Task<List<BoardHcaItem>> GetHcaAsync(CancellationToken ct = default)
        => ReadAsync("Board_HCA", el => new BoardHcaItem
        {
            Hhisnum = S(el, "HHISNUM"), Hnamec = S(el, "HNAMEC"), Ward = S(el, "HNURSTA"),
            Hbed = S(el, "HBED"), HcaMark = S(el, "INAMEC")
        }, ct);

    // ── Board_Note（洗腎/禁治療/禁食）──
    public Task<List<BoardNoteItem>> GetNoteAsync(CancellationToken ct = default)
        => ReadAsync("Board_Note", el => new BoardNoteItem
        {
            Hhisnum = S(el, "HHISNUM"), Hnamec = S(el, "HNAMEC"), Ward = S(el, "HNURSTA"),
            Hbed = S(el, "HBED"), Dialysis = S(el, "HD"), NoTreat = S(el, "禁治療"), Npo = S(el, "禁食")
        }, ct);

    // ── OR_SYSTEM（手術流程時間戳）──
    public Task<List<OrSystemItem>> GetOrSystemAsync(CancellationToken ct = default)
        => ReadAsync("OR_SYSTEM", el => new OrSystemItem
        {
            Room = S(el, "OP_ROOM"), Hhisnum = S(el, "ORHISNUM"), Hnamec = S(el, "HNAMEC"),
            ComTime = S(el, "COM_TIME"), EntTime = S(el, "ENT_TIME"), CutTime = S(el, "CUT_TIME"),
            ResTime = S(el, "RES_TIME"), SendOpt = S(el, "SEND_OPT")
        }, ct);
}
