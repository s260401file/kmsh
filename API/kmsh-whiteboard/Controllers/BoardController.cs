using System.Globalization;
using kmsh_whiteboard.Models.Board;
using kmsh_whiteboard.Models.Db;
using kmsh_whiteboard.Repositories;
using kmsh_whiteboard.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace kmsh_whiteboard.Controllers;

/// <summary>
/// 病室動態看板：聚合「院方 Board_bed（在床＋基本，真實資料）」與「自建臨床補充層 WardPatientExt」，
/// 依病歷號合併輸出貼合前端 WardTab 的 JSON；另提供補充層的後台 CRUD。
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class BoardController : ControllerBase
{
    private readonly IBoardApiService _board;
    private readonly IWardRepository _ward;
    private readonly IPersonnelRepository _staff;
    private readonly ILdapAuthenticator _ldap;
    private readonly ILdapAdminService _ldapAdmin;
    private readonly IJwtTokenService _jwt;
    private readonly IOrReportRepository _orReport;
    private readonly IMasterDataRepository _master;
    private readonly IOnCallRepository _oncall;
    private readonly IMemoryCache _cache;
    private readonly ILogger<BoardController> _logger;

    public BoardController(IBoardApiService board, IWardRepository ward, IPersonnelRepository staff, ILdapAuthenticator ldap, ILdapAdminService ldapAdmin, IJwtTokenService jwt, IOrReportRepository orReport, IMasterDataRepository master, IOnCallRepository oncall, IMemoryCache cache, ILogger<BoardController> logger)
    {
        _board = board;
        _ward = ward;
        _staff = staff;
        _ldap = ldap;
        _ldapAdmin = ldapAdmin;
        _jwt = jwt;
        _orReport = orReport;
        _master = master;
        _oncall = oncall;
        _cache = cache;
        _logger = logger;
    }

    /// <summary>
    /// 短 TTL 快取院方清單，並具「逾時/空值容錯」：TTL 內直接回快取；逾時後重抓，
    /// 抓到「非空」才更新快取＋重置新鮮期，抓到「空」（院方逾時/失敗）則沿用上次成功值（不清空、不閃 0）。
    /// </summary>
    private async Task<List<T>> FreshOrStaleAsync<T>(string key, int ttlSeconds, Func<Task<List<T>>> fetch)
    {
        _cache.TryGetValue<List<T>>(key, out var stale);
        if (_cache.TryGetValue(key + ":fresh", out _) && stale is not null) return stale;  // 仍新鮮
        List<T> got;
        try { got = await fetch() ?? new(); } catch { got = new(); }
        if (got.Count > 0)
        {
            _cache.Set(key, got);                                                    // 無限期備援（下次成功即覆蓋）
            _cache.Set(key + ":fresh", true, TimeSpan.FromSeconds(ttlSeconds));      // 新鮮期
            return got;
        }
        return stale ?? got;                                                          // 抓到空→沿用上次成功值
    }

    // W52 病房 41 床版面（床位碼，對應前端 CSS 固定位置；床號 BedId = W52-<碼>）
    private static readonly string[] W52_BEDS =
    {
        "001","002","003","005","006","007","008","009","010","011","012","013","015","016","017",
        "018","019","020","021","022","023","025","026","027","028","029","030","031","032","033",
        "035","036","037","038","039","050","051","052","053","055","056"
    };

    // ICU 床位版面：4F(AICU) 20 床、3F(CICU) 5 床（床號 num，bedId = F{floor}-{num:00}）
    private static readonly int[] ICU_4F = { 1,2,3,5,6,7,8,9,10,11,12,13,15,16,17,18,19,20,21,22 };
    private static readonly int[] ICU_3F = { 1,2,3,4,5 };

    /// <summary>W52 病室動態：Board_bed（真實在床）＋ WardPatientExt（自建臨床）合併，回 41 床看板 JSON。</summary>
    [HttpGet("w52")]
    public async Task<IActionResult> GetW52(CancellationToken ct = default)
    {
        // 院方在床清單（真實資料）；失敗時以空清單續行（白板顯示全空床、不中斷）
        List<BoardBedItem> occ;
        try { occ = await _board.GetBedListAsync("W52", ct); }
        catch (Exception ex) { _logger.LogWarning(ex, "Board_bed W52 取得失敗，以空清單續行"); occ = new(); }

        // 自建臨床補充層（僅啟用），以病歷號索引
        var extList = (await _ward.GetExtAsync("W52", includeAll: false, ct)).ToList();
        var extByHis = extList
            .Where(e => !string.IsNullOrWhiteSpace(e.Hhisnum))
            .GroupBy(e => e.Hhisnum!.Trim())
            .ToDictionary(g => g.Key, g => g.First());

        var resp = new WardBoardResponse
        {
            HospitalInfo = new WardHospitalInfo
            {
                HospitalName = "高雄市立民生醫院",
                WardName = "W52病房", WardCode = "W52",
                WardDirector = "吳○明", HeadNurse = "林○芳"
            },
            Version = extList.Count > 0
                ? new DateTimeOffset(extList.Max(e => e.UpdatedAt), TimeSpan.Zero).ToUnixTimeSeconds()
                : 0
        };

        // 責任護理師：改由「我的病床」勾床（依床號）決定（今日，主護）。W52 一床可多位 → 逗號並列。
        // key 統一去除可能的 "W52-" 前綴（存的多為裸碼 001），與下方以裸 code 查詢一致。
        static string BareBed(string? b) => (b ?? "").Trim().Replace("W52-", "", StringComparison.OrdinalIgnoreCase);
        var w52today = DateTime.Today.ToString("yyyy-MM-dd");
        var nurseByBed = (await _staff.GetBedAssignAsync("W52", w52today, "主護", false, ct))
            .Where(b => !string.IsNullOrWhiteSpace(b.BedId))
            .GroupBy(b => BareBed(b.BedId))
            .ToDictionary(g => g.Key, g => string.Join("，", g.Select(x => x.Name).Where(n => !string.IsNullOrWhiteSpace(n))), StringComparer.OrdinalIgnoreCase);

        // 手術/檢查/會診：改由「實際來源」以病歷號判定（對應 w52/surgery、w52/exam），不再用臨床補充旗標。
        var inBedHis = occ.Where(o => !string.IsNullOrWhiteSpace(o.Hhisnum))
            .Select(o => o.Hhisnum!.Trim()).ToHashSet(StringComparer.OrdinalIgnoreCase);
        // 檢查：院方 Board_Examine（Ward=W52 且在床）→ 病歷號集合（與 /exam 看板同源、共用 45 秒快取）
        var w52ExamList = await FreshOrStaleAsync("exam:board:examine", 45, () => _board.GetExamineAsync(ct));
        var examHis = w52ExamList
            .Where(x => string.Equals((x.Ward ?? "").Trim(), "W52", StringComparison.OrdinalIgnoreCase)
                     && !string.IsNullOrWhiteSpace(x.Hhisnum) && inBedHis.Contains(x.Hhisnum!.Trim()))
            .Select(x => x.Hhisnum!.Trim()).ToHashSet(StringComparer.OrdinalIgnoreCase);
        // 手術：本地 OrSurgery（今日，在床病歷號）→ 病歷號集合
        var surgeryHis = (await _ward.GetOrSurgeryListAsync(DateTime.Today, DateTime.Today, ct))
            .Where(r => !string.IsNullOrWhiteSpace(r.ChartNo) && inBedHis.Contains(r.ChartNo!.Trim()))
            .Select(r => r.ChartNo!.Trim()).ToHashSet(StringComparer.OrdinalIgnoreCase);
        // 會診：自建 WardExamConsult（Kind=會診, 24h）→ 病歷號＋床號(去 W52- 前綴)兩鍵，取穩健
        var w52ConsultCut = DateTime.Now.AddHours(-24);
        var w52ConsultRows = (await _ward.GetExamConsultAsync("W52", false, ct))
            .Where(r => r.Kind == "會診" && r.UpdatedAt > w52ConsultCut).ToList();
        var consultHis = w52ConsultRows.Where(r => !string.IsNullOrWhiteSpace(r.Hhisnum))
            .Select(r => r.Hhisnum!.Trim()).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var consultBeds = w52ConsultRows.Where(r => !string.IsNullOrWhiteSpace(r.BedId))
            .Select(r => BareBed(r.BedId)).ToHashSet(StringComparer.OrdinalIgnoreCase);

        // 院方 Board_Note：洗腎／禁治療／禁食（院方為主、後台為輔）。全院一次抓、45 秒快取、非空才更新。
        var noteByHis = (await FreshOrStaleAsync("note:board", 45, () => _board.GetNoteAsync(ct)))
            .Where(n => !string.IsNullOrWhiteSpace(n.Hhisnum))
            .GroupBy(n => n.Hhisnum!.Trim())
            .ToDictionary(g => g.Key, g => g.First());
        static bool NoteOn(string? s) => !string.IsNullOrWhiteSpace(s) && s!.Trim() != "N";
        // 院方有此病人 → 以院方為準（N／空即 false）；院方查無 → 後台臨床補充為輔。
        (bool renal, bool noTreat, bool npo) MergeNote(string? hhis, WardPatientExtItem? ext)
        {
            var his = hhis?.Trim();
            if (!string.IsNullOrEmpty(his) && noteByHis.TryGetValue(his, out var n))
                return (NoteOn(n.Dialysis), NoteOn(n.NoTreat), NoteOn(n.Npo));
            return (ext?.Renal ?? false, ext?.NoTreatment ?? false, ext?.Npo ?? false);
        }

        foreach (var code in W52_BEDS)
        {
            var bedId = $"W52-{code}";
            var o = occ.FirstOrDefault(x => string.Equals(x.Hbed, code, StringComparison.OrdinalIgnoreCase));
            if (o is null)
            {
                resp.Beds.Add(new WardBedDto { BedId = bedId, Status = "empty", Patient = null });
                continue;
            }

            WardPatientExtItem? e = null;
            if (!string.IsNullOrWhiteSpace(o.Hhisnum)) extByHis.TryGetValue(o.Hhisnum!.Trim(), out e);
            var nf = MergeNote(o.Hhisnum, e);   // 洗腎／禁治療／禁食：院方 Board_Note 為主、後台為輔

            resp.Beds.Add(new WardBedDto
            {
                BedId = bedId,
                Status = string.IsNullOrWhiteSpace(e?.BedStatus) ? "occupied" : e!.BedStatus!,
                Patient = new WardPatientDto
                {
                    // 基本（Board_bed 真實資料）
                    PatientName = MaskName(o.Hnamec),   // 公開看板：病人姓名去識別化
                    Gender = o.Hsex,
                    BirthDate = FormatBirth(o.Hbirthdt),
                    Age = CalcAge(o.Hbirthdt),
                    MedicalRecordNo = o.Hhisnum,
                    IdNo = o.Hidno,                       // 身分證（白板需顯示）
                    // 臨床（自建補充層；無資料則預設）
                    Department = string.IsNullOrWhiteSpace(o.Department) ? e?.Department : o.Department,  // 院方科別優先
                    AdmissionDate = FormatBirth(o.AdmitDate) ?? e?.AdmissionDate,   // 院方轉入日期（yyyy/MM/dd）優先
                    Diagnosis = string.IsNullOrWhiteSpace(o.Diagnosis) ? e?.Diagnosis : o.Diagnosis,  // 院方診斷優先
                    AttendingDoctor = string.IsNullOrWhiteSpace(o.Doctor) ? e?.AttendingDoctor : o.Doctor,  // 院方負責醫師優先
                    PrimaryNurse = nurseByBed.TryGetValue(code, out var rn) && !string.IsNullOrWhiteSpace(rn) ? rn : null,  // 責任護理師＝我的病床勾床（裸碼對應，可多位逗號並列）
                    Movement = o.Movement,   // 院方動態
                    Condition = e?.Condition,
                    Isolation = e?.Isolation,
                    Dnr = e?.Dnr ?? false,
                    FallRisk = e?.FallRisk ?? false,
                    Dependency = e?.Dependency,
                    Confidential = e?.Confidential ?? false,
                    NoTreatment = nf.noTreat,   // 禁治療：Board_Note 為主
                    Npo = nf.npo,               // 禁食：Board_Note 為主
                    Allergy = e?.Allergy ?? false,
                    Rrt = e?.Rrt ?? false,
                    Chemo = e?.Chemo ?? false,
                    Transport = e?.Transport,
                    Oxygen = e?.Oxygen ?? false,
                    Renal = nf.renal,           // 洗腎：Board_Note 為主
                    PortCath = e?.PortCath ?? false,
                    DLVC = e?.DLVC ?? false,
                    Foley = e?.Foley ?? false,
                    CVC = e?.CVC ?? false,
                    CardiacCath = e?.CardiacCath ?? false,
                    // 手術/檢查/會診：改由實際來源(病歷號)判定，取代原臨床補充旗標
                    Surgery = !string.IsNullOrWhiteSpace(o.Hhisnum) && surgeryHis.Contains(o.Hhisnum!.Trim()),
                    Exam = !string.IsNullOrWhiteSpace(o.Hhisnum) && examHis.Contains(o.Hhisnum!.Trim()),
                    Consult = (!string.IsNullOrWhiteSpace(o.Hhisnum) && consultHis.Contains(o.Hhisnum!.Trim())) || consultBeds.Contains(code),
                    Notes = e?.Notes
                }
            });
        }

        return Ok(resp);
    }

    /// <summary>ICU 病室動態：AICU(4F)＋CICU(3F) Board_bed ＋ WardPatientExt(ICU) 合併，回 camelCase 看板 JSON。</summary>
    [HttpGet("icu")]
    public async Task<IActionResult> GetIcu(CancellationToken ct = default)
    {
        var occ4 = await SafeBoardAsync("AICU", ct);   // 4F
        var occ3 = await SafeBoardAsync("CICU", ct);   // 3F（目前多為 0 筆）

        var extList = (await _ward.GetExtAsync("ICU", includeAll: false, ct)).ToList();
        var extByHis = extList
            .Where(e => !string.IsNullOrWhiteSpace(e.Hhisnum))
            .GroupBy(e => e.Hhisnum!.Trim())
            .ToDictionary(g => g.Key, g => g.First());

        // 身體約束：院方 AICUPHY 即時 API（目前僅回 AICU/4F）。以病歷號比對，Y=需約束。失敗回空 → 全 false，不影響看板。
        var restraintByHis = (await _board.GetAicuRestraintAsync(ct))
            .Where(x => !string.IsNullOrWhiteSpace(x.Hhisnum))
            .GroupBy(x => x.Hhisnum!.Trim())
            .ToDictionary(g => g.Key, g => string.Equals(g.First().Restraint, "Y", StringComparison.OrdinalIgnoreCase));

        // 責任護理師：由「勾床配對」（依床號，今日，AssignType=主護）決定；班別再對應當日「三班護理師排程」。
        var today = DateTime.Today.ToString("yyyy-MM-dd");
        var assigns = (await _staff.GetBedAssignAsync("ICU", today, "主護", false, ct))
            .Where(b => !string.IsNullOrWhiteSpace(b.BedId) && !string.IsNullOrWhiteSpace(b.Name))
            .ToList();
        // 護理師 → 班別（大夜/白班/小夜）：依當日三班排程，以 StaffId 對應（同員多班取第一筆）。
        var shiftByStaff = (await _staff.GetScheduleAsync("ICU", today, false, ct))
            .GroupBy(s => s.StaffId)
            .ToDictionary(g => g.Key, g => g.First().Shift);
        // 每床：責任護理師清單（含班別），保留勾床 SortOrder 順序。
        var nursesByBed = assigns
            .GroupBy(b => b.BedId!, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.Select(x => new IcuNurseDto {
                Name = x.Name!.Trim(),
                Shift = shiftByStaff.TryGetValue(x.StaffId, out var sh) ? sh : null
            }).ToList(), StringComparer.OrdinalIgnoreCase);
        // 逗號並列（fallback：舊消費端）。
        var nurseByBed = nursesByBed.ToDictionary(kv => kv.Key,
            kv => string.Join("，", kv.Value.Select(n => n.Name)), StringComparer.OrdinalIgnoreCase);

        // 手術/檢查/會診：改由「實際來源」以病歷號判定（對應 icu/surgery、icu/exam），不再用臨床補充旗標。
        var icuInBedHis = occ4.Concat(occ3).Where(o => !string.IsNullOrWhiteSpace(o.Hhisnum))
            .Select(o => o.Hhisnum!.Trim()).ToHashSet(StringComparer.OrdinalIgnoreCase);
        // 檢查：院方 Board_Examine（Ward=AICU/CICU 且在床）→ 病歷號集合（與 /exam 看板同源、共用 45 秒快取）
        var icuExamList = await FreshOrStaleAsync("exam:board:examine", 45, () => _board.GetExamineAsync(ct));
        var icuExamHis = icuExamList
            .Where(x => (string.Equals((x.Ward ?? "").Trim(), "AICU", StringComparison.OrdinalIgnoreCase)
                     || string.Equals((x.Ward ?? "").Trim(), "CICU", StringComparison.OrdinalIgnoreCase))
                     && !string.IsNullOrWhiteSpace(x.Hhisnum) && icuInBedHis.Contains(x.Hhisnum!.Trim()))
            .Select(x => x.Hhisnum!.Trim()).ToHashSet(StringComparer.OrdinalIgnoreCase);
        // 手術：本地 OrSurgery（今日，在床病歷號）→ 病歷號集合
        var icuSurgeryHis = (await _ward.GetOrSurgeryListAsync(DateTime.Today, DateTime.Today, ct))
            .Where(r => !string.IsNullOrWhiteSpace(r.ChartNo) && icuInBedHis.Contains(r.ChartNo!.Trim()))
            .Select(r => r.ChartNo!.Trim()).ToHashSet(StringComparer.OrdinalIgnoreCase);
        // 會診：自建 WardExamConsult（Kind=會診, 24h）→ 病歷號＋床號(F4-01)兩鍵，取穩健
        var consultCutoff = DateTime.Now.AddHours(-24);
        var icuConsultRows = (await _ward.GetExamConsultAsync("ICU", false, ct))
            .Where(r => r.Kind == "會診" && r.UpdatedAt > consultCutoff).ToList();
        var icuConsultHis = icuConsultRows.Where(r => !string.IsNullOrWhiteSpace(r.Hhisnum))
            .Select(r => r.Hhisnum!.Trim()).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var consultBeds = icuConsultRows.Where(r => !string.IsNullOrWhiteSpace(r.BedId))
            .Select(r => r.BedId!.Trim())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var resp = new IcuBoardResponse
        {
            HospitalInfo = new IcuHospitalInfo { Name = "高雄市立民生醫院", Ward = "ICU", WardDirector = "王○明", HeadNurse = "陳○美" },
            Version = extList.Count > 0
                ? new DateTimeOffset(extList.Max(e => e.UpdatedAt), TimeSpan.Zero).ToUnixTimeSeconds()
                : 0
        };

        // 院方 Board_Note：洗腎／禁治療／禁食（院方為主、後台為輔）。與 W52 共用 45 秒快取鍵 "note:board"。
        var noteByHis = (await FreshOrStaleAsync("note:board", 45, () => _board.GetNoteAsync(ct)))
            .Where(n => !string.IsNullOrWhiteSpace(n.Hhisnum))
            .GroupBy(n => n.Hhisnum!.Trim())
            .ToDictionary(g => g.Key, g => g.First());
        static bool NoteOn(string? s) => !string.IsNullOrWhiteSpace(s) && s!.Trim() != "N";
        // 院方有此病人 → 以院方為準（N／空即 false）；院方查無 → 後台為輔。ICU 洗腎徽章讀 Crrt。
        (bool renal, bool noTreat, bool npo) MergeNote(string? hhis, WardPatientExtItem? ext)
        {
            var his = hhis?.Trim();
            if (!string.IsNullOrEmpty(his) && noteByHis.TryGetValue(his, out var n))
                return (NoteOn(n.Dialysis), NoteOn(n.NoTreat), NoteOn(n.Npo));
            return (ext?.Crrt ?? false, ext?.NoTreatment ?? false, ext?.Npo ?? false);
        }

        void AddFloor(int floor, int[] nums, List<BoardBedItem> occ)
        {
            foreach (var num in nums)
            {
                var code = num.ToString("000");
                var o = occ.FirstOrDefault(x => string.Equals(x.Hbed, code, StringComparison.OrdinalIgnoreCase));
                var bed = new IcuBedDto { Id = $"F{floor}-{num:00}", Floor = floor, Num = num, Status = "empty", Patient = null };
                if (o is not null)
                {
                    WardPatientExtItem? e = null;
                    if (!string.IsNullOrWhiteSpace(o.Hhisnum)) extByHis.TryGetValue(o.Hhisnum!.Trim(), out e);
                    var nf = MergeNote(o.Hhisnum, e);   // 洗腎／禁治療／禁食：院方 Board_Note 為主、後台為輔
                    bed.Status = string.IsNullOrWhiteSpace(e?.BedStatus) ? "occupied" : e!.BedStatus!;
                    bed.Patient = new IcuPatientDto
                    {
                        Name = MaskName(o.Hnamec), Gender = o.Hsex, BirthDate = FormatBirth(o.Hbirthdt), Age = CalcAge(o.Hbirthdt),
                        MedRecord = o.Hhisnum, IdNo = o.Hidno,
                        Department = string.IsNullOrWhiteSpace(o.Department) ? e?.Department : o.Department, Admission = FormatBirth(o.AdmitDate) ?? e?.AdmissionDate,
                        Diagnosis = string.IsNullOrWhiteSpace(o.Diagnosis) ? e?.Diagnosis : o.Diagnosis,  // 院方診斷優先
                        Doctor = string.IsNullOrWhiteSpace(o.Doctor) ? e?.AttendingDoctor : o.Doctor,
                        Nurse = nurseByBed.TryGetValue(bed.Id, out var rn) && !string.IsNullOrWhiteSpace(rn) ? rn : null,  // 責任護理師＝勾床配對（可多位逗號並列；fallback）
                        Nurses = nursesByBed.TryGetValue(bed.Id, out var nl) ? nl : null,  // 含班別（依三班排程）
                        Movement = o.Movement,   // 院方動態
                        Condition = string.IsNullOrWhiteSpace(e?.Condition) ? "危急" : e!.Condition,  // ICU 病況預設 A級（危急）；無後台設定即 A
                        Isolation = e?.Isolation,
                        Dnr = e?.Dnr ?? false, Ventilator = e?.Ventilator ?? false, Crrt = nf.renal,   // Crrt＝洗腎徽章：Board_Note 為主
                        Ng = e?.Ng ?? false, Foley = e?.Foley ?? false, Cvc = e?.CVC ?? false,
                        Restraint = !string.IsNullOrWhiteSpace(o.Hhisnum) && restraintByHis.TryGetValue(o.Hhisnum!.Trim(), out var rst) && rst,  // 約束：AICUPHY（4F）

                        FallRisk = e?.FallRisk ?? false, Dependency = e?.Dependency, Confidential = e?.Confidential ?? false,
                        NoTreatment = nf.noTreat, Npo = nf.npo, Allergy = e?.Allergy ?? false,   // 禁治療／禁食：Board_Note 為主
                        Rrt = e?.Rrt ?? false, Chemo = e?.Chemo ?? false, Transport = e?.Transport, Oxygen = e?.Oxygen ?? false,
                        // 手術/檢查/會診：改由實際來源(病歷號)判定，取代原臨床補充旗標
                        Surgery = !string.IsNullOrWhiteSpace(o.Hhisnum) && icuSurgeryHis.Contains(o.Hhisnum!.Trim()),
                        Exam = !string.IsNullOrWhiteSpace(o.Hhisnum) && icuExamHis.Contains(o.Hhisnum!.Trim()),
                        Consult = (!string.IsNullOrWhiteSpace(o.Hhisnum) && icuConsultHis.Contains(o.Hhisnum!.Trim())) || consultBeds.Contains(bed.Id),
                        Notes = e?.Notes
                    };
                }
                resp.Beds.Add(bed);
            }
        }

        AddFloor(4, ICU_4F, occ4);
        AddFloor(3, ICU_3F, occ3);
        return Ok(resp);
    }

    /// <summary>目前在床對照（病歷號→床號）：供後台「臨床補充清單」標示哪幾筆目前在床 / 已離床。</summary>
    [HttpGet("{unitCode}/occupancy")]
    public async Task<IActionResult> GetOccupancy(string unitCode, CancellationToken ct = default)
    {
        var result = new List<object>();
        var u = unitCode.ToUpperInvariant();
        if (u == "W52")
        {
            foreach (var o in await SafeBoardAsync("W52", ct))
                if (!string.IsNullOrWhiteSpace(o.Hhisnum))
                    result.Add(new { hhisnum = o.Hhisnum!.Trim(), bed = $"W52-{o.Hbed}" });
        }
        else if (u == "ICU")
        {
            foreach (var o in await SafeBoardAsync("AICU", ct))
                if (!string.IsNullOrWhiteSpace(o.Hhisnum) && int.TryParse(o.Hbed, out var n))
                    result.Add(new { hhisnum = o.Hhisnum!.Trim(), bed = $"F4-{n:00}" });
            foreach (var o in await SafeBoardAsync("CICU", ct))
                if (!string.IsNullOrWhiteSpace(o.Hhisnum) && int.TryParse(o.Hbed, out var n))
                    result.Add(new { hhisnum = o.Hhisnum!.Trim(), bed = $"F3-{n:00}" });
        }
        else if (u == "ER")
        {
            // 急診在室：病歷號 → 對應白板床號（病房＋床位映射）
            List<BoardErItem> occ;
            try { occ = await _board.GetErListAsync(ct); }
            catch (Exception ex) { _logger.LogWarning(ex, "Board_ER occupancy 取得失敗"); occ = new(); }
            foreach (var o in occ)
                if (!string.IsNullOrWhiteSpace(o.Hhisnum))
                    result.Add(new { hhisnum = o.Hhisnum!.Trim(), bed = MapErBedId(o.Ward, o.Hbed) });
        }
        else if (u == "OR")
        {
            // 今日刀表：病歷號 → 刀房（Board_OR 刀房代碼 R{n} 經主檔對應為 OR-xx）
            List<BoardOrItem> occ;
            try { occ = await _board.GetOrListAsync(ct); }
            catch (Exception ex) { _logger.LogWarning(ex, "Board_OR occupancy 取得失敗"); occ = new(); }
            var roomMap = (await _ward.GetOrRoomsAsync("OR", includeAll: false, ct))
                .Where(r => !string.IsNullOrWhiteSpace(r.ApiRoom))
                .GroupBy(r => r.ApiRoom!.Trim(), StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.First().RoomId, StringComparer.OrdinalIgnoreCase);
            var today = DateTime.Today;
            foreach (var o in occ)
            {
                if (string.IsNullOrWhiteSpace(o.Hhisnum) || string.IsNullOrWhiteSpace(o.Room)) continue;
                if (ParseBirth(o.OpDate) is not { } d || d.Date != today) continue;   // 僅今日刀表
                var room = roomMap.TryGetValue(o.Room!.Trim(), out var rid) ? rid : o.Room!.Trim();
                result.Add(new { hhisnum = o.Hhisnum!.Trim(), bed = room });
            }
        }
        return Ok(result);
    }

    /// <summary>
    /// 後台「病人臨床補充」用：某站**當前在床病人**（真實姓名，不遮罩；僅登入者可取）。
    /// 供以「在床病人」為對象逐一設定補充，離床者不列。目前實作 ICU（AICU 4F＋CICU 3F）。
    /// </summary>
    [HttpGet("{unitCode}/roster")]
    [Authorize]
    public async Task<IActionResult> GetRoster(string unitCode, CancellationToken ct = default)
    {
        var u = unitCode.ToUpperInvariant();
        // 病床類（Board_bed）：ICU（AICU 4F＋CICU 3F）、W52
        if (u == "ICU" || u == "W52")
        {
            var beds = new List<(string BedId, BoardBedItem O)>();
            if (u == "ICU")
            {
                foreach (var o in await SafeBoardAsync("AICU", ct))
                    if (!string.IsNullOrWhiteSpace(o.Hhisnum) && int.TryParse(o.Hbed, out var n)) beds.Add(($"F4-{n:00}", o));
                foreach (var o in await SafeBoardAsync("CICU", ct))
                    if (!string.IsNullOrWhiteSpace(o.Hhisnum) && int.TryParse(o.Hbed, out var n)) beds.Add(($"F3-{n:00}", o));
            }
            else // W52
            {
                foreach (var o in await SafeBoardAsync("W52", ct))
                    if (!string.IsNullOrWhiteSpace(o.Hhisnum)) beds.Add(($"W52-{o.Hbed}", o));
            }
            var rows = beds.OrderBy(b => b.BedId, StringComparer.Ordinal).Select(b => new
            {
                bedId = b.BedId, hhisnum = b.O.Hhisnum!.Trim(), patientName = b.O.Hnamec,   // 真實姓名（後台，不遮）
                gender = b.O.Hsex, birthDate = FormatBirth(b.O.Hbirthdt), age = CalcAge(b.O.Hbirthdt),
                department = b.O.Department, diagnosis = b.O.Diagnosis, doctor = b.O.Doctor,
            });
            return Ok(rows);
        }
        // 急診（Board_ER）：以病房＋床位映射白板床碼
        if (u == "ER")
        {
            List<BoardErItem> occ;
            try { occ = await _board.GetErListAsync(ct); }
            catch (Exception ex) { _logger.LogWarning(ex, "Board_ER roster 取得失敗"); occ = new(); }
            var rows = occ.Where(o => !string.IsNullOrWhiteSpace(o.Hhisnum))
                .Select(o => new
                {
                    bedId = MapErBedId(o.Ward, o.Hbed), hhisnum = o.Hhisnum!.Trim(), patientName = o.Hnamec,
                    gender = o.Hsex, birthDate = FormatBirth(o.Hbirthdt), age = CalcAge(o.Hbirthdt),
                    department = o.Department, diagnosis = o.Diagnosis, doctor = o.Doctor,
                })
                .OrderBy(r => r.bedId, StringComparer.Ordinal);
            return Ok(rows);
        }
        return BadRequest(new { message = $"roster 目前僅支援 ICU / W52 / ER（{unitCode} 待擴充）" });
    }

    /// <summary>
    /// ER 病室動態：自建床位主檔(ErBed)鋪平面圖 ＋ Board_ER 真實在室病人(以 bedId merge)
    /// ＋ WardPatientExt(ER) overlay 補臨床/狀態。空床顯示；床碼未建主檔的在室病人落 Unplaced（提示後台補建）。
    /// </summary>
    [HttpGet("er")]
    public async Task<IActionResult> GetEr(CancellationToken ct = default)
    {
        List<BoardErItem> occ;
        try { occ = await _board.GetErListAsync(ct); }
        catch (Exception ex) { _logger.LogWarning(ex, "Board_ER 取得失敗，以空清單續行"); occ = new(); }

        var beds = (await _ward.GetErBedsAsync("ER", includeAll: false, ct)).ToList();
        var extList = (await _ward.GetExtAsync("ER", includeAll: false, ct)).ToList();
        var extByHis = extList
            .Where(e => !string.IsNullOrWhiteSpace(e.Hhisnum))
            .GroupBy(e => e.Hhisnum!.Trim())
            .ToDictionary(g => g.Key, g => g.First());

        // 轉入：院方 Board_HCA 策盟註記 ≠ "0"（且非空）＝ 自該機構轉入，值即來源機構名。以病歷號對 ER 在室病人。
        var hcaByHis = (await _board.GetHcaAsync(ct))
            .Where(h => !string.IsNullOrWhiteSpace(h.Hhisnum))
            .GroupBy(h => h.Hhisnum!.Trim())
            .ToDictionary(g => g.Key,
                          g => g.Select(x => (x.HcaMark ?? "").Trim()).FirstOrDefault(m => m != "" && m != "0"));
        string? HcaOf(BoardErItem o) => (!string.IsNullOrWhiteSpace(o.Hhisnum) && hcaByHis.TryGetValue(o.Hhisnum!.Trim(), out var m)) ? m : null;

        // 責任護理師：改由「我的病床」勾床（依床號）決定（今日，主護）。ER 一床可多位 → 逗號並列。
        var erToday = DateTime.Today.ToString("yyyy-MM-dd");
        var nurseByBed = (await _staff.GetBedAssignAsync("ER", erToday, "主護", false, ct))
            .Where(x => !string.IsNullOrWhiteSpace(x.BedId))
            .GroupBy(x => x.BedId!)
            .ToDictionary(g => g.Key, g => string.Join("，", g.Select(x => x.Name).Where(n => !string.IsNullOrWhiteSpace(n))), StringComparer.OrdinalIgnoreCase);

        // 在室病人以「映射後白板床號」索引（同床取第一筆）
        var occByBed = occ
            .Select(o => (BedId: MapErBedId(o.Ward, o.Hbed), Item: o))
            .Where(x => !string.IsNullOrWhiteSpace(x.BedId))
            .GroupBy(x => x.BedId!, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First().Item, StringComparer.OrdinalIgnoreCase);

        WardPatientExtItem? ExtOf(BoardErItem o)
        {
            WardPatientExtItem? e = null;
            if (!string.IsNullOrWhiteSpace(o.Hhisnum)) extByHis.TryGetValue(o.Hhisnum!.Trim(), out e);
            return e;
        }

        var deceased = await _board.GetErTypeEListAsync(ct);   // 死亡類別(不佔床)清單（Board_ER_TypeE）
        var resp = new ErBoardResponse
        {
            Count = occ.Count,
            DeceasedCount = deceased.Count,   // 死亡(不佔床)筆數
            Deceased = deceased.Select(d => new ErDeceasedDto
            {
                MedRecord = d.Hhisnum?.Trim(), OutDate = d.OutDate?.Trim(), OutTime = d.OutTime?.Trim(),
                Ward = d.Ward?.Trim(), Bed = d.Bed?.Trim()
            }).ToList(),
            Version = extList.Count > 0
                ? new DateTimeOffset(extList.Max(e => e.UpdatedAt), TimeSpan.Zero).ToUnixTimeSeconds()
                : 0
        };

        // 1) 依床位主檔鋪床（含空床）
        foreach (var b in beds)
        {
            var bed = new ErBedDto
            {
                BedId = b.BedId, Ward = b.Ward, Zone = b.Zone,
                GridCol = b.GridCol, GridRow = b.GridRow, SortOrder = b.SortOrder
            };
            if (occByBed.TryGetValue(b.BedId, out var o))
            {
                var e = ExtOf(o);
                var hca = HcaOf(o);
                bed.Patient = BuildErPatient(o, e, hca);
                bed.Patient.Nurse = nurseByBed.TryGetValue(b.BedId, out var ern) && !string.IsNullOrWhiteSpace(ern) ? ern : null;  // 責任護理師＝我的病床勾床（可多位逗號並列）
                bed.Status = DeriveErStatus(o, e, hca);
            }
            resp.Beds.Add(bed);
        }

        // 2) 床碼不在主檔的在室病人 → Unplaced（前端落溢位區，提示後台補建該床）
        var placed = new HashSet<string>(beds.Select(b => b.BedId), StringComparer.OrdinalIgnoreCase);
        foreach (var kv in occByBed)
        {
            if (placed.Contains(kv.Key)) continue;
            var e = ExtOf(kv.Value);
            var hca = HcaOf(kv.Value);
            resp.Beds.Add(new ErBedDto
            {
                BedId = kv.Key, Ward = kv.Value.Ward?.Trim(), Zone = "未配置", Unplaced = true,
                SortOrder = 9000, Status = DeriveErStatus(kv.Value, e, hca), Patient = BuildErPatient(kv.Value, e, hca)
            });
        }

        return Ok(resp);
    }

    /// <summary>合併 Board_ER 真實病人 ＋ WardPatientExt overlay ＋ 院方策盟(轉入) → ER 病人卡 DTO。</summary>
    private static ErBedPatientDto BuildErPatient(BoardErItem o, WardPatientExtItem? e, string? hcaHospital) => new()
    {
        PatientName = MaskName(o.Hnamec), Gender = o.Hsex, BirthDate = FormatBirth(o.Hbirthdt), Age = CalcAge(o.Hbirthdt),
        MedRecord = o.Hhisnum, IdNo = o.Hidno, Doctor = o.Doctor, DoctorCard = o.DoctorCard,
        Flow = o.Flow, Category = o.Category,
        Triage = TriageLevel(o.Triage), TriageGrade = TriageToGrade(o.Triage),  // 正規化為 1/2/3 層級（前端據此 A/B/C 配色）
        TriageRaw = o.Triage?.Trim(),  // 院方原始檢傷分類（如 3），顯示於詳情

        Department = string.IsNullOrWhiteSpace(o.Department) ? e?.Department : o.Department, Nurse = e?.PrimaryNurse,  // 院方科別優先
        Diagnosis = string.IsNullOrWhiteSpace(o.Diagnosis) ? e?.Diagnosis : o.Diagnosis,  // 院方診斷優先
        Isolation = e?.Isolation, Notes = e?.Notes,
        // 到院時間＝院方「傳入日期」（優先），供前端計算留觀時間；院方未帶則用後台自填
        ArrivalDate = ErArrivalDate(o.ArrivalRaw) ?? e?.ArrivalDate, ArrivalTime = ErArrivalTime(o.ArrivalRaw) ?? e?.ArrivalTime,
        // 留觀/待床由院方「病患動向」Flow 推導：A=留觀、4=待床(一般)；加護/隔離代碼待院方確認(待辦)
        Observation = o.Flow == "A" || (e?.Observation ?? false),
        Awaiting = o.Flow == "4" || (e?.Awaiting ?? false),
        AwaitingType = o.Flow == "4" ? "一般" : e?.AwaitingType,
        // 轉入＝院方策盟註記(≠0，值為來源機構名) 優先，否則沿用後台 overlay；轉出仍由 overlay。
        TransferIn = !string.IsNullOrEmpty(hcaHospital) || (e?.TransferIn ?? false) || !string.IsNullOrWhiteSpace(e?.TransferInHospital),
        TransferOut = (e?.TransferOut ?? false) || !string.IsNullOrWhiteSpace(e?.TransferHospital) || o.Flow == "M",   // M=報轉榮院 → 轉出
        TransferHospital = e?.TransferHospital,
        TransferInHospital = !string.IsNullOrEmpty(hcaHospital) ? hcaHospital : e?.TransferInHospital,
        // 設定了住院床號時，視同已勾住院（讓看板旗標、篩選、急診統計一致對應）
        Admitted = (e?.Admitted ?? false) || !string.IsNullOrWhiteSpace(e?.AdmBedNo), AdmBedNo = e?.AdmBedNo,
        Dnr = e?.Dnr ?? false, Aad = e?.Aad ?? false, Mbd = e?.Mbd ?? false, Deceased = e?.Deceased ?? false,
        FallRisk = e?.FallRisk ?? false, Allergy = e?.Allergy ?? false, Exam = e?.Exam ?? false, Consult = e?.Consult ?? false
    };

    /// <summary>院方「傳入日期」(ISO) → 到院日 MM/dd；解析失敗回 null。</summary>
    private static string? ErArrivalDate(string? raw)
        => DateTime.TryParse(raw, out var d) ? d.ToString("MM/dd") : null;
    /// <summary>院方「傳入日期」(ISO) → 到院時間 HH:mm；解析失敗回 null。</summary>
    private static string? ErArrivalTime(string? raw)
        => DateTime.TryParse(raw, out var d) ? d.ToString("HH:mm") : null;

    /// <summary>推導床位狀態（隔離→轉床→待床→留觀→否則 occupied）；轉入含院方策盟、待床/留觀含院方 Flow(4/A)。空床由呼叫端設 empty。</summary>
    private static string DeriveErStatus(BoardErItem o, WardPatientExtItem? e, string? hcaHospital)
    {
        if (e is not null && !string.IsNullOrWhiteSpace(e.Isolation) && e.Isolation!.Trim() is not ("" or "無")) return "isolation";
        if (!string.IsNullOrEmpty(hcaHospital) || (e is not null && (e.TransferIn || e.TransferOut)) || o.Flow == "M") return "transfer";
        if (o.Flow == "4" || (e?.Awaiting ?? false)) return "awaiting";
        if (o.Flow == "A" || (e?.Observation ?? false)) return "observation";
        return "occupied";
    }

    /// <summary>
    /// OR 手術動態：自建刀房主檔(OrRoom)鋪 4×2 房卡 ＋ Board_OR 今日手術(以 ApiRoom merge)
    /// ＋ WardPatientExt(OR) overlay 補狀態/起訖/刷手流動。每房顯示今日「進行中/首台」＋今日台數。
    /// </summary>
    [HttpGet("or")]
    public async Task<IActionResult> GetOr(CancellationToken ct = default)
    {
        var today = DateTime.Today; var now = DateTime.Now;

        // 骨幹：今日 OPORDER（本地 OrSurgery），排除取消(82)。含未報到的刀。
        var rows = (await _ward.GetOrSurgeryListAsync(today, today, ct))
            .Where(x => x.StatusCode != "82")
            .ToList();

        // 狀態層：OR_SYSTEM（院方流程時間軸，即時＋20s 快取）；以到達時間日期過濾成今日，依病歷號分組、各組依到達時間排序成佇列供 zip。
        var sysToday = (await FreshOrStaleAsync("or:system", 20, () => _board.GetOrSystemAsync(ct)))
            .Where(s => ParseZh(s.ComTime)?.Date == today)
            .ToList();
        var sysByHis = sysToday
            .Where(s => !string.IsNullOrWhiteSpace(s.Hhisnum))
            .GroupBy(s => s.Hhisnum!.Trim())
            .ToDictionary(g => g.Key,
                          g => new Queue<OrSystemItem>(g.OrderBy(x => ParseZh(x.ComTime) ?? DateTime.MaxValue)),
                          StringComparer.OrdinalIgnoreCase);

        // 房間主檔 ＋ ApiRoom→RoomId ＋ 臨床補充 overlay ＋ 逐台刀覆蓋
        var rooms = (await _ward.GetOrRoomsAsync("OR", includeAll: false, ct)).ToList();
        var roomMap = rooms.Where(r => !string.IsNullOrWhiteSpace(r.ApiRoom))
            .GroupBy(r => r.ApiRoom!.Trim(), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First().RoomId, StringComparer.OrdinalIgnoreCase);
        var extList = (await _ward.GetExtAsync("OR", includeAll: false, ct)).ToList();
        var extByHis = extList
            .Where(e => !string.IsNullOrWhiteSpace(e.Hhisnum))
            .GroupBy(e => e.Hhisnum!.Trim())
            .ToDictionary(g => g.Key, g => g.First());
        WardPatientExtItem? ExtOf(string? his)
        {
            WardPatientExtItem? e = null;
            if (!string.IsNullOrWhiteSpace(his)) extByHis.TryGetValue(his!.Trim(), out e);
            return e;
        }
        var osn = (await _ward.GetOrSurgeryNurseAsync(today, today, ct))
            .GroupBy(x => OsnKey(x.OpDate, x.RoomId, x.ChartNo, x.OpTime))
            .ToDictionary(g => g.Key, g => g.First());

        // Board_OR 補充（生日/科別/診斷）：OPORDER 鏡像缺這三欄，OR_SYSTEM 也無 → 以院方 Board_OR 依病歷號補。
        // 僅作 enrichment（不影響狀態/排程）；失敗回空、不中斷。以病歷號索引。
        var boByHis = (await FreshOrStaleAsync("or:board", 20, async () =>
                { try { return await _board.GetOrListAsync(ct); } catch { return new List<BoardOrItem>(); } }))
            .Where(o => !string.IsNullOrWhiteSpace(o.Hhisnum))
            .GroupBy(o => o.Hhisnum!.Trim())
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);
        BoardOrItem? BoOf(string? his) => !string.IsNullOrWhiteSpace(his) && boByHis.TryGetValue(his!.Trim(), out var bo) ? bo : null;

        // 逐台刀：配對 OR_SYSTEM（同病歷號多台→ OPORDER 依 OpTime、OR_SYSTEM 依到達時間依序 zip；不以房號配對，因會臨時改房）。
        // 實際房優先（OR_SYSTEM 手術房→RoomId），未報到則用 OPORDER 排定房。
        var built = new List<(string roomId, OrSurgeryDto dto)>();
        foreach (var r in rows.OrderBy(x => (x.ChartNo ?? "").Trim()).ThenBy(x => x.OpTime))
        {
            var his = (r.ChartNo ?? "").Trim();
            OrSystemItem? m = null;
            if (sysByHis.TryGetValue(his, out var q) && q.Count > 0) m = q.Dequeue();
            var a = osn.TryGetValue(OsnKey(r.OpDate, r.RoomId, r.ChartNo, r.OpTime), out var an) ? an : null;
            var dto = BuildOrSurgeryFromOpOrder(r, m, ExtOf(his), a, BoOf(his));
            var roomId = r.RoomId ?? "";
            if (m is not null && !string.IsNullOrWhiteSpace(m.Room))
                roomId = roomMap.TryGetValue(m.Room.Trim(), out var rid) ? rid : (r.RoomId ?? m.Room.Trim());
            built.Add((roomId, dto));
        }

        // walk-in：OR_SYSTEM 有但今日 OPORDER 無此病歷號 → 記錄、不上看板（罕見）
        var backboneHis = rows.Select(x => (x.ChartNo ?? "").Trim())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        foreach (var kv in sysByHis)
            if (kv.Value.Count > 0 && !backboneHis.Contains(kv.Key))
                _logger.LogInformation("OR_SYSTEM 有但今日 OPORDER 無此病歷號，未上看板：{His}", kv.Key);

        var byRoom = built
            .GroupBy(x => x.roomId ?? "", StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.Select(x => x.dto).OrderBy(x => x.ScheduledTime).ToList(), StringComparer.OrdinalIgnoreCase);

        var resp = new OrBoardResponse
        {
            Count = built.Count,   // 當日總刀數（排除取消）
            Version = extList.Count > 0
                ? new DateTimeOffset(extList.Max(e => e.UpdatedAt), TimeSpan.Zero).ToUnixTimeSeconds()
                : 0
        };

        foreach (var r in rooms)
        {
            var dto = new OrRoomDto { RoomId = r.RoomId, ApiRoom = r.ApiRoom, SortOrder = r.SortOrder };
            if (byRoom.TryGetValue(r.RoomId, out var list) && list.Count > 0)
            {
                dto.Surgeries = list;   // 今日全部（含未到院排程）供右側「今日刀房清單」
                dto.TodayCount = list.Count;
                // 房卡以 OR_SYSTEM 為主，且「已離開＝病人離室」→ 不佔房卡（該房轉空房）。
                // 只顯示仍在房者（等候中/手術中/手術結束）；僅有排程未到院、或已離開 → 空房。
                var present = list.Where(s => s.SurgeryStatus is "手術中" or "手術結束" or "等候中").ToList();
                var current = present.FirstOrDefault(s => s.SurgeryStatus == "手術中")
                           ?? present.FirstOrDefault(s => s.SurgeryStatus == "手術結束")
                           ?? present.FirstOrDefault(s => s.SurgeryStatus == "等候中");
                if (current is not null)
                {
                    dto.Patient = current;
                    dto.Status = StatusToClass(current.SurgeryStatus);
                }
                // else：無在房病人（未到院／已離開）→ 保持預設空房（Status="empty"、Patient=null）
            }
            resp.Rooms.Add(dto);
        }
        return Ok(resp);
    }

    // 取 Board_OR 並同步當日快照（節流；僅成功時寫入、不誤標完成）
    private static DateTime _lastOrDailySync = DateTime.MinValue;
    private async Task SyncOrDailyIfFetchedAsync(CancellationToken ct)
    {
        List<BoardOrItem>? occ = null;
        try { occ = await _board.GetOrListAsync(ct); }
        catch (Exception ex) { _logger.LogWarning(ex, "Board_OR 取得失敗，跳過當日快照同步"); return; }

        if ((DateTime.UtcNow - _lastOrDailySync).TotalSeconds < 8) return;   // 節流：多客戶端/兩端點共用
        _lastOrDailySync = DateTime.UtcNow;

        var roomMap = (await _ward.GetOrRoomsAsync("OR", false, ct))
            .Where(r => !string.IsNullOrWhiteSpace(r.ApiRoom))
            .GroupBy(r => r.ApiRoom!.Trim(), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First().RoomId, StringComparer.OrdinalIgnoreCase);
        var today = DateTime.Today;
        var presentToday = new List<string>();
        foreach (var o in occ)
        {
            if (ParseBirth(o.OpDate) is not { } d) continue;
            var his = o.Hhisnum?.Trim();
            if (string.IsNullOrWhiteSpace(his)) continue;
            var apiRoom = o.Room?.Trim() ?? "";
            var opt = o.OpTime?.Trim() ?? "";
            var roomId = roomMap.TryGetValue(apiRoom, out var rid) ? rid : apiRoom;
            await _ward.UpsertOrDailyAsync(new OrDailySurgeryItem
            {
                SurgeryDate = d.Date, Hhisnum = his!, ApiRoom = apiRoom, RoomId = roomId,
                PatientName = o.Hnamec, Gender = o.Hsex, BirthDate = o.Hbirthdt, SurgeryName = o.Surgery,
                Doctor = o.Doctor, Department = o.Department, AnesType = o.Anes, Source = o.Source, OpTime = opt, Diagnosis = o.Diagnosis
            }, ct);
            if (d.Date == today) presentToday.Add($"{apiRoom}|{his}|{opt}");
        }
        await _ward.MarkOrDailyCompletedAsync(today, presentToday, ct);   // 今日消失者→已完成
        await _ward.PurgeOrDailyAsync(today.AddDays(-14), ct);
    }

    /// <summary>逐台刀覆蓋鍵：日期|白板房號|病歷號|預計時間（各 trim；供 OrSurgery/OrDaily/OrSurgeryNurse 對應）。</summary>
    private static string OsnKey(DateTime? date, string? roomId, string? chartNo, string? opTime)
        => $"{(date ?? default).ToString("yyyy-MM-dd")}|{(roomId ?? "").Trim()}|{(chartNo ?? "").Trim()}|{(opTime ?? "").Trim()}";

    /// <summary>當日快照 ＋ WardPatientExt overlay ＋ 逐台刀刷手/流動覆蓋 → OR 手術 DTO。</summary>
    private static OrSurgeryDto BuildOrSurgeryFromDaily(OrDailySurgeryItem d, WardPatientExtItem? e, OrSurgeryNurseItem? a, DateTime now) => new()
    {
        PatientName = MaskName(d.PatientName), Gender = d.Gender, Age = CalcAge(d.BirthDate), BirthDate = FormatBirth(d.BirthDate),
        MedRecord = d.Hhisnum, Diagnosis = string.IsNullOrWhiteSpace(d.Diagnosis) ? e?.Diagnosis : d.Diagnosis,
        SurgeryName = d.SurgeryName, Doctor = d.Doctor, AnesType = d.AnesType, SurgerySource = SourceToLabel(d.Source),
        ScheduledTime = d.OpTime,
        SurgeryStatus = DeriveOrStatus(d.OpTime, e?.StartTime, e?.EndTime, now),   // 已完成僅來自實際出刀房時間(EndTime)
        StartTime = e?.StartTime, EndTime = e?.EndTime,
        Department = string.IsNullOrWhiteSpace(d.Department) ? e?.Department : d.Department,   // 院方 Board_OR 科別優先，無則 overlay
        ScrubNurse = a?.ScrubNurse ?? e?.ScrubNurse,   // 逐台刀覆蓋優先，無則 WardPatientExt 後備
        CircNurse = a?.CircNurse ?? e?.CircNurse,
        Notes = a?.Note ?? e?.Notes
    };

    /// <summary>房卡停留（分）：某台過了預定時間、仍未登記進刀房，房卡仍停留此久；超過才換下一台。</summary>
    private const int OrCardHoldMinutes = 60;

    /// <summary>HH:mm → 當日分鐘數；空或格式錯回 null。</summary>
    private static int? HmToMin(string? t)
    {
        if (string.IsNullOrWhiteSpace(t)) return null;
        var p = t.Trim().Split(':');
        return p.Length >= 2 && int.TryParse(p[0], out var h) && int.TryParse(p[1], out var m) ? h * 60 + m : (int?)null;
    }

    /// <summary>
    /// 手術狀態自動判定（不採手填、且不使用「準備中」）：已填實際出刀房→已完成；
    /// 已填實際進刀房且已到→手術中；其餘一律→排程（不論是否已過預定時間）。時間為 HH:mm。
    /// </summary>
    private static string DeriveOrStatus(string? sched, string? start, string? end, DateTime now)
    {
        _ = sched;   // 狀態不再依預定時間變動；房卡停留由 GetOr 依 OrCardHoldMinutes 處理
        var nowMin = now.Hour * 60 + now.Minute;
        if (HmToMin(end) is not null) return "已完成";
        if (HmToMin(start) is { } st) return nowMin >= st ? "手術中" : "排程";
        return "排程";
    }

    /// <summary>手術狀態中文 → 卡片 class。手術中/手術結束＝in-surgery；等候中＝prep；已離開/已完成＝completed；待手術/未知＝scheduled。</summary>
    private static string StatusToClass(string? status) => status switch
    {
        "手術中" => "in-surgery",
        "手術結束" => "in-surgery",   // 已停刀、病人仍在房內，視覺同手術中一類
        "等候中" => "prep",
        "準備中" => "prep",
        "已離開" => "completed",
        "已完成" => "completed",
        _ => "scheduled"              // 待手術/排程/未知
    };

    /// <summary>來源代碼 → 急/門/住刀（實測全 O，暫定對照，待院方代碼表）；未知則回原碼。</summary>
    private static string? SourceToLabel(string? src) => (src?.Trim()) switch
    {
        "O" => "門診刀",
        "E" => "急診刀",
        "I" => "住院刀",
        null or "" => null,
        var s => s
    };

    /// <summary>OPORDER 案類 CaseType（A/O/E）→ 住院/門診/急診刀（取代退場的 Board_OR Source）；未知回原碼。</summary>
    private static string? CaseTypeToLabel(string? caseType) => (caseType?.Trim()) switch
    {
        "A" => "住院刀",
        "O" => "門診刀",
        "E" => "急診刀",
        null or "" => null,
        var s => s
    };

    // ── OR_SYSTEM（院方手術流程時間軸）輔助 ────────────────────────────────
    private static readonly CultureInfo ZhTw = CultureInfo.GetCultureInfo("zh-TW");

    /// <summary>解析院方中文日期時間字串（如「2026/8/19 上午 08:43:00」，含上午/下午）；空/失敗回 null。視為在地時間。</summary>
    private static DateTime? ParseZh(string? raw)
        => string.IsNullOrWhiteSpace(raw) ? null
           : DateTime.TryParse(raw.Trim(), ZhTw, DateTimeStyles.None, out var d) ? d : (DateTime?)null;

    /// <summary>院方時間字串 → HH:mm 顯示；空/失敗回 null。</summary>
    private static string? HmOf(string? raw) => ParseZh(raw) is { } d ? d.ToString("HH:mm") : null;

    /// <summary>SEND_OPT 去向：1恢復室 2等候區 3病房；未知回 null。</summary>
    private static string? SendOptToLabel(string? s) => (s?.Trim()) switch
    {
        "1" => "恢復室",
        "2" => "等候區",
        "3" => "病房",
        _ => null
    };

    /// <summary>依 OR_SYSTEM 四個時間點推導手術狀態：離開→已離開；結束→手術結束；進房→手術中；到達→等候中；無對應→待手術。</summary>
    private static string DeriveOrSystemStatus(OrSystemItem? m)
    {
        if (m is null) return "待手術";
        if (ParseZh(m.ResTime) is not null) return "已離開";
        if (ParseZh(m.CutTime) is not null) return "手術結束";
        if (ParseZh(m.EntTime) is not null) return "手術中";
        if (ParseZh(m.ComTime) is not null) return "等候中";
        return "待手術";
    }

    /// <summary>狀態進展排序（同病歷號取最進展一筆用）。</summary>
    private static int StatusRank(string s) => s switch { "已離開" => 4, "手術結束" => 3, "手術中" => 2, "等候中" => 1, _ => 0 };

    /// <summary>手術動態五態 → 手術資訊分頁三態（供 or/surgeries、{unit}/surgeries 收斂）：已離開/手術結束→已完成；手術中→手術中；其餘→待手術。</summary>
    private static string MapToInfoStatus(string s) => s switch
    {
        "已離開" or "手術結束" => "已完成",
        "手術中" => "手術中",
        _ => "待手術"
    };

    /// <summary>今日 OR_SYSTEM 狀態覆蓋：病歷號 → 手術動態狀態（同病歷號取最進展一筆）。供手術資訊分頁共用。</summary>
    private async Task<Dictionary<string, string>> BuildOrSystemStatusByHisAsync(DateTime today, CancellationToken ct)
    {
        var sys = (await FreshOrStaleAsync("or:system", 20, () => _board.GetOrSystemAsync(ct)))
            .Where(s => ParseZh(s.ComTime)?.Date == today && !string.IsNullOrWhiteSpace(s.Hhisnum));
        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var g in sys.GroupBy(s => s.Hhisnum!.Trim()))
            map[g.Key] = DeriveOrSystemStatus(g.OrderByDescending(s => StatusRank(DeriveOrSystemStatus(s))).First());
        return map;
    }

    /// <summary>第一個非空白字串；全空回 null。</summary>
    private static string? FirstNonBlank(params string?[] vals)
    { foreach (var v in vals) if (!string.IsNullOrWhiteSpace(v)) return v; return null; }

    /// <summary>今日 OPORDER 一列 ＋ 配對 OR_SYSTEM（可空，退回手動 overlay）＋ 逐台刀覆蓋 ＋ Board_OR 補生日/科別/診斷 → OR 手術 DTO。</summary>
    private static OrSurgeryDto BuildOrSurgeryFromOpOrder(OrSurgeryListRow r, OrSystemItem? m, WardPatientExtItem? e, OrSurgeryNurseItem? a, BoardOrItem? bo)
    {
        string status; string? startT, endT, arriveT = null, leaveT = null, dest = null;
        if (m is not null)   // OR_SYSTEM 有對應（已報到）→ 以時間軸自動判定
        {
            status = DeriveOrSystemStatus(m);
            arriveT = HmOf(m.ComTime); startT = HmOf(m.EntTime); endT = HmOf(m.CutTime); leaveT = HmOf(m.ResTime);
            if (status == "已離開") dest = SendOptToLabel(m.SendOpt);
        }
        else   // 無對應（未報到 / OR_SYSTEM 斷線）→ 退回手動 overlay（實際進/出刀房）
        {
            startT = string.IsNullOrWhiteSpace(e?.StartTime) ? null : e!.StartTime;
            endT = string.IsNullOrWhiteSpace(e?.EndTime) ? null : e!.EndTime;
            status = endT is not null ? "手術結束" : startT is not null ? "手術中" : "待手術";
        }
        return new OrSurgeryDto
        {
            PatientName = MaskName(r.PatientName),
            Gender = FirstNonBlank(r.Sex, bo?.Hsex),
            Age = r.Age ?? CalcAge(bo?.Hbirthdt),                 // OPORDER 年齡優先，無則由 Board_OR 生日概算
            BirthDate = FormatBirth(bo?.Hbirthdt),                // 生日：OPORDER 無此欄，取 Board_OR
            MedRecord = r.ChartNo,
            Diagnosis = FirstNonBlank(r.Diagnosis, bo?.Diagnosis, e?.Diagnosis),   // OPORDER 常空 → 補 Board_OR → 手動 overlay
            SurgeryName = FirstNonBlank(r.SurgeryName, bo?.Surgery),
            Doctor = FirstNonBlank(r.SurgeonName, bo?.Doctor),
            AnesType = FirstNonBlank(r.Anesthesia, bo?.Anes),
            SurgerySource = CaseTypeToLabel(r.CaseType) ?? SourceToLabel(bo?.Source),
            ScheduledTime = FirstNonBlank(r.OpTime, bo?.OpTime),
            SurgeryStatus = status,
            StartTime = startT, EndTime = endT, ArriveTime = arriveT, LeaveTime = leaveT, Destination = dest,
            Department = FirstNonBlank(r.Department, bo?.Department, e?.Department),   // 科別：OPORDER 常空 → 補 Board_OR
            ScrubNurse = a?.ScrubNurse ?? e?.ScrubNurse,
            CircNurse = a?.CircNurse ?? e?.CircNurse,
            Notes = a?.Note ?? e?.Notes
        };
    }

    // ── 臨床補充層 後台 CRUD ───────────────────────────────────────
    /// <summary>查詢某單位的臨床補充列（後台，含停用）。</summary>
    [HttpGet("{unitCode}/ext")]
    public async Task<IActionResult> GetExt(string unitCode, [FromQuery] bool includeAll = true, CancellationToken ct = default)
        => Ok(await _ward.GetExtAsync(unitCode, includeAll, ct));

    /// <summary>查單筆。</summary>
    [HttpGet("ext/{id:int}")]
    public async Task<IActionResult> GetExtById(int id, CancellationToken ct = default)
    {
        var item = await _ward.GetExtByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    /// <summary>新增臨床補充列。</summary>
    [HttpPost("ext")]
    public async Task<IActionResult> CreateExt([FromBody] WardPatientExtUpsertRequest req, CancellationToken ct = default)
    {
        var id = await _ward.CreateExtAsync(req, ct);
        return CreatedAtAction(nameof(GetExtById), new { id }, await _ward.GetExtByIdAsync(id, ct));
    }

    /// <summary>修改臨床補充列。</summary>
    [HttpPut("ext/{id:int}")]
    public async Task<IActionResult> UpdateExt(int id, [FromBody] WardPatientExtUpsertRequest req, CancellationToken ct = default)
        => await _ward.UpdateExtAsync(id, req, ct) ? Ok(await _ward.GetExtByIdAsync(id, ct)) : NotFound();

    /// <summary>刪除臨床補充列。</summary>
    [HttpDelete("ext/{id:int}")]
    public async Task<IActionResult> DeleteExt(int id, CancellationToken ct = default)
        => await _ward.DeleteExtAsync(id, ct) ? NoContent() : NotFound();

    // ── 各科值班醫師（ER 病室動態面板 + 後台 CRUD）──────────────────
    /// <summary>查詢某單位各科值班醫師（白板顯示傳 includeAll=false；後台傳 true 含停用）。</summary>
    [HttpGet("{unitCode}/oncall")]
    public async Task<IActionResult> GetOnCall(string unitCode, [FromQuery] bool includeAll = false, CancellationToken ct = default)
        => Ok(await _ward.GetOnCallAsync(unitCode, includeAll, ct));

    /// <summary>取得單筆值班醫師（ER 每日各科）。</summary>
    [HttpGet("oncall/{id:int}")]
    public async Task<IActionResult> GetOnCallById(int id, CancellationToken ct = default)
    {
        var item = await _ward.GetOnCallByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    /// <summary>新增值班醫師（ER 每日各科）。</summary>
    [HttpPost("oncall")]
    public async Task<IActionResult> CreateOnCall([FromBody] ErOnCallDoctorUpsertRequest req, CancellationToken ct = default)
    {
        var id = await _ward.CreateOnCallAsync(req, ct);
        return CreatedAtAction(nameof(GetOnCallById), new { id }, await _ward.GetOnCallByIdAsync(id, ct));
    }

    /// <summary>更新值班醫師（ER 每日各科）。</summary>
    [HttpPut("oncall/{id:int}")]
    public async Task<IActionResult> UpdateOnCall(int id, [FromBody] ErOnCallDoctorUpsertRequest req, CancellationToken ct = default)
        => await _ward.UpdateOnCallAsync(id, req, ct) ? Ok(await _ward.GetOnCallByIdAsync(id, ct)) : NotFound();

    /// <summary>刪除值班醫師（ER 每日各科）。</summary>
    [HttpDelete("oncall/{id:int}")]
    public async Task<IActionResult> DeleteOnCall(int id, CancellationToken ct = default)
        => await _ward.DeleteOnCallAsync(id, ct) ? NoContent() : NotFound();

    // ── 各科值班醫師「每日輪值排程」（月曆後台；顯示端日後接）──────────────
    // 科別設定 OnCallDept
    /// <summary>查詢值班醫師科別清單。</summary>
    [HttpGet("oncall-dept")]
    public async Task<IActionResult> GetOnCallDepts([FromQuery] bool includeAll = true, [FromQuery] string? ownerUnit = null, CancellationToken ct = default)
        => Ok(await _oncall.GetDeptsAsync(includeAll, ownerUnit, ct));

    /// <summary>取得單筆值班醫師科別。</summary>
    [HttpGet("oncall-dept/{id:int}")]
    public async Task<IActionResult> GetOnCallDeptById(int id, CancellationToken ct = default)
    {
        var item = await _oncall.GetDeptByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    /// <summary>新增值班醫師科別。</summary>
    [HttpPost("oncall-dept")]
    public async Task<IActionResult> CreateOnCallDept([FromBody] OnCallDeptUpsertRequest req, CancellationToken ct = default)
    {
        var id = await _oncall.CreateDeptAsync(req, ct);
        return CreatedAtAction(nameof(GetOnCallDeptById), new { id }, await _oncall.GetDeptByIdAsync(id, ct));
    }

    /// <summary>更新值班醫師科別。</summary>
    [HttpPut("oncall-dept/{id:int}")]
    public async Task<IActionResult> UpdateOnCallDept(int id, [FromBody] OnCallDeptUpsertRequest req, CancellationToken ct = default)
        => await _oncall.UpdateDeptAsync(id, req, ct) ? Ok(await _oncall.GetDeptByIdAsync(id, ct)) : NotFound();

    /// <summary>刪除值班醫師科別。</summary>
    [HttpDelete("oncall-dept/{id:int}")]
    public async Task<IActionResult> DeleteOnCallDept(int id, CancellationToken ct = default)
        => await _oncall.DeleteDeptAsync(id, ct) ? NoContent() : NotFound();

    // 每日輪值 OnCallRoster
    /// <summary>查詢值班醫師每日排班（可依科別與日期區間）。</summary>
    [HttpGet("oncall-roster")]
    public async Task<IActionResult> GetOnCallRoster([FromQuery] string? deptCode, [FromQuery] string? from, [FromQuery] string? to, CancellationToken ct = default)
    {
        DateTime? f = string.IsNullOrWhiteSpace(from) ? null : DateTime.Parse(from);
        DateTime? t = string.IsNullOrWhiteSpace(to) ? null : DateTime.Parse(to);
        return Ok(await _oncall.GetRosterAsync(string.IsNullOrWhiteSpace(deptCode) ? null : deptCode, f, t, ct));
    }

    /// <summary>某日全科值班（供日後看板顯示）。</summary>
    [HttpGet("oncall-roster/day")]
    public async Task<IActionResult> GetOnCallRosterDay([FromQuery] string? date, CancellationToken ct = default)
    {
        var d = string.IsNullOrWhiteSpace(date) ? DateTime.Today : DateTime.Parse(date);
        return Ok(await _oncall.GetDayAsync(d, ct));
    }

    /// <summary>看板「各科值班醫師」面板：每科一位（含全部啟用科別）；多時段科（內科）一律帶「值班」時段醫師。</summary>
    [HttpGet("oncall-board")]
    public async Task<IActionResult> GetOnCallBoard([FromQuery] string? date, CancellationToken ct = default)
    {
        var d = string.IsNullOrWhiteSpace(date) ? DateTime.Today : DateTime.Parse(date);
        var depts = (await _oncall.GetDeptsAsync(false, null, ct)).OrderBy(x => x.SortOrder).ThenBy(x => x.Id).ToList();
        var rows = (await _oncall.GetDayAsync(d, ct)).ToList();
        var result = depts.Select(dp => BuildOnCallEntry(dp.DeptCode, dp.DeptName, rows));
        return Ok(result);
    }

    /// <summary>ER 白板：當日外傷小組(TR)值班醫師（單一全日；08:00 前算前一日，與各科面板 effective date 一致）。</summary>
    [HttpGet("oncall-display/trauma")]
    public async Task<IActionResult> GetTraumaOnCall([FromQuery] string? date, CancellationToken ct = default)
    {
        var d = string.IsNullOrWhiteSpace(date) ? OnCallEffectiveDate() : DateTime.Parse(date);
        var rows = (await _oncall.GetDayAsync(d, ct)).ToList();
        return Ok(BuildOnCallEntry("TR", "外傷小組", rows));   // { deptCode, deptName, doctorName, ext, mobile, slot }
    }

    // 值班醫師「日切點」：每日 08:00 交班；08:00 前仍算前一日（未帶明確 date 時採用）。
    private const int OnCallCutoverHour = 8;      // 日班/交班起點 08:00
    private const int DayShiftEndHour = 17;       // 日班結束 17:30 → 之後為夜班
    private const int DayShiftEndMinute = 30;
    private static DateTime OnCallEffectiveDate()
        => DateTime.Now.Hour < OnCallCutoverHour ? DateTime.Today.AddDays(-1) : DateTime.Today;

    // 日/夜兩班科（如呼吸治療科）當下是否日班窗：08:00–17:30 日班、其餘夜班。
    // 與 OnCallEffectiveDate 搭配：00:00–08:00 屬前一日夜班、日窗屬當日日班、17:30–24:00 屬當日夜班。
    private static bool OnCallIsDayShift()
    {
        var now = DateTime.Now;
        if (now.Hour < OnCallCutoverHour) return false;                                   // 00:00–08:00 → 夜班
        if (now.Hour > DayShiftEndHour) return false;                                     // 18:00 之後 → 夜班
        if (now.Hour == DayShiftEndHour && now.Minute >= DayShiftEndMinute) return false; // 17:30–18:00 → 夜班
        return true;                                                                      // 08:00–17:30 → 日班
    }

    // 某科當日值班醫師挑選：
    //  日/夜兩班科（呼吸治療科 Slot=日班/夜班）→ 只帶「當下班別」該列；當前班別無人排(該列為空)則顯示空，
    //    絕不回退到另一班（否則白班空、夜班有人時，白班時段會誤顯示夜班醫師）。
    //  多時段科（內科 值班/上午/下午）→ 取 Slot=值班；
    //  無值班列或單一時段科 → 取當日該科第一列。
    private static object BuildOnCallEntry(string deptCode, string? deptName, List<OnCallRosterItem> rows)
    {
        var drows = rows.Where(r => r.DeptCode == deptCode).OrderBy(r => r.SortOrder).ThenBy(r => r.Id).ToList();
        var dayNight = drows.Where(r => r.Slot == "日班" || r.Slot == "夜班").ToList();
        OnCallRosterItem? pick;
        if (dayNight.Count > 0)
            pick = dayNight.FirstOrDefault(r => r.Slot == (OnCallIsDayShift() ? "日班" : "夜班"));   // 當前班別；無則空（不回退另一班）
        else if (drows.Count <= 1)
            pick = drows.FirstOrDefault();
        else
            pick = drows.FirstOrDefault(r => r.Slot == "值班") ?? drows.First();
        return new { deptCode, deptName, doctorName = pick?.DoctorName, ext = pick?.Ext, mobile = pick?.Mobile, slot = pick?.Slot };
    }

    // ── 各單位「引用值班醫師」科別選取 UnitOnCallDept ──────────────
    /// <summary>某單位選取的值班科別（含順序＋科別名稱）。供後台設定頁載入現值。</summary>
    [HttpGet("{unitCode}/oncall-display")]
    public async Task<IActionResult> GetUnitOnCallDepts(string unitCode, CancellationToken ct = default)
        => Ok(await _oncall.GetUnitDeptsAsync(unitCode, ct));

    /// <summary>覆寫某單位的值班科別選取（core batch：先刪後插，順序＝SortOrder）。</summary>
    [HttpPost("{unitCode}/oncall-display/batch")]
    public async Task<IActionResult> SaveUnitOnCallDepts(string unitCode, [FromBody] UnitOnCallDeptSaveRequest req, CancellationToken ct = default)
        => Ok(new { saved = await _oncall.SaveUnitDeptsAsync(unitCode, req.Entries ?? new(), ct) });

    /// <summary>某單位白板「值班醫療團隊」資料：所選科別當日值班醫師，依單位順序。（前台顯示用）</summary>
    [HttpGet("{unitCode}/oncall-display/board")]
    public async Task<IActionResult> GetUnitOnCallBoard(string unitCode, [FromQuery] string? date, CancellationToken ct = default)
    {
        var selected = (await _oncall.GetUnitDeptsAsync(unitCode, ct)).ToList();   // 已依 SortOrder
        if (selected.Count == 0) return Ok(Array.Empty<object>());
        var d = string.IsNullOrWhiteSpace(date) ? OnCallEffectiveDate() : DateTime.Parse(date);   // 08:00 前算前一日
        var rows = (await _oncall.GetDayAsync(d, ct)).ToList();
        var result = selected.Select(s => BuildOnCallEntry(s.DeptCode, s.DeptName, rows));
        return Ok(result);
    }

    /// <summary>新增值班醫師每日排班。</summary>
    [HttpPost("oncall-roster")]
    public async Task<IActionResult> CreateOnCallRoster([FromBody] OnCallRosterUpsertRequest req, CancellationToken ct = default)
        => Ok(new { id = await _oncall.CreateRosterAsync(req, ct) });

    /// <summary>更新值班醫師每日排班。</summary>
    [HttpPut("oncall-roster/{id:int}")]
    public async Task<IActionResult> UpdateOnCallRoster(int id, [FromBody] OnCallRosterUpsertRequest req, CancellationToken ct = default)
        => await _oncall.UpdateRosterAsync(id, req, ct) ? NoContent() : NotFound();

    /// <summary>刪除值班醫師每日排班。</summary>
    [HttpDelete("oncall-roster/{id:int}")]
    public async Task<IActionResult> DeleteOnCallRoster(int id, CancellationToken ct = default)
        => await _oncall.DeleteRosterAsync(id, ct) ? NoContent() : NotFound();

    /// <summary>月曆整月存檔（覆寫該科該月）。</summary>
    [HttpPost("oncall-roster/month")]
    public async Task<IActionResult> SaveOnCallMonth([FromBody] OnCallMonthSaveRequest req, CancellationToken ct = default)
        => Ok(new { saved = await _oncall.SaveMonthAsync(req, ct) });

    // ── 夜/假護理師值班表 NightNurseRoster（無科別；每日小夜/小夜貳組）──
    /// <summary>夜/假護理師值班（區間；供後台月曆載入／日後看板顯示）。GET 匿名。</summary>
    [HttpGet("night-nurse")]
    public async Task<IActionResult> GetNightNurse([FromQuery] string? from, [FromQuery] string? to, CancellationToken ct = default)
    {
        var today = DateTime.Today;
        var f = string.IsNullOrWhiteSpace(from) ? new DateTime(today.Year, today.Month, 1) : DateTime.Parse(from);
        var t = string.IsNullOrWhiteSpace(to) ? f.AddMonths(1).AddDays(-1) : DateTime.Parse(to);
        return Ok(await _oncall.GetNightNurseAsync(f, t, ct));
    }

    /// <summary>夜/假護理師 月曆整月存檔（覆寫該月）。</summary>
    [HttpPost("night-nurse/month")]
    public async Task<IActionResult> SaveNightNurseMonth([FromBody] NightNurseMonthSaveRequest req, CancellationToken ct = default)
        => Ok(new { saved = await _oncall.SaveNightNurseMonthAsync(req, ct) });

    // ── 護理行政值班表 AdminDutyRoster（無科別；每日大夜/白班/小夜）──
    /// <summary>護理行政值班（區間；供後台月曆載入／日後看板顯示）。GET 匿名。</summary>
    [HttpGet("admin-duty")]
    public async Task<IActionResult> GetAdminDuty([FromQuery] string? from, [FromQuery] string? to, CancellationToken ct = default)
    {
        var today = DateTime.Today;
        var f = string.IsNullOrWhiteSpace(from) ? new DateTime(today.Year, today.Month, 1) : DateTime.Parse(from);
        var t = string.IsNullOrWhiteSpace(to) ? f.AddMonths(1).AddDays(-1) : DateTime.Parse(to);
        return Ok(await _oncall.GetAdminDutyAsync(f, t, ct));
    }

    /// <summary>護理行政值班 月曆整月存檔（覆寫該月）。</summary>
    [HttpPost("admin-duty/month")]
    public async Task<IActionResult> SaveAdminDutyMonth([FromBody] AdminDutyMonthSaveRequest req, CancellationToken ct = default)
        => Ok(new { saved = await _oncall.SaveAdminDutyMonthAsync(req, ct) });

    // ── 當日專師排班 SpecialistRoster（依站別；每日可多位；供 {unit}/schedule 專科護理師）──
    /// <summary>某站專師排班（區間；供後台月曆載入）。GET 匿名。</summary>
    [HttpGet("{unitCode}/specialist")]
    public async Task<IActionResult> GetSpecialists(string unitCode, [FromQuery] string? from, [FromQuery] string? to, CancellationToken ct = default)
    {
        var today = DateTime.Today;
        var f = string.IsNullOrWhiteSpace(from) ? new DateTime(today.Year, today.Month, 1) : DateTime.Parse(from);
        var t = string.IsNullOrWhiteSpace(to) ? f.AddMonths(1).AddDays(-1) : DateTime.Parse(to);
        return Ok(await _oncall.GetSpecialistsAsync(unitCode, f, t, ct));
    }

    /// <summary>某站專師排班 月曆整月存檔（覆寫該站該月）。</summary>
    [HttpPost("{unitCode}/specialist/month")]
    public async Task<IActionResult> SaveSpecialistMonth(string unitCode, [FromBody] SpecialistMonthSaveRequest req, CancellationToken ct = default)
    {
        req.UnitCode = unitCode;   // 以路由為準
        return Ok(new { saved = await _oncall.SaveSpecialistMonthAsync(req, ct) });
    }

    // ── 當日住院醫師排班 ResidentRoster（依站別；每日可多位；純手動 keyin）──
    /// <summary>某站住院醫師排班（區間；供後台月曆載入）。GET 匿名。</summary>
    [HttpGet("{unitCode}/resident")]
    public async Task<IActionResult> GetResidents(string unitCode, [FromQuery] string? from, [FromQuery] string? to, CancellationToken ct = default)
    {
        var today = DateTime.Today;
        var f = string.IsNullOrWhiteSpace(from) ? new DateTime(today.Year, today.Month, 1) : DateTime.Parse(from);
        var t = string.IsNullOrWhiteSpace(to) ? f.AddMonths(1).AddDays(-1) : DateTime.Parse(to);
        return Ok(await _oncall.GetResidentsAsync(unitCode, f, t, ct));
    }

    /// <summary>某站住院醫師排班 月曆整月存檔（覆寫該站該月）。</summary>
    [HttpPost("{unitCode}/resident/month")]
    public async Task<IActionResult> SaveResidentMonth(string unitCode, [FromBody] ResidentMonthSaveRequest req, CancellationToken ct = default)
    {
        req.UnitCode = unitCode;   // 以路由為準
        return Ok(new { saved = await _oncall.SaveResidentMonthAsync(req, ct) });
    }

    // ── ER 三班醫護人員面板（自建；護理師掛人員管理）──────────────────
    /// <summary>看板：ER 四班面板，護理師 Staff.Id→姓名解析；回 camelCase。</summary>
    [HttpGet("{unitCode}/shiftpanel")]
    public async Task<IActionResult> GetErShiftPanel(string unitCode, CancellationToken ct = default)
    {
        var rows = (await _ward.GetErShiftAsync(unitCode, false, ct)).ToList();
        var staff = (await _staff.GetStaffAsync(true, ct)).ToDictionary(s => s.Id, s => s.Name);
        var data = rows.Select(r => new
        {
            shift = r.ShiftLabel, time = r.ShiftTime, doctor = r.Doctor, aide = r.Aide,
            nurses = (r.NurseStaffIds ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(x => int.TryParse(x, out var i) && staff.TryGetValue(i, out var n) ? n : null)
                .Where(n => n != null).ToList()
        });
        return Ok(data);
    }
    // 後台 CRUD（固定四班，主要用 PUT；POST/DELETE 備用）
    /// <summary>查詢某單位ER 三班醫護面板（醫師／照服員）清單。</summary>
    [HttpGet("{unitCode}/shiftpanel-list")]
    public async Task<IActionResult> GetErShiftList(string unitCode, [FromQuery] bool includeAll = true, CancellationToken ct = default)
        => Ok(await _ward.GetErShiftAsync(unitCode, includeAll, ct));
    /// <summary>取得單筆ER 三班醫護面板（醫師／照服員）。</summary>
    [HttpGet("shiftpanel/{id:int}")]
    public async Task<IActionResult> GetErShiftById(int id, CancellationToken ct = default)
    { var x = await _ward.GetErShiftByIdAsync(id, ct); return x is null ? NotFound() : Ok(x); }
    /// <summary>新增ER 三班醫護面板（醫師／照服員）。</summary>
    [HttpPost("shiftpanel")]
    public async Task<IActionResult> CreateErShift([FromBody] ErShiftStaffUpsertRequest req, CancellationToken ct = default)
    { var id = await _ward.CreateErShiftAsync(req, ct); return CreatedAtAction(nameof(GetErShiftById), new { id }, await _ward.GetErShiftByIdAsync(id, ct)); }
    /// <summary>更新ER 三班醫護面板（醫師／照服員）。</summary>
    [HttpPut("shiftpanel/{id:int}")]
    public async Task<IActionResult> UpdateErShift(int id, [FromBody] ErShiftStaffUpsertRequest req, CancellationToken ct = default)
        => await _ward.UpdateErShiftAsync(id, req, ct) ? Ok(await _ward.GetErShiftByIdAsync(id, ct)) : NotFound();
    /// <summary>刪除ER 三班醫護面板（醫師／照服員）。</summary>
    [HttpDelete("shiftpanel/{id:int}")]
    public async Task<IActionResult> DeleteErShift(int id, CancellationToken ct = default)
        => await _ward.DeleteErShiftAsync(id, ct) ? NoContent() : NotFound();

    // ── ER 床位主檔（病室動態平面圖 + 後台 CRUD）──────────────────────
    /// <summary>查詢某單位 ER 床位主檔（白板傳 includeAll=false；後台傳 true 含停用）。</summary>
    [HttpGet("{unitCode}/bed")]
    public async Task<IActionResult> GetErBeds(string unitCode, [FromQuery] bool includeAll = false, CancellationToken ct = default)
        => Ok(await _ward.GetErBedsAsync(unitCode, includeAll, ct));

    /// <summary>取得單筆ER 床位主檔。</summary>
    [HttpGet("bed/{id:int}")]
    public async Task<IActionResult> GetErBedById(int id, CancellationToken ct = default)
    {
        var item = await _ward.GetErBedByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    /// <summary>新增ER 床位主檔。</summary>
    [HttpPost("bed")]
    public async Task<IActionResult> CreateErBed([FromBody] ErBedUpsertRequest req, CancellationToken ct = default)
    {
        var id = await _ward.CreateErBedAsync(req, ct);
        return CreatedAtAction(nameof(GetErBedById), new { id }, await _ward.GetErBedByIdAsync(id, ct));
    }

    /// <summary>更新ER 床位主檔。</summary>
    [HttpPut("bed/{id:int}")]
    public async Task<IActionResult> UpdateErBed(int id, [FromBody] ErBedUpsertRequest req, CancellationToken ct = default)
        => await _ward.UpdateErBedAsync(id, req, ct) ? Ok(await _ward.GetErBedByIdAsync(id, ct)) : NotFound();

    /// <summary>刪除ER 床位主檔。</summary>
    [HttpDelete("bed/{id:int}")]
    public async Task<IActionResult> DeleteErBed(int id, CancellationToken ct = default)
        => await _ward.DeleteErBedAsync(id, ct) ? NoContent() : NotFound();

    // ── OR 刀房主檔（手術動態房卡 + 後台 CRUD）────────────────────────
    /// <summary>查詢某單位 OR 刀房主檔（白板傳 includeAll=false；後台傳 true 含停用）。</summary>
    [HttpGet("{unitCode}/room")]
    public async Task<IActionResult> GetOrRooms(string unitCode, [FromQuery] bool includeAll = false, CancellationToken ct = default)
        => Ok(await _ward.GetOrRoomsAsync(unitCode, includeAll, ct));

    /// <summary>取得單筆OR 刀房主檔。</summary>
    [HttpGet("room/{id:int}")]
    public async Task<IActionResult> GetOrRoomById(int id, CancellationToken ct = default)
    {
        var item = await _ward.GetOrRoomByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    /// <summary>新增OR 刀房主檔。</summary>
    [HttpPost("room")]
    public async Task<IActionResult> CreateOrRoom([FromBody] OrRoomUpsertRequest req, CancellationToken ct = default)
    {
        var id = await _ward.CreateOrRoomAsync(req, ct);
        return CreatedAtAction(nameof(GetOrRoomById), new { id }, await _ward.GetOrRoomByIdAsync(id, ct));
    }

    /// <summary>更新OR 刀房主檔。</summary>
    [HttpPut("room/{id:int}")]
    public async Task<IActionResult> UpdateOrRoom(int id, [FromBody] OrRoomUpsertRequest req, CancellationToken ct = default)
        => await _ward.UpdateOrRoomAsync(id, req, ct) ? Ok(await _ward.GetOrRoomByIdAsync(id, ct)) : NotFound();

    /// <summary>刪除OR 刀房主檔。</summary>
    [HttpDelete("room/{id:int}")]
    public async Task<IActionResult> DeleteOrRoom(int id, CancellationToken ct = default)
        => await _ward.DeleteOrRoomAsync(id, ct) ? NoContent() : NotFound();

    // ── OR 手術派班（ScheduleTab）：組裝三班 ＋ 後台 CRUD ─────────────
    // 班別常數（含時段；組裝順序）
    private static readonly (string Type, string Time)[] OR_SHIFTS =
        { ("白班", "08:00–16:00"), ("小夜", "16:00–24:00"), ("大夜", "00:00–08:00") };

    /// <summary>OR 手術派班：讀 OrShiftStaff＋OrShiftRoom，以 OrRoom 為刀房清單組裝三班 Shifts[]。</summary>
    [HttpGet("or/schedule")]
    public async Task<IActionResult> GetOrSchedule(CancellationToken ct = default)
    {
        var staff = (await _ward.GetShiftStaffAsync("OR", false, ct)).ToList();
        var srooms = (await _ward.GetShiftRoomAsync("OR", false, ct)).ToList();
        var master = (await _ward.GetOrRoomsAsync("OR", false, ct)).ToList();   // 刀房清單（7 房）

        var resp = new OrScheduleResponse { Data = new OrScheduleData { QueryDate = DateTime.Today.ToString("yyyy-MM-dd") } };
        foreach (var (type, time) in OR_SHIFTS)
        {
            var s = staff.Where(x => x.ShiftType == type).ToList();
            var charge = s.FirstOrDefault(x => x.Role == "護理長");
            var circ = s.FirstOrDefault(x => x.Role == "體循");
            var shift = new OrShiftDto
            {
                ShiftType = type, ShiftTime = time,
                Charge = new OrPersonDto { Name = charge?.Name, Extension = charge?.Ext },
                Anesthesia = s.Where(x => x.Role == "麻醉")
                              .Select(a => new OrAnesDto { StaffId = a.Id, Name = a.Name, Role = a.RoleTitle, Extension = a.Ext }).ToList(),
                CircTech = circ is null ? null : new OrPersonDto { Name = circ.Name, Role = circ.RoleTitle, Extension = circ.Ext }
            };
            var byRoom = srooms.Where(x => x.ShiftType == type)
                .GroupBy(x => x.RoomId, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);
            foreach (var m in master)
            {
                byRoom.TryGetValue(m.RoomId, out var a);
                shift.Rooms.Add(new OrSchedRoomDto { RoomId = m.RoomId, ScrubNurse = a?.ScrubNurse, CircNurse = a?.CircNurse, Extension = a?.Ext });
            }
            resp.Data.Shifts.Add(shift);
        }
        return Ok(resp);
    }

    /// <summary>OR 術後特殊交班（自建 OrHandover）。</summary>
    [HttpGet("or/handover")]
    public async Task<IActionResult> GetOrHandover(CancellationToken ct = default)
    {
        var list = (await _ward.GetHandoverAsync("OR", false, ct)).ToList();
        var resp = new OrHandoverResponse { Data = new OrHandoverData { QueryDate = DateTime.Today.ToString("yyyy-MM-dd") } };
        resp.Data.Items = list.Select(h => new OrHandoverDto
        {
            HandoverId = h.Id, RoomId = h.RoomId, SurgerySource = h.SurgerySource, PatientName = MaskName(h.PatientName),
            Gender = h.Gender, Age = h.Age, MedRecord = h.Hhisnum, SurgeryName = h.SurgeryName, SurgeonName = h.SurgeonName,
            DestWard = h.DestWard, DestBed = h.DestBed, EndTime = h.EndTime, BloodLoss = h.BloodLoss,
            BloodTransfusion = h.BloodTransfusion, DrainDetails = h.DrainDetails, SpecialNotes = h.SpecialNotes
        }).ToList();
        return Ok(resp);
    }

    /// <summary>
    /// OR 月清單／統計（雛形）：直接讀資訊室同步庫 DB2_DUMP 的 OPORDER_4A0（含過去已完成刀，Board_OR API 拿不到），
    /// 不經 Board_* API。參數 ym=2026-06（整月）或 from/to（[from,to) 半開區間）。
    /// 回 { from, to, stats{總/住/門/急/各刀房…}, rows[] }。
    /// </summary>
    [HttpGet("or/monthly")]
    public async Task<IActionResult> GetOrMonthly([FromQuery] string? ym, [FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct = default)
    {
        DateTime f, t;
        if (!string.IsNullOrWhiteSpace(ym) && DateTime.TryParse(ym + "-01", out var m))
        { f = m.Date; t = f.AddMonths(1); }
        else if (from.HasValue)
        { f = from.Value.Date; t = (to ?? from.Value).Date.AddDays(to.HasValue ? 0 : 1); if (t <= f) t = f.AddDays(1); }
        else
        { f = new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1); t = f.AddMonths(1); }   // 預設本月

        if ((t - f).TotalDays > 92) return BadRequest(new { message = "查詢區間過長（上限約 3 個月）" });
        try
        {
            return Ok(await _orReport.GetMonthlyAsync(f, t, ct));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "OR 月清單查詢失敗 {From}~{To}", f, t);
            return StatusCode(502, new { message = "同步庫（DB2_DUMP）查詢失敗", detail = ex.Message });
        }
    }

    /// <summary>
    /// OR 手術清單（頁籤用）：讀本地清洗表 [dbo].[OrSurgery]（由 WhiteboardSync ETL 落地，快）。
    /// 參數 from/to（皆含，yyyy-MM-dd）；省略→本月。回 { from, to, stats{總/住/門/急/各刀房}, rows[] }。
    /// </summary>
    [HttpGet("or/surgerylist")]
    public async Task<IActionResult> GetOrSurgeryList([FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct = default)
    {
        var (ok, f, t, err) = NormalizeOrRange(from, to);
        if (!ok) return BadRequest(new { message = err });

        var rows = await BuildOrSurgeryRowsAsync(f, t, ct);
        foreach (var r in rows) r.PatientName = MaskName(r.PatientName);   // 公開看板：病人姓名去識別化（統計不受影響）
        var stats = new OrMonthlyStats
        {
            Total = rows.Count,
            Inpatient = rows.Count(x => x.CaseType == "A"),
            Outpatient = rows.Count(x => x.CaseType == "O"),
            Emergency = rows.Count(x => x.CaseType == "E"),
            Status82 = rows.Count(x => x.StatusCode == "82"),
            ByRoom = rows.GroupBy(x => x.RoomId ?? x.Room ?? "").OrderBy(g => g.Key)
                         .Select(g => new CodeCount { Key = g.Key, Count = g.Count() }).ToList(),
        };
        return Ok(new OrSurgeryListResult
        {
            From = f.ToString("yyyy-MM-dd"),
            To = t.ToString("yyyy-MM-dd"),
            Stats = stats,
            Rows = rows,
        });
    }

    /// <summary>匯出 OR 手術清單為 .xlsx（含完整病人姓名，屬 PII → 需登入）。檔名 手術清單{起}-{訖}.xlsx。</summary>
    [HttpGet("or/surgerylist/export")]
    [Authorize]
    public async Task<IActionResult> ExportOrSurgeryList([FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct = default)
    {
        var (ok, f, t, err) = NormalizeOrRange(from, to);
        if (!ok) return BadRequest(new { message = err });

        var rows = await BuildOrSurgeryRowsAsync(f, t, ct);   // 不遮罩，匯出真名
        var headers = new[] { "手術日期", "手術時間", "房間", "科別", "案別", "病歷號", "姓名", "性別", "年齡",
            "來源病房", "床位", "主刀醫師", "麻醉", "手術名稱", "診斷", "ICD碼", "刷手", "流動", "麻醉護理", "備註", "狀態", "取消原因" };
        var data = rows.Select(r => new[]
        {
            r.OpDate.ToString("yyyy-MM-dd"), r.OpTime ?? "", r.RoomId ?? r.Room ?? "", r.Department ?? "", r.CaseTypeText ?? "",
            r.ChartNo ?? "", r.PatientName ?? "", r.Sex ?? "", r.Age?.ToString() ?? "",
            r.SourceWard ?? "", r.SourceBed ?? "", r.SurgeonName ?? "", r.Anesthesia ?? "", r.SurgeryName ?? "",
            r.Diagnosis ?? "", r.IcdCodes ?? "", r.ScrubNurse ?? "", r.CircNurse ?? "", r.AnesNurse ?? "", r.Note ?? "",
            r.StatusCode == "82" ? "取消" : "正常", r.CancelReason ?? "",
        });
        var bytes = Utils.SimpleXlsx.Build("手術清單", headers, data);
        var fileName = $"手術清單{f:yyyy-MM-dd}~{t:yyyy-MM-dd}.xlsx";
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }

    // 手術清單區間正規化（皆含；預設當月；上限約 3 個月）
    private static (bool ok, DateTime from, DateTime to, string? err) NormalizeOrRange(DateTime? from, DateTime? to)
    {
        var today = DateTime.Today;
        var f = from?.Date ?? new DateTime(today.Year, today.Month, 1);
        var t = to?.Date ?? f.AddMonths(1).AddDays(-1);
        if (t < f) (f, t) = (t, f);
        if ((t - f).TotalDays > 92) return (false, f, t, "查詢區間過長（上限約 3 個月）");
        return (true, f, t, null);
    }

    // 查手術清單 ＋ 併入逐台刀刷手/流動/麻醉/備註覆蓋（不遮罩姓名；供 JSON 端點遮罩後回、匯出端點原樣用）
    private async Task<List<OrSurgeryListRow>> BuildOrSurgeryRowsAsync(DateTime f, DateTime t, CancellationToken ct)
    {
        var rows = (await _ward.GetOrSurgeryListAsync(f, t, ct)).ToList();
        var osn = (await _ward.GetOrSurgeryNurseAsync(f, t, ct))
            .GroupBy(x => OsnKey(x.OpDate, x.RoomId, x.ChartNo, x.OpTime))
            .ToDictionary(g => g.Key, g => g.First());
        foreach (var r in rows)
            if (osn.TryGetValue(OsnKey(r.OpDate, r.RoomId, r.ChartNo, r.OpTime), out var a))
            { r.ScrubNurse = a.ScrubNurse; r.CircNurse = a.CircNurse; r.AnesNurse = a.AnesNurse; r.Note = a.Note; }
        return rows;
    }

    /// <summary>逐台刀 刷手/流動/備註 批次存檔（後台月曆一次送出變更；三欄皆空＝清除該台刀）。</summary>
    [HttpPost("or/surgery-nurse/batch")]
    public async Task<IActionResult> SaveOrSurgeryNurse([FromBody] OrSurgeryNurseBatchRequest req, CancellationToken ct = default)
        => Ok(new { saved = await _ward.SaveOrSurgeryNurseBatchAsync(req.Entries ?? new(), ct) });

    /// <summary>OR 刀房某日溫溼度（省略 date＝今日）；供後台編輯載入現值。GET 匿名。</summary>
    [HttpGet("or/temphumidity")]
    public async Task<IActionResult> GetOrRoomEnv([FromQuery] DateTime? date, CancellationToken ct = default)
        => Ok(await _ward.GetOrRoomEnvAsync(date?.Date ?? DateTime.Today, ct));

    /// <summary>OR 刀房溫溼度 批次存檔（後台一次送出該日變更；兩欄皆空＝清除該刀房）。</summary>
    [HttpPost("or/temphumidity/batch")]
    public async Task<IActionResult> SaveOrRoomEnv([FromBody] OrRoomEnvBatchRequest req, CancellationToken ct = default)
        => Ok(new { saved = await _ward.SaveOrRoomEnvBatchAsync(req.Entries ?? new(), ct) });

    /// <summary>OR 手術清單（全部排程，攤平）：供 ICU/W52「手術資訊」分頁。骨幹＝本地 OrSurgery(OPORDER)；今日狀態疊 OR_SYSTEM。</summary>
    [HttpGet("or/surgeries")]
    public async Task<IActionResult> GetOrSurgeries(CancellationToken ct = default)
    {
        var now = DateTime.Now; var today = DateTime.Today;
        var overlay = await BuildOrSystemStatusByHisAsync(today, ct);   // 今日 OR_SYSTEM 狀態（病歷號→狀態）
        var rows = (await _ward.GetOrSurgeryListAsync(today.AddDays(-7), today.AddDays(14), ct))
            .Where(r => r.StatusCode != "82")
            .ToList();
        var list = rows.Select(r =>
        {
            string status;
            if (r.OpDate.Date < today) status = "已完成";
            else if (r.OpDate.Date == today && !string.IsNullOrWhiteSpace(r.ChartNo) && overlay.TryGetValue(r.ChartNo!.Trim(), out var st))
                status = MapToInfoStatus(st);
            else status = DeriveSurgeryStatus(r.OpDate, r.OpTime, now, today);
            return new OrSurgeryListItem
            {
                OrRoom = r.RoomId ?? r.Room, Date = r.OpDate.ToString("yyyy-MM-dd"), ScheduledTime = r.OpTime,
                PatientName = MaskName(r.PatientName), Gender = r.Sex, Age = r.Age,
                Procedure = r.SurgeryName, Diagnosis = r.Diagnosis, AnesthesiaMethod = r.Anesthesia,
                AttendingSurgeon = r.SurgeonName,
                Status = status
            };
        }).OrderBy(x => x.Date).ThenBy(x => x.ScheduledTime).ToList();
        return Ok(list);
    }

    /// <summary>
    /// 單位「手術資訊」分頁：只回「該單位目前在床病人」的手術（以在床病歷號(ChartNo)比對）。
    /// 讀本地清洗表 [dbo].[OrSurgery]（WhiteboardSync 落地）。院方在床 API 失敗 → 回空（絕不退回全院）。
    /// 日期區間 from/to（含，yyyy-MM-dd）；省略→當日。W52 前台不帶參數（當日）、ICU 帶今天±3。
    /// 在床來源：W52＝Board_bed W52；ICU＝AICU(F4)＋CICU(F3)。
    /// </summary>
    [HttpGet("{unitCode}/surgeries")]
    public async Task<IActionResult> GetUnitSurgeries(string unitCode, [FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct = default)
    {
        var u = unitCode.ToUpperInvariant();
        // 取該單位目前在床病人：病歷號 → 病床號（SafeBoardAsync 內含 try/catch，失敗回空）
        List<BoardBedItem> boards;
        if (u == "W52")
            boards = await SafeBoardAsync("W52", ct);
        else if (u == "ICU")
            boards = (await SafeBoardAsync("AICU", ct)).Concat(await SafeBoardAsync("CICU", ct)).ToList();
        else
            return BadRequest(new { message = $"尚未支援單位 {unitCode} 的手術過濾（目前僅 W52 / ICU）" });

        var bedByHis = boards
            .Where(o => !string.IsNullOrWhiteSpace(o.Hhisnum))
            .GroupBy(o => o.Hhisnum!.Trim())
            .ToDictionary(g => g.Key, g => (g.First().Hbed ?? "").Trim(), StringComparer.OrdinalIgnoreCase);

        if (bedByHis.Count == 0) return Ok(new List<OrSurgeryListItem>());   // 無在床病人 → 無內容

        var now = DateTime.Now; var today = DateTime.Today;
        var f = from?.Date ?? today;
        var t = to?.Date ?? today;
        if (t < f) (f, t) = (t, f);
        if ((t - f).TotalDays > 14) return BadRequest(new { message = "查詢區間過長（上限 14 天）" });

        // 查區間本地手術表（先取全部供「刀次」計算，再過濾成該單位在床病人）
        var allRows = (await _ward.GetOrSurgeryListAsync(f, t, ct)).ToList();
        // 刀次：每(日,刀房)依排程時間排序給序號（1-based，排除取消 82）
        string SeqKey(OrSurgeryListRow r) => $"{r.OpDate:yyyy-MM-dd}|{(r.RoomId ?? r.Room ?? "").Trim()}|{(r.ChartNo ?? "").Trim()}|{(r.OpTime ?? "").Trim()}";
        var seqByKey = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var grp in allRows.Where(r => r.StatusCode != "82")
                     .GroupBy(r => $"{r.OpDate:yyyy-MM-dd}|{(r.RoomId ?? r.Room ?? "").Trim()}"))
        {
            int i = 0;
            foreach (var r in grp.OrderBy(r => (r.OpTime ?? "").Trim())) seqByKey[SeqKey(r)] = ++i;
        }
        var rows = allRows
            .Where(r => !string.IsNullOrWhiteSpace(r.ChartNo) && bedByHis.ContainsKey(r.ChartNo!.Trim()))
            .ToList();

        // 完成訊號由 OR_SYSTEM（今日）判定；過去日視為已完成。
        var overlay = await BuildOrSystemStatusByHisAsync(today, ct);
        // 診斷補充：OPORDER ORDIAG 常為空 → 以院方 Board_OR 依病歷號補（enrichment，失敗回空不中斷、20 秒快取）。
        var diagByHis = (await FreshOrStaleAsync("or:board", 20, async () =>
                { try { return await _board.GetOrListAsync(ct); } catch { return new List<BoardOrItem>(); } }))
            .Where(o => !string.IsNullOrWhiteSpace(o.Hhisnum) && !string.IsNullOrWhiteSpace(o.Diagnosis))
            .GroupBy(o => o.Hhisnum!.Trim())
            .ToDictionary(g => g.Key, g => g.First().Diagnosis, StringComparer.OrdinalIgnoreCase);

        var list = rows.Select(r =>
        {
            var chart = r.ChartNo!.Trim();
            string st;
            if (r.StatusCode == "82" || !string.IsNullOrWhiteSpace(r.CancelReason)) st = "取消";
            else if (r.OpDate.Date < today) st = "已完成";
            else if (r.OpDate.Date == today && overlay.TryGetValue(chart, out var sysSt))
                st = MapToInfoStatus(sysSt);
            else st = DeriveSurgeryStatus(r.OpDate, r.OpTime, now, today);
            if (st == "手術中" || st == "待手術") st = "排程";   // W52/ICU 手術頁：未完成/未取消一律顯示「排程」（無手術中/待手術之分）
            return new OrSurgeryListItem
            {
                OrRoom = r.RoomId ?? r.Room, SeqNo = seqByKey.TryGetValue(SeqKey(r), out var sq) ? sq : (int?)null,
                Date = r.OpDate.ToString("yyyy-MM-dd"), ScheduledTime = r.OpTime,
                BedId = bedByHis.GetValueOrDefault(chart),
                PatientName = MaskName(r.PatientName), Gender = r.Sex, Age = r.Age,
                Procedure = r.SurgeryName,
                Diagnosis = FirstNonBlank(r.Diagnosis, diagByHis.GetValueOrDefault(chart)),
                AnesthesiaMethod = r.Anesthesia,
                AttendingSurgeon = r.SurgeonName,
                Status = st
            };
        }).OrderBy(x => x.Date).ThenBy(x => x.ScheduledTime).ToList();
        return Ok(list);
    }

    /// <summary>手術資訊狀態（依日期/時間推導）：過去日→已完成；今日已過時間→手術中；其餘→待手術。</summary>
    private static string DeriveSurgeryStatus(DateTime? date, string? time, DateTime now, DateTime today)
    {
        if (date is null) return "待手術";
        if (date.Value.Date < today) return "已完成";
        if (date.Value.Date > today) return "待手術";
        var parts = (time ?? "").Trim().Split(':');
        if (parts.Length >= 2 && int.TryParse(parts[0], out var h) && int.TryParse(parts[1], out var m))
            return (now.Hour * 60 + now.Minute) >= (h * 60 + m) ? "手術中" : "待手術";
        return "待手術";
    }

    // 班級人員 CRUD（後台）
    /// <summary>查詢某單位OR 手術派班班別人員（護理長／麻醉／體循）清單。</summary>
    [HttpGet("{unitCode}/shiftstaff")]
    public async Task<IActionResult> GetShiftStaff(string unitCode, [FromQuery] bool includeAll = false, CancellationToken ct = default)
        => Ok(await _ward.GetShiftStaffAsync(unitCode, includeAll, ct));
    /// <summary>取得單筆OR 手術派班班別人員（護理長／麻醉／體循）。</summary>
    [HttpGet("shiftstaff/{id:int}")]
    public async Task<IActionResult> GetShiftStaffById(int id, CancellationToken ct = default)
    { var x = await _ward.GetShiftStaffByIdAsync(id, ct); return x is null ? NotFound() : Ok(x); }
    /// <summary>新增OR 手術派班班別人員（護理長／麻醉／體循）。</summary>
    [HttpPost("shiftstaff")]
    public async Task<IActionResult> CreateShiftStaff([FromBody] OrShiftStaffUpsertRequest req, CancellationToken ct = default)
    { var id = await _ward.CreateShiftStaffAsync(req, ct); return CreatedAtAction(nameof(GetShiftStaffById), new { id }, await _ward.GetShiftStaffByIdAsync(id, ct)); }
    /// <summary>更新OR 手術派班班別人員（護理長／麻醉／體循）。</summary>
    [HttpPut("shiftstaff/{id:int}")]
    public async Task<IActionResult> UpdateShiftStaff(int id, [FromBody] OrShiftStaffUpsertRequest req, CancellationToken ct = default)
        => await _ward.UpdateShiftStaffAsync(id, req, ct) ? Ok(await _ward.GetShiftStaffByIdAsync(id, ct)) : NotFound();
    /// <summary>刪除OR 手術派班班別人員（護理長／麻醉／體循）。</summary>
    [HttpDelete("shiftstaff/{id:int}")]
    public async Task<IActionResult> DeleteShiftStaff(int id, CancellationToken ct = default)
        => await _ward.DeleteShiftStaffAsync(id, ct) ? NoContent() : NotFound();

    // 房×班 刷手/流動 CRUD（後台）
    /// <summary>查詢某單位OR 手術派班刀房人員清單。</summary>
    [HttpGet("{unitCode}/shiftroom")]
    public async Task<IActionResult> GetShiftRoom(string unitCode, [FromQuery] bool includeAll = false, CancellationToken ct = default)
        => Ok(await _ward.GetShiftRoomAsync(unitCode, includeAll, ct));
    /// <summary>取得單筆OR 手術派班刀房人員。</summary>
    [HttpGet("shiftroom/{id:int}")]
    public async Task<IActionResult> GetShiftRoomById(int id, CancellationToken ct = default)
    { var x = await _ward.GetShiftRoomByIdAsync(id, ct); return x is null ? NotFound() : Ok(x); }
    /// <summary>新增OR 手術派班刀房人員。</summary>
    [HttpPost("shiftroom")]
    public async Task<IActionResult> CreateShiftRoom([FromBody] OrShiftRoomUpsertRequest req, CancellationToken ct = default)
    { var id = await _ward.CreateShiftRoomAsync(req, ct); return CreatedAtAction(nameof(GetShiftRoomById), new { id }, await _ward.GetShiftRoomByIdAsync(id, ct)); }
    /// <summary>更新OR 手術派班刀房人員。</summary>
    [HttpPut("shiftroom/{id:int}")]
    public async Task<IActionResult> UpdateShiftRoom(int id, [FromBody] OrShiftRoomUpsertRequest req, CancellationToken ct = default)
        => await _ward.UpdateShiftRoomAsync(id, req, ct) ? Ok(await _ward.GetShiftRoomByIdAsync(id, ct)) : NotFound();
    /// <summary>刪除OR 手術派班刀房人員。</summary>
    [HttpDelete("shiftroom/{id:int}")]
    public async Task<IActionResult> DeleteShiftRoom(int id, CancellationToken ct = default)
        => await _ward.DeleteShiftRoomAsync(id, ct) ? NoContent() : NotFound();

    // 特殊交班 CRUD（後台）；list 路由用 handover-list 以避免與 board 的 or/handover 衝突
    /// <summary>查詢某單位OR 特殊交班清單。</summary>
    [HttpGet("{unitCode}/handover-list")]
    public async Task<IActionResult> GetHandoverList(string unitCode, [FromQuery] bool includeAll = false, CancellationToken ct = default)
        => Ok(await _ward.GetHandoverAsync(unitCode, includeAll, ct));
    /// <summary>取得單筆OR 特殊交班。</summary>
    [HttpGet("handover/{id:int}")]
    public async Task<IActionResult> GetHandoverById(int id, CancellationToken ct = default)
    { var x = await _ward.GetHandoverByIdAsync(id, ct); return x is null ? NotFound() : Ok(x); }
    /// <summary>新增OR 特殊交班。</summary>
    [HttpPost("handover")]
    public async Task<IActionResult> CreateHandover([FromBody] OrHandoverUpsertRequest req, CancellationToken ct = default)
    { var id = await _ward.CreateHandoverAsync(req, ct); return CreatedAtAction(nameof(GetHandoverById), new { id }, await _ward.GetHandoverByIdAsync(id, ct)); }
    /// <summary>更新OR 特殊交班。</summary>
    [HttpPut("handover/{id:int}")]
    public async Task<IActionResult> UpdateHandover(int id, [FromBody] OrHandoverUpsertRequest req, CancellationToken ct = default)
        => await _ward.UpdateHandoverAsync(id, req, ct) ? Ok(await _ward.GetHandoverByIdAsync(id, ct)) : NotFound();
    /// <summary>刪除OR 特殊交班。</summary>
    [HttpDelete("handover/{id:int}")]
    public async Task<IActionResult> DeleteHandover(int id, CancellationToken ct = default)
        => await _ward.DeleteHandoverAsync(id, ct) ? NoContent() : NotFound();

    // ── 各站頁首單位資訊（主任/護理；白板讀取 ＋ 後台 upsert）──────────
    /// <summary>取某站頁首單位資訊（主任/護理 標籤＋姓名）。</summary>
    [HttpGet("{unitCode}/info")]
    public async Task<IActionResult> GetUnitInfo(string unitCode, CancellationToken ct = default)
        => Ok(await _ward.GetUnitInfoAsync(unitCode, ct));

    /// <summary>後台編輯頁首單位資訊（以 UnitCode upsert）。</summary>
    [HttpPut("info")]
    public async Task<IActionResult> UpsertUnitInfo([FromBody] UnitInfoUpsertRequest req, CancellationToken ct = default)
    {
        await _ward.UpsertUnitInfoAsync(req, ct);
        return Ok(await _ward.GetUnitInfoAsync(req.UnitCode, ct));
    }

    // ── 檢查/會診（W52/ICU/ER 看板 ＋ 後台 CRUD；自建）──────────────
    /// <summary>看板：某站檢查/會診，依 Kind 拆成 exams/consults（camelCase）。</summary>
    [HttpGet("{unitCode}/exam")]
    public async Task<IActionResult> GetExamConsult(string unitCode, CancellationToken ct = default)
    {
        // 會診：維持自建（WardExamConsult）。看板只顯示「設定時間（UpdatedAt，最後一次於後台設定）」起 24 小時內者；逾時自動下板。
        var cutoff = DateTime.Now.AddHours(-24);
        var rows = (await _ward.GetExamConsultAsync(unitCode, false, ct))
            .Where(r => r.UpdatedAt > cutoff)
            .ToList();

        // 檢查：改抽院方 Board_Examine（每列一項檢查；尚無會診）。只顯示「該站在床病人」的檢查。
        // 病房代碼對應：W52→W52、ICU→AICU(＋CICU)、ER→MER；在床名單以病歷號比對。
        var (examWards, inBedHis) = await ExamContextAsync(unitCode, ct);
        // 院方全院檢查清單：45 秒快取（三站 /exam 共用），院方逾時則沿用上次成功值。
        var examList = await FreshOrStaleAsync("exam:board:examine", 45, () => _board.GetExamineAsync(ct));
        // 已結案（完成68／完報64）超過 24h 才隱藏；未結案（執行中/未執行/未排程/已排程/初報/取消醫囑）不論多舊都顯示。
        var examCut = DateTime.Now.AddHours(-24);
        // ICU／W52：時間大的在前（新→舊）；其餘站：時間小的在前（舊→新）
        var examUnit = (unitCode ?? "").Trim().ToUpperInvariant();
        var descExam = examUnit == "ICU" || examUnit == "W52";
        var examBase = examList
            .Where(x => examWards.Contains((x.Ward ?? "").Trim())
                     && !string.IsNullOrWhiteSpace(x.Hhisnum)
                     && inBedHis.Contains(x.Hhisnum!.Trim()))
            .Where(x =>
            {
                var code = (x.Status ?? "").Trim();
                if (code != "68" && code != "64") return true;                  // 未結案：一律顯示
                return ParseExamDateTime(x.ExamDate, x.ExamTime) is { } t && t >= examCut;   // 已結案：僅近 24h
            })
            // 去重：院方會回完全重複列（同病歷號｜檢查名稱｜執行日期｜執行時間）
            .GroupBy(x => $"{(x.Hhisnum ?? "").Trim()}|{(x.ExamName ?? "").Trim()}|{(x.ExamDate ?? "").Trim()}|{(x.ExamTime ?? "").Trim()}")
            .Select(g => g.First());
        // 依 執行日期＋執行時間 排序；空日期一律墊底（升冪用 9999、降冪用 0000 皆排最後），次鍵床號
        var examOrdered = descExam
            ? examBase.OrderByDescending(x => { var d = FormatExamDate(x.ExamDate); return string.IsNullOrEmpty(d) ? "0000-00-00" : d; })
                      .ThenByDescending(x => (x.ExamTime ?? "").Trim())
                      .ThenBy(x => (x.Hbed ?? "").Trim())
            : examBase.OrderBy(x => { var d = FormatExamDate(x.ExamDate); return string.IsNullOrEmpty(d) ? "9999-99-99" : d; })
                      .ThenBy(x => (x.ExamTime ?? "").Trim())
                      .ThenBy(x => (x.Hbed ?? "").Trim());
        var exams = examOrdered.Select(x => new
        {
            bedId = (x.Hbed ?? "").Trim(), patientName = MaskName(x.Hnamec), gender = (string?)null,
            examName = (x.ExamName ?? "").Trim(), scheduledDate = FormatExamDate(x.ExamDate), timeSlot = (x.ExamTime ?? "").Trim(),
            status = MapExamStatus(x.Status), notes = ""
        });

        var consultBase = rows.Where(r => r.Kind == "會診");
        // 依會診完成時間排序；未完成（無完成時間）一律墊底
        var consultOrdered = descExam
            ? consultBase.OrderByDescending(r => string.IsNullOrWhiteSpace(r.CompletedTime) ? "0000-00-00 00:00" : r.CompletedTime)
            : consultBase.OrderBy(r => string.IsNullOrWhiteSpace(r.CompletedTime) ? "9999-99-99 99:99" : r.CompletedTime);
        var consults = consultOrdered.Select(r => new
        {
            bedId = r.BedId, patientName = MaskName(r.PatientName), gender = r.Gender, consultDept = r.ItemName,
            consultDoctor = r.Doctor, completedTime = r.CompletedTime, status = r.Status, notes = r.Notes
        });
        return Ok(new { exams, consults });
    }

    /// <summary>
    /// 檢查看板：依站別取得「Board_Examine 病房代碼集合」與「在床病歷號集合」（供過濾為只在床病人）。
    /// 在床名單 30 秒快取＋容錯：院方在床查詢逾時（回空）時沿用上次成功名單，避免檢查被濾成 0（閃 0）。
    /// </summary>
    private async Task<(HashSet<string> wards, HashSet<string> inBedHis)> ExamContextAsync(string unitCode, CancellationToken ct)
    {
        var u = (unitCode ?? "").Trim().ToUpperInvariant();
        var wards = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        Func<Task<List<string>>> fetch;
        switch (u)
        {
            case "ICU":
                wards.Add("AICU"); wards.Add("CICU");
                fetch = async () =>
                {
                    var h = new List<string>();
                    foreach (var o in await SafeBoardAsync("AICU", ct)) if (!string.IsNullOrWhiteSpace(o.Hhisnum)) h.Add(o.Hhisnum!.Trim());
                    foreach (var o in await SafeBoardAsync("CICU", ct)) if (!string.IsNullOrWhiteSpace(o.Hhisnum)) h.Add(o.Hhisnum!.Trim());
                    return h;
                };
                break;
            case "ER":
                wards.Add("MER");
                fetch = async () =>
                {
                    var h = new List<string>();
                    try { foreach (var o in await _board.GetErListAsync(ct)) if (!string.IsNullOrWhiteSpace(o.Hhisnum)) h.Add(o.Hhisnum!.Trim()); } catch { }
                    return h;
                };
                break;
            default: // W52
                wards.Add("W52");
                fetch = async () =>
                {
                    var h = new List<string>();
                    foreach (var o in await SafeBoardAsync("W52", ct)) if (!string.IsNullOrWhiteSpace(o.Hhisnum)) h.Add(o.Hhisnum!.Trim());
                    return h;
                };
                break;
        }
        var list = await FreshOrStaleAsync($"exam:census:{u}", 30, fetch);
        return (wards, new HashSet<string>(list, StringComparer.OrdinalIgnoreCase));
    }

    /// <summary>Board_Examine 狀態代碼→顯示。31 未執行、32 未排程、34 已排程；其他顯示原碼。</summary>
    private static string MapExamStatus(string? code) => (code ?? "").Trim() switch
    {
        "68" => "完成", "64" => "完報", "31" => "未執行", "38" => "執行中",
        "82" => "取消醫囑", "32" => "未排程", "34" => "已排程", "62" => "初報",
        var s => s
    };

    /// <summary>執行日期(ISO)＋執行時間(HH:mm) → DateTime；日期無法解析回 null。供 24h 窗過濾。</summary>
    private static DateTime? ParseExamDateTime(string? date, string? time)
    {
        if (!DateTime.TryParse((date ?? "").Trim(), CultureInfo.InvariantCulture, DateTimeStyles.None, out var d)) return null;
        var dt = d.Date;
        var p = (time ?? "").Trim().Split(':');
        if (p.Length >= 2 && int.TryParse(p[0], out var hh) && int.TryParse(p[1], out var mm)) dt = dt.AddHours(hh).AddMinutes(mm);
        return dt;
    }

    /// <summary>轉入日期（ISO/含 T）→ yyyy-MM-dd；無法解析則取前 10 碼或原字串。</summary>
    private static string FormatExamDate(string? raw)
    {
        var s = (raw ?? "").Trim();
        if (string.IsNullOrEmpty(s)) return "";
        return DateTime.TryParse(s, out var d) ? d.ToString("yyyy-MM-dd") : (s.Length >= 10 ? s.Substring(0, 10) : s);
    }

    // 後台 CRUD
    /// <summary>查詢某單位檢查／會診明細清單。</summary>
    [HttpGet("{unitCode}/examconsult")]
    public async Task<IActionResult> GetExamConsultList(string unitCode, [FromQuery] bool includeAll = true, CancellationToken ct = default)
        => Ok(await _ward.GetExamConsultAsync(unitCode, includeAll, ct));
    /// <summary>取得單筆檢查／會診明細。</summary>
    [HttpGet("examconsult/{id:int}")]
    public async Task<IActionResult> GetExamConsultById(int id, CancellationToken ct = default)
    { var x = await _ward.GetExamConsultByIdAsync(id, ct); return x is null ? NotFound() : Ok(x); }
    /// <summary>新增檢查／會診明細。</summary>
    [HttpPost("examconsult")]
    public async Task<IActionResult> CreateExamConsult([FromBody] WardExamConsultUpsertRequest req, CancellationToken ct = default)
    { var id = await _ward.CreateExamConsultAsync(req, ct); return CreatedAtAction(nameof(GetExamConsultById), new { id }, await _ward.GetExamConsultByIdAsync(id, ct)); }
    /// <summary>更新檢查／會診明細。</summary>
    [HttpPut("examconsult/{id:int}")]
    public async Task<IActionResult> UpdateExamConsult(int id, [FromBody] WardExamConsultUpsertRequest req, CancellationToken ct = default)
        => await _ward.UpdateExamConsultAsync(id, req, ct) ? Ok(await _ward.GetExamConsultByIdAsync(id, ct)) : NotFound();
    /// <summary>刪除檢查／會診明細。</summary>
    [HttpDelete("examconsult/{id:int}")]
    public async Task<IActionResult> DeleteExamConsult(int id, CancellationToken ct = default)
        => await _ward.DeleteExamConsultAsync(id, ct) ? NoContent() : NotFound();

    // ── ICU 抗生素（自建；看板＋後台共用，以病歷號掛載）──────────────
    /// <summary>看板＋後台共用：某站抗生素列（camelCase；includeAll=false 僅啟用）。前端以 hhisnum 對應在床病人。</summary>
    [HttpGet("{unitCode}/antibiotic")]
    public async Task<IActionResult> GetAntibiotic(string unitCode, [FromQuery] bool includeAll = false, CancellationToken ct = default)
        => Ok(await _ward.GetAntibioticAsync(unitCode, includeAll, ct));
    /// <summary>取得單筆ICU 抗生素明細。</summary>
    [HttpGet("antibiotic/{id:int}")]
    public async Task<IActionResult> GetAntibioticById(int id, CancellationToken ct = default)
    { var x = await _ward.GetAntibioticByIdAsync(id, ct); return x is null ? NotFound() : Ok(x); }
    /// <summary>新增ICU 抗生素明細。</summary>
    [HttpPost("antibiotic")]
    public async Task<IActionResult> CreateAntibiotic([FromBody] IcuAntibioticUpsertRequest req, CancellationToken ct = default)
    { var id = await _ward.CreateAntibioticAsync(req, ct); return CreatedAtAction(nameof(GetAntibioticById), new { id }, await _ward.GetAntibioticByIdAsync(id, ct)); }
    /// <summary>更新ICU 抗生素明細。</summary>
    [HttpPut("antibiotic/{id:int}")]
    public async Task<IActionResult> UpdateAntibiotic(int id, [FromBody] IcuAntibioticUpsertRequest req, CancellationToken ct = default)
        => await _ward.UpdateAntibioticAsync(id, req, ct) ? Ok(await _ward.GetAntibioticByIdAsync(id, ct)) : NotFound();
    /// <summary>刪除ICU 抗生素明細。</summary>
    [HttpDelete("antibiotic/{id:int}")]
    public async Task<IActionResult> DeleteAntibiotic(int id, CancellationToken ct = default)
        => await _ward.DeleteAntibioticAsync(id, ct) ? NoContent() : NotFound();

    /// <summary>後台補「首次給藥時間」：依自然鍵(病歷號+藥名+開始時間) upsert 覆蓋（供即時用藥帶出補填）。</summary>
    [HttpPost("{unitCode}/antibiotic/firstdose")]
    public async Task<IActionResult> SaveAntibioticFirstDose(string unitCode, [FromBody] IcuAntibioticUpsertRequest req, CancellationToken ct = default)
    {
        await _ward.UpsertAntibioticFirstDoseAsync(unitCode, req.Hhisnum, req.DrugName, req.StartDateTime, req.EndDateTime, req.FirstDoseDateTime, ct);
        return Ok(new { message = "已儲存" });
    }

    /// <summary>看板：ICU 實際用藥（自院方 Board_AICUUD 專用端點帶入，與病室動態 census 解耦）。
    /// 欄名雖為「抗生素」實為全部用藥、暫不過濾藥品種類；僅取「使用中」(結束日 ≥ 今日或無結束日) 避免列出大量歷史。
    /// 前端以病歷號對在床病人顯示（非在床者自然不出現），故此處不需 census；回傳 camelCase 形狀不變，前端免改。</summary>
    [HttpGet("{unitCode}/antibiotic/live")]
    public async Task<IActionResult> GetAntibioticLive(string unitCode, CancellationToken ct = default)
    {
        if (unitCode.ToUpperInvariant() != "ICU") return Ok(Array.Empty<object>());
        var uds = await _board.GetAicuUdAsync(ct);
        // 首次給藥時間 overlay（後台補填）：以 病歷號|藥名|開始時間|結束時間 為鍵併回
        // （含結束時間，才能區分同藥同開始、僅結束不同的兩筆，避免補填一筆連動另一筆）
        var ovByKey = (await _ward.GetAntibioticAsync("ICU", false, ct))
            .GroupBy(a => $"{(a.Hhisnum ?? "").Trim()}|{(a.DrugName ?? "").Trim()}|{(a.StartDateTime ?? "").Trim()}|{(a.EndDateTime ?? "").Trim()}")
            // 同鍵有殘留多列時取最後更新且首次時間非空者，避免舊的空值列蓋掉新填的值
            .ToDictionary(g => g.Key, g => g.OrderByDescending(a => !string.IsNullOrWhiteSpace(a.FirstDoseDateTime))
                                            .ThenByDescending(a => a.UpdatedAt).ThenByDescending(a => a.Id)
                                            .First().FirstDoseDateTime, StringComparer.OrdinalIgnoreCase);
        var today = DateTime.Today;
        var rows = new List<object>();
        int id = 0;
        foreach (var u in uds)
        {
            if (string.IsNullOrWhiteSpace(u.Hhisnum) || string.IsNullOrWhiteSpace(u.Drug)) continue;
            var end = TryDate(u.EndDate);
            if (end is { } ed && ed.Date < today) continue;   // 只留使用中（含未來/未結束）
            var startDt = JoinDateTime(u.StartDate, u.StartTime);
            var endDt = JoinDateTime(u.EndDate, u.EndTime);
            var key = $"{u.Hhisnum!.Trim()}|{u.Drug!.Trim()}|{(startDt ?? "").Trim()}|{(endDt ?? "").Trim()}";
            rows.Add(new
            {
                id = ++id, hhisnum = u.Hhisnum!.Trim(), drugName = u.Drug!.Trim(),
                startDateTime = startDt,
                firstDoseDateTime = ovByKey.TryGetValue(key, out var fd) ? fd : null,   // 後台補填（overlay）；院方未提供
                endDateTime = endDt,
            });
        }
        return Ok(rows);
    }

    private static DateTime? TryDate(string? s) => DateTime.TryParse((s ?? "").Trim(), out var d) ? d : (DateTime?)null;
    private static string? JoinDateTime(string? date, string? time)
    {
        var d = TryDate(date);
        if (d is null) return null;
        var t = (time ?? "").Trim();
        if (t.Length >= 5) t = t.Substring(0, 5);   // HH:mm:ss → HH:mm
        return string.IsNullOrWhiteSpace(t) ? d.Value.ToString("yyyy-MM-dd") : $"{d.Value:yyyy-MM-dd} {t}";
    }

    // ── 照護提醒（自建；看板＋後台共用，W52）──────────────────────
    /// <summary>看板＋後台共用：某站照護提醒（camelCase，含責任護理師姓名；includeAll=false 僅啟用）。</summary>
    [HttpGet("{unitCode}/care-reminder")]
    public async Task<IActionResult> GetCareReminder(string unitCode, [FromQuery] bool includeAll = false, CancellationToken ct = default)
    {
        var rows = (await _ward.GetCareReminderAsync(unitCode, includeAll, ct)).ToList();
        // includeAll=false＝公開看板顯示 → 病人姓名去識別化；includeAll=true＝後台管理 → 保留真實姓名
        if (!includeAll) foreach (var r in rows) r.PatientName = MaskName(r.PatientName);
        return Ok(rows);
    }
    /// <summary>取得單筆照護提醒。</summary>
    [HttpGet("care-reminder/{id:int}")]
    public async Task<IActionResult> GetCareReminderById(int id, CancellationToken ct = default)
    { var x = await _ward.GetCareReminderByIdAsync(id, ct); return x is null ? NotFound() : Ok(x); }
    /// <summary>新增照護提醒。</summary>
    [HttpPost("care-reminder")]
    public async Task<IActionResult> CreateCareReminder([FromBody] CareReminderUpsertRequest req, CancellationToken ct = default)
    { var id = await _ward.CreateCareReminderAsync(req, ct); return CreatedAtAction(nameof(GetCareReminderById), new { id }, await _ward.GetCareReminderByIdAsync(id, ct)); }
    /// <summary>更新照護提醒。</summary>
    [HttpPut("care-reminder/{id:int}")]
    public async Task<IActionResult> UpdateCareReminder(int id, [FromBody] CareReminderUpsertRequest req, CancellationToken ct = default)
        => await _ward.UpdateCareReminderAsync(id, req, ct) ? Ok(await _ward.GetCareReminderByIdAsync(id, ct)) : NotFound();
    /// <summary>刪除照護提醒。</summary>
    [HttpDelete("care-reminder/{id:int}")]
    public async Task<IActionResult> DeleteCareReminder(int id, CancellationToken ct = default)
        => await _ward.DeleteCareReminderAsync(id, ct) ? NoContent() : NotFound();

    // ═══════════════ 人員管理（v14：人員/角色/排班/床位指派/查房/交班/照護團隊）═══════════════

    // ── 人員主檔 ──
    /// <summary>查詢人員／帳號清單。</summary>
    [HttpGet("personnel")]
    public async Task<IActionResult> GetStaff([FromQuery] bool includeAll = true, CancellationToken ct = default)
        => Ok(await _staff.GetStaffAsync(includeAll, ct));
    /// <summary>取得單筆人員／帳號。</summary>
    [HttpGet("personnel/{id:int}")]
    public async Task<IActionResult> GetStaffById(int id, CancellationToken ct = default)
    { var x = await _staff.GetStaffByIdAsync(id, ct); return x is null ? NotFound() : Ok(x); }
    /// <summary>新增人員／帳號。</summary>
    [HttpPost("personnel")]
    public async Task<IActionResult> CreateStaff([FromBody] StaffUpsertRequest req, CancellationToken ct = default)
    {
        var id = await _staff.CreateStaffAsync(req, ct);
        // 連動建立 AD 帳號（best-effort；系統層/單位層新增皆適用；初始密碼 Kmsh@員編；已存在則補設密碼＋啟用）
        if (_ldapAdmin.Enabled && !string.IsNullOrWhiteSpace(req.EmployeeNo))
            try { var e = req.EmployeeNo.Trim(); _ldapAdmin.CreateUser(e, $"Kmsh@{e}"); if (!req.IsActive) _ldapAdmin.SetEnabled(e, false); }
            catch (Exception ex) { _logger.LogWarning(ex, "建 Staff 後連動建 AD 失敗（{Emp}）", req.EmployeeNo); }
        return CreatedAtAction(nameof(GetStaffById), new { id }, await _staff.GetStaffByIdAsync(id, ct));
    }
    /// <summary>更新人員／帳號。</summary>
    [HttpPut("personnel/{id:int}")]
    public async Task<IActionResult> UpdateStaff(int id, [FromBody] StaffUpsertRequest req, CancellationToken ct = default)
    {
        var before = await _staff.GetStaffByIdAsync(id, ct);   // 取舊員編以偵測改名
        if (before is null) return NotFound();
        if (!await _staff.UpdateStaffAsync(id, req, ct)) return NotFound();
        // AD 連動（best-effort）：員編變更→改名；再依 IsActive 啟用/停用
        if (_ldapAdmin.Enabled && !string.IsNullOrWhiteSpace(req.EmployeeNo))
        {
            var newEmp = req.EmployeeNo.Trim();
            var oldEmp = before.EmployeeNo?.Trim();
            try
            {
                if (!string.IsNullOrWhiteSpace(oldEmp) && !string.Equals(oldEmp, newEmp, StringComparison.OrdinalIgnoreCase))
                    _ldapAdmin.RenameUser(oldEmp!, newEmp);
                _ldapAdmin.SetEnabled(newEmp, req.IsActive);
            }
            catch (Exception ex) { _logger.LogWarning(ex, "AD 連動失敗（{Old}→{New}）", oldEmp, newEmp); }
        }
        return Ok(await _staff.GetStaffByIdAsync(id, ct));
    }
    /// <summary>刪除人員／帳號。</summary>
    [HttpDelete("personnel/{id:int}")]
    public async Task<IActionResult> DeleteStaff(int id, CancellationToken ct = default)
    {
        var s = await _staff.GetStaffByIdAsync(id, ct);   // 取員編以停用 AD
        if (!await _staff.DeleteStaffAsync(id, ct)) return NotFound();
        // 刪帳號 → AD 帳號「停用」（不實際刪除，保留軌跡、可復職）
        if (_ldapAdmin.Enabled && !string.IsNullOrWhiteSpace(s?.EmployeeNo))
            try { _ldapAdmin.SetEnabled(s!.EmployeeNo.Trim(), false); }
            catch (Exception ex) { _logger.LogWarning(ex, "刪 Staff 後 AD 停用失敗（{Emp}）", s.EmployeeNo); }
        return NoContent();
    }

    // ── AD 帳號 / 密碼（連動 AD LDS）──────────────────────────────
    /// <summary>管理員建立/補建該員 AD 帳號並設初始密碼（省略＝Kmsh@員編）、啟用。</summary>
    [HttpPost("personnel/{id:int}/ad-account")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateAdAccount(int id, [FromBody] AdAccountRequest? req, CancellationToken ct = default)
    {
        if (!_ldapAdmin.Enabled) return BadRequest(new { message = "AD 認證未啟用" });
        var s = await _staff.GetStaffByIdAsync(id, ct);
        if (s is null || string.IsNullOrWhiteSpace(s.EmployeeNo)) return NotFound();
        var pwd = string.IsNullOrWhiteSpace(req?.Password) ? $"Kmsh@{s.EmployeeNo.Trim()}" : req!.Password!.Trim();
        try { _ldapAdmin.CreateUser(s.EmployeeNo.Trim(), pwd); return Ok(new { message = $"AD 帳號已建立：{s.EmployeeNo}" }); }
        catch (LdapAdminException ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>管理員重設某員密碼（寫回 AD）。</summary>
    [HttpPost("personnel/{id:int}/reset-password")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ResetPassword(int id, [FromBody] PasswordResetRequest req, CancellationToken ct = default)
    {
        if (!_ldapAdmin.Enabled) return BadRequest(new { message = "AD 認證未啟用" });
        if (string.IsNullOrWhiteSpace(req.NewPassword)) return BadRequest(new { message = "請輸入新密碼" });
        var s = await _staff.GetStaffByIdAsync(id, ct);
        if (s is null || string.IsNullOrWhiteSpace(s.EmployeeNo)) return NotFound();
        try { _ldapAdmin.ResetPassword(s.EmployeeNo.Trim(), req.NewPassword.Trim()); return Ok(new { message = "密碼已重設" }); }
        catch (LdapAdminException ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>使用者自助改密：員編取自 token，先驗舊密再寫新密（防改他人）。</summary>
    [HttpPost("personnel/change-password")]
    [Authorize]
    public IActionResult ChangePassword([FromBody] PasswordChangeRequest req)
    {
        if (!_ldapAdmin.Enabled) return BadRequest(new { message = "AD 認證未啟用" });
        var emp = User.Identity?.Name;
        if (string.IsNullOrWhiteSpace(emp)) return Unauthorized();
        if (string.IsNullOrWhiteSpace(req.NewPassword)) return BadRequest(new { message = "請輸入新密碼" });
        if (!_ldap.Authenticate(emp, req.OldPassword ?? "", out var err)) return BadRequest(new { message = err ?? "舊密碼錯誤" });
        try { _ldapAdmin.ResetPassword(emp, req.NewPassword.Trim()); return Ok(new { message = "密碼已更新" }); }
        catch (LdapAdminException ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>驗證目前 token 並回最新身分（前端啟動時呼叫；token 過期/無效回 401）。</summary>
    [HttpGet("personnel/me")]
    [Authorize]
    public async Task<IActionResult> Me(CancellationToken ct = default)
    {
        var empNo = User.Identity?.Name;
        if (string.IsNullOrWhiteSpace(empNo)) return Unauthorized();
        var s = await _staff.GetStaffByEmployeeNoAsync(empNo, ct);
        if (s is null) return Unauthorized(new { message = "查無此員編或已停用" });
        var roles = (await _staff.GetUnitRolesAsync(s.Id, null, false, ct)).ToList();
        var allUnits = new[] { "W52", "ICU", "OR", "ER" };
        var manageUnits = s.IsAdmin ? allUnits
            : roles.Where(r => r.IsManager).Select(r => r.UnitCode).Distinct().ToArray();
        return Ok(new
        {
            staffId = s.Id, employeeNo = s.EmployeeNo, name = s.Name, isAdmin = s.IsAdmin,
            units = manageUnits,
            roles = roles.Select(r => new { r.UnitCode, r.Role, r.IsManager, r.Department })
        });
    }

    /// <summary>
    /// 登入：以 LDAP（LLDAP@101）驗帳密，成功後以員編對應本地 Staff/StaffUnitRole 取權限。
    /// LDAP 未啟用（過渡期）時不驗密碼、僅以員編查在職人員。無論成敗寫登入稽核。
    /// 成功回傳 JWT token；後續修改類請求（POST/PUT/DELETE）皆須帶 Authorization: Bearer {token}。
    /// </summary>
    [HttpPost("personnel/login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest req, CancellationToken ct = default)
    {
        var empNo = req.EmployeeNo?.Trim() ?? "";
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        if (string.IsNullOrWhiteSpace(empNo))
            return BadRequest(new { message = "請輸入員編" });

        // 1) 認證（LDAP bind；未啟用時為員編-only 過渡）
        if (!_ldap.Authenticate(empNo, req.Password ?? "", out var authErr))
        {
            await _staff.AddLoginAuditAsync(empNo, false, ip, "login", ct);
            return Unauthorized(new { message = authErr ?? "帳號或密碼錯誤" });
        }

        // 2) 授權：以員編對應本地在職人員 → 可管理單位 / isAdmin
        var s = await _staff.GetStaffByEmployeeNoAsync(empNo, ct);
        if (s is null)
        {
            await _staff.AddLoginAuditAsync(empNo, false, ip, "login", ct);
            return Unauthorized(new { message = "查無此員編或已停用" });
        }
        var roles = (await _staff.GetUnitRolesAsync(s.Id, null, false, ct)).ToList();
        var allUnits = new[] { "W52", "ICU", "OR", "ER" };
        var manageUnits = s.IsAdmin ? allUnits
            : roles.Where(r => r.IsManager).Select(r => r.UnitCode).Distinct().ToArray();

        await _staff.AddLoginAuditAsync(empNo, true, ip, "login", ct);
        var token = _jwt.CreateToken(s.Id, s.EmployeeNo ?? empNo, s.Name ?? empNo, s.IsAdmin, manageUnits);
        return Ok(new
        {
            token,
            staffId = s.Id, employeeNo = s.EmployeeNo, name = s.Name, isAdmin = s.IsAdmin,
            units = manageUnits,
            roles = roles.Select(r => new { r.UnitCode, r.Role, r.IsManager, r.Department })
        });
    }

    /// <summary>登出：寫登出稽核。免驗 token（token 已過期也允許記登出）。</summary>
    [HttpPost("personnel/logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout([FromBody] LogoutRequest req, CancellationToken ct = default)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        await _staff.AddLoginAuditAsync(req.EmployeeNo?.Trim(), true, ip, "logout", ct);
        return Ok(new { ok = true });
    }

    // ── 人員×單位×角色 ──
    /// <summary>查詢人員單位角色（照護團隊分組）清單。</summary>
    [HttpGet("unitrole")]
    public async Task<IActionResult> GetUnitRoles([FromQuery] int? staffId, [FromQuery] string? unit, [FromQuery] bool includeAll = true, CancellationToken ct = default)
        => Ok(await _staff.GetUnitRolesAsync(staffId, unit, includeAll, ct));
    /// <summary>取得單筆人員單位角色（照護團隊分組）。</summary>
    [HttpGet("unitrole/{id:int}")]
    public async Task<IActionResult> GetUnitRoleById(int id, CancellationToken ct = default)
    { var x = await _staff.GetUnitRoleByIdAsync(id, ct); return x is null ? NotFound() : Ok(x); }
    /// <summary>新增人員單位角色（照護團隊分組）。</summary>
    [HttpPost("unitrole")]
    public async Task<IActionResult> CreateUnitRole([FromBody] StaffUnitRoleUpsertRequest req, CancellationToken ct = default)
    { var id = await _staff.CreateUnitRoleAsync(req, ct); return CreatedAtAction(nameof(GetUnitRoleById), new { id }, await _staff.GetUnitRoleByIdAsync(id, ct)); }
    /// <summary>更新人員單位角色（照護團隊分組）。</summary>
    [HttpPut("unitrole/{id:int}")]
    public async Task<IActionResult> UpdateUnitRole(int id, [FromBody] StaffUnitRoleUpsertRequest req, CancellationToken ct = default)
        => await _staff.UpdateUnitRoleAsync(id, req, ct) ? Ok(await _staff.GetUnitRoleByIdAsync(id, ct)) : NotFound();
    /// <summary>刪除人員單位角色（照護團隊分組）。</summary>
    [HttpDelete("unitrole/{id:int}")]
    public async Task<IActionResult> DeleteUnitRole(int id, CancellationToken ct = default)
        => await _staff.DeleteUnitRoleAsync(id, ct) ? NoContent() : NotFound();

    // ── 全院共用主檔：科別 Department（先建科別、再建醫師）────────────
    /// <summary>查詢科別主檔清單。</summary>
    [HttpGet("department")]
    public async Task<IActionResult> GetDepartments([FromQuery] bool includeAll = true, CancellationToken ct = default)
        => Ok(await _master.GetDepartmentsAsync(includeAll, ct));
    /// <summary>新增科別主檔。</summary>
    [HttpPost("department")]
    public async Task<IActionResult> CreateDepartment([FromBody] DepartmentUpsertRequest req, CancellationToken ct = default)
    { var id = await _master.CreateDepartmentAsync(req, ct); return Ok(new { id }); }
    /// <summary>更新科別主檔。</summary>
    [HttpPut("department/{id:int}")]
    public async Task<IActionResult> UpdateDepartment(int id, [FromBody] DepartmentUpsertRequest req, CancellationToken ct = default)
        => await _master.UpdateDepartmentAsync(id, req, ct) ? NoContent() : NotFound();
    /// <summary>刪除科別主檔。</summary>
    [HttpDelete("department/{id:int}")]
    public async Task<IActionResult> DeleteDepartment(int id, CancellationToken ct = default)
    {
        var (deleted, reason) = await _master.DeleteDepartmentAsync(id, ct);
        if (deleted) return NoContent();
        return reason is null ? NotFound() : Conflict(new { message = reason });   // 已被醫師使用 → 409＋原因
    }

    // ── 全院共用主檔：醫師 Doctor（DeptCode 對應 Department.Code）─────
    /// <summary>查詢醫師主檔清單。</summary>
    [HttpGet("doctor")]
    public async Task<IActionResult> GetDoctors([FromQuery] bool includeAll = true, [FromQuery] string? deptCode = null, CancellationToken ct = default)
        => Ok(await _master.GetDoctorsAsync(includeAll, deptCode, ct));
    /// <summary>新增醫師主檔。</summary>
    [HttpPost("doctor")]
    public async Task<IActionResult> CreateDoctor([FromBody] DoctorUpsertRequest req, CancellationToken ct = default)
    { var id = await _master.CreateDoctorAsync(req, ct); return Ok(new { id }); }
    /// <summary>更新醫師主檔。</summary>
    [HttpPut("doctor/{id:int}")]
    public async Task<IActionResult> UpdateDoctor(int id, [FromBody] DoctorUpsertRequest req, CancellationToken ct = default)
        => await _master.UpdateDoctorAsync(id, req, ct) ? NoContent() : NotFound();
    /// <summary>刪除醫師主檔。</summary>
    [HttpDelete("doctor/{id:int}")]
    public async Task<IActionResult> DeleteDoctor(int id, CancellationToken ct = default)
        => await _master.DeleteDoctorAsync(id, ct) ? NoContent() : NotFound();

    // ── 全院共用主檔：照服員 CareAide ─────
    /// <summary>查詢照服員主檔清單。</summary>
    [HttpGet("care-aide")]
    public async Task<IActionResult> GetCareAides([FromQuery] bool includeAll = true, CancellationToken ct = default)
        => Ok(await _master.GetCareAidesAsync(includeAll, ct));
    /// <summary>新增照服員主檔。</summary>
    [HttpPost("care-aide")]
    public async Task<IActionResult> CreateCareAide([FromBody] CareAideUpsertRequest req, CancellationToken ct = default)
    { var id = await _master.CreateCareAideAsync(req, ct); return Ok(new { id }); }
    /// <summary>更新照服員主檔。</summary>
    [HttpPut("care-aide/{id:int}")]
    public async Task<IActionResult> UpdateCareAide(int id, [FromBody] CareAideUpsertRequest req, CancellationToken ct = default)
        => await _master.UpdateCareAideAsync(id, req, ct) ? NoContent() : NotFound();
    /// <summary>刪除照服員主檔。</summary>
    [HttpDelete("care-aide/{id:int}")]
    public async Task<IActionResult> DeleteCareAide(int id, CancellationToken ct = default)
        => await _master.DeleteCareAideAsync(id, ct) ? NoContent() : NotFound();

    // ── ER 急診醫師主檔 ErDoctor（供 ER 緊急編組納入醫師）─────
    /// <summary>查詢急診醫師名單清單。</summary>
    [HttpGet("er-doctor")]
    public async Task<IActionResult> GetErDoctors([FromQuery] bool includeAll = true, CancellationToken ct = default)
        => Ok(await _master.GetErDoctorsAsync(includeAll, ct));
    /// <summary>新增急診醫師名單。</summary>
    [HttpPost("er-doctor")]
    public async Task<IActionResult> CreateErDoctor([FromBody] ErDoctorUpsertRequest req, CancellationToken ct = default)
    { var id = await _master.CreateErDoctorAsync(req, ct); return Ok(new { id }); }
    /// <summary>更新急診醫師名單。</summary>
    [HttpPut("er-doctor/{id:int}")]
    public async Task<IActionResult> UpdateErDoctor(int id, [FromBody] ErDoctorUpsertRequest req, CancellationToken ct = default)
        => await _master.UpdateErDoctorAsync(id, req, ct) ? NoContent() : NotFound();
    /// <summary>刪除急診醫師名單。</summary>
    [HttpDelete("er-doctor/{id:int}")]
    public async Task<IActionResult> DeleteErDoctor(int id, CancellationToken ct = default)
        => await _master.DeleteErDoctorAsync(id, ct) ? NoContent() : NotFound();

    // ── 外傷小組 醫師主檔 TraumaDoctor（獨立，比照急診醫師）─────
    /// <summary>查詢外傷小組醫師名單清單。</summary>
    [HttpGet("trauma-doctor")]
    public async Task<IActionResult> GetTraumaDoctors([FromQuery] bool includeAll = true, CancellationToken ct = default)
        => Ok(await _master.GetTraumaDoctorsAsync(includeAll, ct));
    /// <summary>新增外傷小組醫師名單。</summary>
    [HttpPost("trauma-doctor")]
    public async Task<IActionResult> CreateTraumaDoctor([FromBody] TraumaDoctorUpsertRequest req, CancellationToken ct = default)
    { var id = await _master.CreateTraumaDoctorAsync(req, ct); return Ok(new { id }); }
    /// <summary>更新外傷小組醫師名單。</summary>
    [HttpPut("trauma-doctor/{id:int}")]
    public async Task<IActionResult> UpdateTraumaDoctor(int id, [FromBody] TraumaDoctorUpsertRequest req, CancellationToken ct = default)
        => await _master.UpdateTraumaDoctorAsync(id, req, ct) ? NoContent() : NotFound();
    /// <summary>刪除外傷小組醫師名單。</summary>
    [HttpDelete("trauma-doctor/{id:int}")]
    public async Task<IActionResult> DeleteTraumaDoctor(int id, CancellationToken ct = default)
        => await _master.DeleteTraumaDoctorAsync(id, ct) ? NoContent() : NotFound();

    // ── ER 急診醫師 每日緊急編組／點班 ─────
    /// <summary>查詢急診緊急應變編組清單。</summary>
    [HttpGet("er-doctor-group")]
    public async Task<IActionResult> GetErDoctorGroups([FromQuery] string date, CancellationToken ct = default)
        => Ok(await _master.GetErDoctorGroupsAsync(date, ct));
    /// <summary>儲存某日急診緊急應變編組（整批覆寫）。</summary>
    [HttpPost("er-doctor-group")]
    public async Task<IActionResult> SaveErDoctorGroup([FromBody] ErDoctorGroupSaveRequest req, CancellationToken ct = default)
    { var n = await _master.SaveErDoctorGroupAsync(req.WorkDate, req.Entries, ct); return Ok(new { saved = n }); }

    // ── 各單位「顯示照服員」選取 UnitCareAide ─────
    /// <summary>某單位選取顯示的照服員（含順序＋姓名／聯絡方式）。供後台設定頁載入與前台顯示。</summary>
    [HttpGet("{unitCode}/aide-display")]
    public async Task<IActionResult> GetUnitCareAides(string unitCode, CancellationToken ct = default)
        => Ok(await _master.GetUnitAidesAsync(unitCode, ct));

    /// <summary>覆寫某單位的照服員顯示選取（先刪後插，順序＝SortOrder）。</summary>
    [HttpPost("{unitCode}/aide-display/batch")]
    public async Task<IActionResult> SaveUnitCareAides(string unitCode, [FromBody] UnitCareAideSaveRequest req, CancellationToken ct = default)
        => Ok(new { saved = await _master.SaveUnitAidesAsync(unitCode, req.Entries ?? new(), ct) });

    // ── 排班：看板組裝（ScheduleTab）──
    /// <summary>排班資訊：依班別分組，護理師帶其負責床位（主護指派聚合）。</summary>
    [HttpGet("{unitCode}/schedule")]
    public async Task<IActionResult> GetScheduleBoard(string unitCode, [FromQuery] string? date, CancellationToken ct = default)
    {
        var d = string.IsNullOrWhiteSpace(date) ? DateTime.Today.ToString("yyyy-MM-dd") : date;
        var rows = (await _staff.GetScheduleAsync(unitCode, d, false, ct)).ToList();
        var beds = (await _staff.GetBedAssignAsync(unitCode, d, "主護", false, ct)).ToList();
        var bedsByStaff = beds.GroupBy(b => b.StaffId)
            .ToDictionary(g => g.Key, g => g.OrderBy(x => x.SortOrder).Select(x => x.BedId).ToList());

        // 專科護理師／住院醫師改讀「當日專師/住院醫師排班」(Specialist/ResidentRoster)，day-level、跨班相同；不再由 StaffSchedule 職別推導。
        var dDate = DateTime.Parse(d);
        var daySpecialists = (await _oncall.GetSpecialistsAsync(unitCode, dDate, dDate, ct))
            .Select(sp => new { staffId = sp.StaffId ?? sp.Id, peName = sp.Name, specialty = sp.Department, extension = sp.Ext })
            .ToList();
        var dayResidents = (await _oncall.GetResidentsAsync(unitCode, dDate, dDate, ct))
            .Select(rs => new { id = rs.Id, peName = rs.Name })
            .ToList();

        string Cat(string? role) => role switch
        {
            var r when r != null && r.Contains("護理") => "nurse",
            _ => "other"
        };
        var shifts = rows.GroupBy(r => r.Shift).Select(g => new
        {
            shiftType = g.Key,
            nurses = g.Where(r => Cat(r.Role) == "nurse").Select(r => new {
                staffId = r.StaffId, peNo = r.EmployeeNo, peName = r.Name, role = r.Role, extension = r.Ext,
                bedNos = bedsByStaff.TryGetValue(r.StaffId, out var bn) ? bn : new List<string>(),
                emergencyGroup = r.EmergencyGroup, checkIn = r.IsCharge
            }),
            specialists = daySpecialists,   // day-level：當天所有專師，各班相同
            residents = dayResidents        // day-level：當天所有住院醫師，各班相同
        });
        return Ok(new { unitCode, queryDate = d, shifts });
    }

    // ── 排班 CRUD（admin）──
    /// <summary>查詢某單位三班護理師每日排班清單。</summary>
    [HttpGet("{unitCode}/schedule-list")]
    public async Task<IActionResult> GetScheduleList(string unitCode, [FromQuery] string? date, [FromQuery] bool includeAll = true, CancellationToken ct = default)
        => Ok(await _staff.GetScheduleAsync(unitCode, date, includeAll, ct));
    /// <summary>取得單筆三班護理師每日排班。</summary>
    [HttpGet("schedule/{id:int}")]
    public async Task<IActionResult> GetScheduleById(int id, CancellationToken ct = default)
    { var x = await _staff.GetScheduleByIdAsync(id, ct); return x is null ? NotFound() : Ok(x); }
    /// <summary>新增三班護理師每日排班。</summary>
    [HttpPost("schedule")]
    public async Task<IActionResult> CreateSchedule([FromBody] StaffScheduleUpsertRequest req, CancellationToken ct = default)
    { var id = await _staff.CreateScheduleAsync(req, ct); return CreatedAtAction(nameof(GetScheduleById), new { id }, await _staff.GetScheduleByIdAsync(id, ct)); }
    /// <summary>更新三班護理師每日排班。</summary>
    [HttpPut("schedule/{id:int}")]
    public async Task<IActionResult> UpdateSchedule(int id, [FromBody] StaffScheduleUpsertRequest req, CancellationToken ct = default)
        => await _staff.UpdateScheduleAsync(id, req, ct) ? Ok(await _staff.GetScheduleByIdAsync(id, ct)) : NotFound();
    /// <summary>刪除三班護理師每日排班。</summary>
    [HttpDelete("schedule/{id:int}")]
    public async Task<IActionResult> DeleteSchedule(int id, CancellationToken ct = default)
        => await _staff.DeleteScheduleAsync(id, ct) ? NoContent() : NotFound();

    /// <summary>值班表三班護理師批次排班：日期區間 × 各班 × 有序護理師，疊加 upsert（不刪未選）。</summary>
    [HttpPost("{unitCode}/shift-roster")]
    public async Task<IActionResult> SetShiftRoster(string unitCode, [FromBody] ShiftRosterRequest req, CancellationToken ct = default)
    {
        if (!DateTime.TryParse(req.From, out var from) || !DateTime.TryParse(req.To, out var to))
            return BadRequest(new { message = "日期格式錯誤（yyyy-MM-dd）" });
        if ((to.Date - from.Date).TotalDays > 92) return BadRequest(new { message = "日期區間過長（上限約 3 個月）" });
        var shifts = (req.Shifts ?? new())
            .Where(x => !string.IsNullOrWhiteSpace(x.Shift))
            .Select(x => (x.Shift, (IReadOnlyList<int>)(x.StaffIds ?? new()))).ToList();
        var n = await _staff.AddShiftRosterAsync(unitCode, from, to, shifts, ct);
        return Ok(new { affected = n });
    }

    // ── 床位指派 CRUD（主護勾床／醫師-床）──
    /// <summary>查詢某單位護理師負責床位指派清單。</summary>
    [HttpGet("{unitCode}/bedassign")]
    public async Task<IActionResult> GetBedAssign(string unitCode, [FromQuery] string? date, [FromQuery] string? type, [FromQuery] bool includeAll = true, CancellationToken ct = default)
        => Ok(await _staff.GetBedAssignAsync(unitCode, date, type, includeAll, ct));
    /// <summary>取得單筆護理師負責床位指派。</summary>
    [HttpGet("bedassign/{id:int}")]
    public async Task<IActionResult> GetBedAssignById(int id, CancellationToken ct = default)
    { var x = await _staff.GetBedAssignByIdAsync(id, ct); return x is null ? NotFound() : Ok(x); }
    /// <summary>新增護理師負責床位指派。</summary>
    [HttpPost("bedassign")]
    public async Task<IActionResult> CreateBedAssign([FromBody] BedStaffAssignmentUpsertRequest req, CancellationToken ct = default)
    { var id = await _staff.CreateBedAssignAsync(req, ct); return CreatedAtAction(nameof(GetBedAssignById), new { id }, await _staff.GetBedAssignByIdAsync(id, ct)); }
    /// <summary>更新護理師負責床位指派。</summary>
    [HttpPut("bedassign/{id:int}")]
    public async Task<IActionResult> UpdateBedAssign(int id, [FromBody] BedStaffAssignmentUpsertRequest req, CancellationToken ct = default)
        => await _staff.UpdateBedAssignAsync(id, req, ct) ? Ok(await _staff.GetBedAssignByIdAsync(id, ct)) : NotFound();
    /// <summary>刪除護理師負責床位指派。</summary>
    [HttpDelete("bedassign/{id:int}")]
    public async Task<IActionResult> DeleteBedAssign(int id, CancellationToken ct = default)
        => await _staff.DeleteBedAssignAsync(id, ct) ? NoContent() : NotFound();

    /// <summary>勾床配對：設定某護理師當日「主護」床位為恰好 bedIds（一床一主護）。</summary>
    [HttpPost("{unitCode}/bed-nurse")]
    public async Task<IActionResult> SetBedNurse(string unitCode, [FromBody] BedNurseSetRequest req, CancellationToken ct = default)
    {
        var date = string.IsNullOrWhiteSpace(req.WorkDate) ? DateTime.Today.ToString("yyyy-MM-dd") : req.WorkDate;
        await _staff.SetBedNurseAsync(unitCode, req.StaffId, date, req.BedIds ?? new(), ct);
        return Ok(await _staff.GetBedAssignAsync(unitCode, date, "主護", false, ct));
    }

    // ── 醫師資訊：看板組裝（DoctorTab）──
    /// <summary>醫師資訊：醫師-床對應（主治指派聚合）＋查房時間表。</summary>
    [HttpGet("{unitCode}/doctor")]
    public async Task<IActionResult> GetDoctorBoard(string unitCode, [FromQuery] string? date, CancellationToken ct = default)
    {
        var d = string.IsNullOrWhiteSpace(date) ? DateTime.Today.ToString("yyyy-MM-dd") : date;
        // 醫師-床：改由院方 HIS 在床清單（負責醫師/科別/床號）分組，取代自建的主治指派
        List<BoardBedItem> occ;
        try { occ = await _board.GetBedListAsync(unitCode, ct); }
        catch (Exception ex) { _logger.LogWarning(ex, "Board_bed {u} 取得失敗，醫師資訊以空續行", unitCode); occ = new(); }
        var doctorBeds = occ
            .Where(o => !string.IsNullOrWhiteSpace(o.Doctor) && !string.IsNullOrWhiteSpace(o.Hbed))
            .GroupBy(o => o.Doctor!.Trim())
            .Select(g => new {
                doctorName = g.Key,
                specialty = g.Select(x => x.Department?.Trim()).FirstOrDefault(x => !string.IsNullOrWhiteSpace(x)) ?? "",
                bedNos = g.Select(x => x.Hbed!.Trim()).OrderBy(x => x, StringComparer.Ordinal).ToList()
            })
            .OrderBy(x => x.doctorName, StringComparer.Ordinal)
            .ToList();
        var rounds = (await _staff.GetRoundAsync(unitCode, d, false, ct)).Select(x => new {
            roundId = x.Id, roundDate = x.RoundDate.ToString("yyyyMMdd"), doctorName = x.DoctorName, specialty = x.Specialty,
            estimatedTime = x.EstimatedTime, actualTime = x.ActualTime, isCompleted = x.IsCompleted, remark = x.Remark
        });
        return Ok(new { unitCode, queryDate = d, doctorBeds, roundSchedule = rounds });
    }

    // ── 查房表 CRUD ──
    /// <summary>查詢某單位醫師查房表清單。</summary>
    [HttpGet("{unitCode}/round-list")]
    public async Task<IActionResult> GetRoundList(string unitCode, [FromQuery] string? date, [FromQuery] bool includeAll = true, CancellationToken ct = default)
        => Ok(await _staff.GetRoundAsync(unitCode, date, includeAll, ct));
    /// <summary>取得單筆醫師查房表。</summary>
    [HttpGet("round/{id:int}")]
    public async Task<IActionResult> GetRoundById(int id, CancellationToken ct = default)
    { var x = await _staff.GetRoundByIdAsync(id, ct); return x is null ? NotFound() : Ok(x); }
    /// <summary>新增醫師查房表。</summary>
    [HttpPost("round")]
    public async Task<IActionResult> CreateRound([FromBody] DoctorRoundUpsertRequest req, CancellationToken ct = default)
    { var id = await _staff.CreateRoundAsync(req, ct); return CreatedAtAction(nameof(GetRoundById), new { id }, await _staff.GetRoundByIdAsync(id, ct)); }
    /// <summary>更新醫師查房表。</summary>
    [HttpPut("round/{id:int}")]
    public async Task<IActionResult> UpdateRound(int id, [FromBody] DoctorRoundUpsertRequest req, CancellationToken ct = default)
        => await _staff.UpdateRoundAsync(id, req, ct) ? Ok(await _staff.GetRoundByIdAsync(id, ct)) : NotFound();
    /// <summary>刪除醫師查房表。</summary>
    [HttpDelete("round/{id:int}")]
    public async Task<IActionResult> DeleteRound(int id, CancellationToken ct = default)
        => await _staff.DeleteRoundAsync(id, ct) ? NoContent() : NotFound();

    // ── 護理交班：看板組裝（HandoverTab）──
    /// <summary>護理交班：取當日（或指定班別）一筆交班 header ＋病人卡（含分類事項）。</summary>
    [HttpGet("{unitCode}/handover")]
    public async Task<IActionResult> GetHandoverBoard(string unitCode, [FromQuery] string? date, [FromQuery] string? shift, CancellationToken ct = default)
    {
        var d = string.IsNullOrWhiteSpace(date) ? DateTime.Today.ToString("yyyy-MM-dd") : date;
        var hs = (await _staff.GetHandoverShiftsAsync(unitCode, d, shift, false, ct)).FirstOrDefault();
        if (hs is null) return Ok(new { unitCode, queryDate = d, handoverInfo = (object?)null, patients = Array.Empty<object>() });

        var allStaff = (await _staff.GetStaffAsync(true, ct)).ToDictionary(s => s.Id, s => s.Name);
        List<string> Names(string? csv) => string.IsNullOrWhiteSpace(csv) ? new()
            : csv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                 .Select(x => int.TryParse(x, out var i) && allStaff.TryGetValue(i, out var n) ? n : null)
                 .Where(n => n != null).Select(n => n!).ToList();

        var pats = (await _staff.GetHandoverPatientsAsync(hs.Id, ct)).ToList();
        var patients = new List<object>();
        foreach (var p in pats)
        {
            var items = (await _staff.GetHandoverNotesAsync(p.Id, ct)).Select(n => new { category = n.Category, content = n.Content });
            patients.Add(new {
                handoverId = p.Id, bedNo = p.BedNo, patientName = MaskName(p.PatientName), gender = p.Gender, age = p.Age,
                diagnosis = p.Diagnosis, priority = p.Priority, items
            });
        }
        var info = new {
            fromShift = hs.FromShift, fromShiftTime = hs.FromShiftTime, toShift = hs.ToShift, toShiftTime = hs.ToShiftTime,
            handoverTime = hs.HandoverTime, fromNurses = Names(hs.FromStaffIds), toNurses = Names(hs.ToStaffIds)
        };
        return Ok(new { unitCode, queryDate = d, shiftId = hs.Id, handoverInfo = info, patients });
    }

    // ── 護理交班 CRUD ──
    /// <summary>查詢某單位護理交班班別清單。</summary>
    [HttpGet("{unitCode}/handover-shifts")]
    public async Task<IActionResult> GetHandoverShifts(string unitCode, [FromQuery] string? date, [FromQuery] bool includeAll = true, CancellationToken ct = default)
        => Ok(await _staff.GetHandoverShiftsAsync(unitCode, date, null, includeAll, ct));
    /// <summary>取得單筆護理交班班別。</summary>
    [HttpGet("handover-shift/{id:int}")]
    public async Task<IActionResult> GetHandoverShiftById(int id, CancellationToken ct = default)
    { var x = await _staff.GetHandoverShiftByIdAsync(id, ct); return x is null ? NotFound() : Ok(x); }
    /// <summary>新增護理交班班別。</summary>
    [HttpPost("handover-shift")]
    public async Task<IActionResult> CreateHandoverShift([FromBody] HandoverShiftUpsertRequest req, CancellationToken ct = default)
    { var id = await _staff.CreateHandoverShiftAsync(req, ct); return CreatedAtAction(nameof(GetHandoverShiftById), new { id }, await _staff.GetHandoverShiftByIdAsync(id, ct)); }
    /// <summary>更新護理交班班別。</summary>
    [HttpPut("handover-shift/{id:int}")]
    public async Task<IActionResult> UpdateHandoverShift(int id, [FromBody] HandoverShiftUpsertRequest req, CancellationToken ct = default)
        => await _staff.UpdateHandoverShiftAsync(id, req, ct) ? Ok(await _staff.GetHandoverShiftByIdAsync(id, ct)) : NotFound();
    /// <summary>刪除護理交班班別。</summary>
    [HttpDelete("handover-shift/{id:int}")]
    public async Task<IActionResult> DeleteHandoverShift(int id, CancellationToken ct = default)
        => await _staff.DeleteHandoverShiftAsync(id, ct) ? NoContent() : NotFound();

    /// <summary>查詢某交班班別下的病人清單。</summary>
    [HttpGet("handover-shift/{shiftId:int}/patients")]
    public async Task<IActionResult> GetHandoverPatients(int shiftId, CancellationToken ct = default)
        => Ok(await _staff.GetHandoverPatientsAsync(shiftId, ct));
    /// <summary>新增護理交班病人。</summary>
    [HttpPost("handover-patient")]
    public async Task<IActionResult> CreateHandoverPatient([FromBody] HandoverPatientUpsertRequest req, CancellationToken ct = default)
    { var id = await _staff.CreateHandoverPatientAsync(req, ct); return Ok(new { id }); }
    /// <summary>更新護理交班病人。</summary>
    [HttpPut("handover-patient/{id:int}")]
    public async Task<IActionResult> UpdateHandoverPatient(int id, [FromBody] HandoverPatientUpsertRequest req, CancellationToken ct = default)
        => await _staff.UpdateHandoverPatientAsync(id, req, ct) ? NoContent() : NotFound();
    /// <summary>刪除護理交班病人。</summary>
    [HttpDelete("handover-patient/{id:int}")]
    public async Task<IActionResult> DeleteHandoverPatient(int id, CancellationToken ct = default)
        => await _staff.DeleteHandoverPatientAsync(id, ct) ? NoContent() : NotFound();

    /// <summary>查詢某交班病人的交班事項。</summary>
    [HttpGet("handover-patient/{patientId:int}/notes")]
    public async Task<IActionResult> GetHandoverNotes(int patientId, CancellationToken ct = default)
        => Ok(await _staff.GetHandoverNotesAsync(patientId, ct));
    /// <summary>新增護理交班事項。</summary>
    [HttpPost("handover-note")]
    public async Task<IActionResult> CreateHandoverNote([FromBody] HandoverNoteUpsertRequest req, CancellationToken ct = default)
    { var id = await _staff.CreateHandoverNoteAsync(req, ct); return Ok(new { id }); }
    /// <summary>更新護理交班事項。</summary>
    [HttpPut("handover-note/{id:int}")]
    public async Task<IActionResult> UpdateHandoverNote(int id, [FromBody] HandoverNoteUpsertRequest req, CancellationToken ct = default)
        => await _staff.UpdateHandoverNoteAsync(id, req, ct) ? NoContent() : NotFound();
    /// <summary>刪除護理交班事項。</summary>
    [HttpDelete("handover-note/{id:int}")]
    public async Task<IActionResult> DeleteHandoverNote(int id, CancellationToken ct = default)
        => await _staff.DeleteHandoverNoteAsync(id, ct) ? NoContent() : NotFound();

    // ── 照護團隊：看板組裝（TeamTab）── 由 StaffUnitRole 依 GroupKey 分組
    /// <summary>照護團隊看板：依角色（病房主管／主治／住院／專科護理師／護理師／醫事）分組回傳。</summary>
    [HttpGet("{unitCode}/team")]
    public async Task<IActionResult> GetTeamBoard(string unitCode, CancellationToken ct = default)
    {
        var roles = (await _staff.GetUnitRolesAsync(null, unitCode, false, ct)).ToList();
        var groupNames = new (string Key, string Name)[] {
            ("leader","病房主管"), ("attending","主治醫師"), ("resident","住院醫師"),
            ("specialist","專科護理師"), ("nurse","護理師"), ("allied","醫事人員")
        };
        var teamGroups = groupNames
            .Select(gn => new {
                groupKey = gn.Key, groupName = gn.Name,
                members = roles.Where(r => (r.GroupKey ?? "") == gn.Key).Select(r => new {
                    teamId = r.Id, role = r.Role, name = r.Name, department = r.Department, ext = r.Ext, mobile = r.Mobile })
            })
            .Where(g => g.members.Any());
        return Ok(new { unitCode, teamGroups });
    }

    // ── 私有輔助 ───────────────────────────────────────────────────
    /// <summary>呼叫 Board_bed 取病房在床清單；失敗時記錄並回空清單（白板不中斷）。</summary>
    private async Task<List<BoardBedItem>> SafeBoardAsync(string ward, CancellationToken ct)
    {
        try { return await _board.GetBedListAsync(ward, ct); }
        catch (Exception ex) { _logger.LogWarning(ex, "Board_bed {Ward} 取得失敗，以空清單續行", ward); return new(); }
    }

    /// <summary>
    /// ER 床號對應：病房(去頭尾空白) ＋ 床位(原樣) 直接串接 → 白板床號。
    /// 院方回傳 病房="MER " ＋ 床位="006" → "MER006"（床位維持院方 3 碼補零，不再正規化）；
    /// 平面圖主檔(ErBed.BedId)亦以相同格式建立，直接對應。
    /// </summary>
    private static string? MapErBedId(string? ward, string? bed)
    {
        var w = ward?.Trim();
        var b = bed?.Trim();
        if (string.IsNullOrWhiteSpace(w) || string.IsNullOrWhiteSpace(b)) return null;
        return w + b;
    }

    /// <summary>檢傷分類 1–5 → A/B/C（A:1-2 重症、B:3 中症、C:4-5 輕症）；無法解析回 null。</summary>
    // 急診檢傷僅 3 級：院方真實值 1/2/3 → A/B/C（1→A 重症、2→B 中症、3→C 輕症）
    /// <summary>院方檢傷分類(E/2/3/4/5/9) → 嚴重度層級：1=重症(E,2)、2=中症(3)、3=輕症(4,5,9)。</summary>
    private static int? TriageLevel(string? raw)
        => (raw?.Trim().ToUpperInvariant()) switch
        {
            "E" or "2" => 1,            // 重症 → A
            "3" => 2,                    // 中症 → B
            "4" or "5" or "9" => 3,      // 輕症 → C
            _ => (int?)null
        };

    /// <summary>檢傷層級 → A/B/C 級。</summary>
    private static string? TriageToGrade(string? triage)
        => TriageLevel(triage) is { } lv ? (lv == 1 ? "A" : lv == 2 ? "B" : "C") : null;

    /// <summary>解析出生字串（支援 1970/11/20 與 ISO datetime），回 DateTime。</summary>
    private static DateTime? ParseBirth(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        return DateTime.TryParse(raw, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d) ? d : (DateTime?)null;
    }

    /// <summary>顯示用出生日：可解析則 yyyy/MM/dd，否則原字串。</summary>
    private static string? FormatBirth(string? raw)
        => ParseBirth(raw) is { } d ? d.ToString("yyyy/MM/dd") : raw;

    /// <summary>由出生日概算年齡（歲）。</summary>
    private static int? CalcAge(string? raw)
    {
        if (ParseBirth(raw) is not { } b) return null;
        var today = DateTime.Today;
        var age = today.Year - b.Year;
        if (b.Date > today.AddYears(-age)) age--;
        return age < 0 || age > 130 ? null : age;
    }

    /// <summary>
    /// 病人姓名去識別化（公開看板用）：保留首末字、中間全 O；2 字→首+O；≤1 字或空→原值。
    /// 只套用於「病人」姓名；員工/醫護/醫師姓名不套用。管理後台端點不呼叫此函式。
    /// </summary>
    private static string? MaskName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return name;
        var s = name.Trim();
        if (s.Length <= 1) return s;
        if (s.Length == 2) return s[0] + "O";
        return s[0] + new string('O', s.Length - 2) + s[^1];
    }
}
