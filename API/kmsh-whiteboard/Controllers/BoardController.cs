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
                    Condition = e?.Condition,
                    Isolation = e?.Isolation,
                    Dnr = e?.Dnr ?? false,
                    FallRisk = e?.FallRisk ?? false,
                    Dependency = e?.Dependency,
                    Confidential = e?.Confidential ?? false,
                    NoTreatment = e?.NoTreatment ?? false,
                    Npo = e?.Npo ?? false,
                    Allergy = e?.Allergy ?? false,
                    Rrt = e?.Rrt ?? false,
                    Chemo = e?.Chemo ?? false,
                    Transport = e?.Transport,
                    Oxygen = e?.Oxygen ?? false,
                    Renal = e?.Renal ?? false,
                    PortCath = e?.PortCath ?? false,
                    DLVC = e?.DLVC ?? false,
                    Foley = e?.Foley ?? false,
                    CVC = e?.CVC ?? false,
                    CardiacCath = e?.CardiacCath ?? false,
                    Surgery = e?.Surgery ?? false,
                    Exam = e?.Exam ?? false,
                    Consult = e?.Consult ?? false,
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

        // 責任護理師：改由「勾床配對」（依床號）決定（今日，AssignType=主護）。ICU 一床可多位 → 逗號並列。
        var today = DateTime.Today.ToString("yyyy-MM-dd");
        var nurseByBed = (await _staff.GetBedAssignAsync("ICU", today, "主護", false, ct))
            .Where(b => !string.IsNullOrWhiteSpace(b.BedId))
            .GroupBy(b => b.BedId!)
            .ToDictionary(g => g.Key, g => string.Join("，", g.Select(x => x.Name).Where(n => !string.IsNullOrWhiteSpace(n))), StringComparer.OrdinalIgnoreCase);

        var resp = new IcuBoardResponse
        {
            HospitalInfo = new IcuHospitalInfo { Name = "高雄市立民生醫院", Ward = "ICU", WardDirector = "王○明", HeadNurse = "陳○美" },
            Version = extList.Count > 0
                ? new DateTimeOffset(extList.Max(e => e.UpdatedAt), TimeSpan.Zero).ToUnixTimeSeconds()
                : 0
        };

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
                    bed.Status = string.IsNullOrWhiteSpace(e?.BedStatus) ? "occupied" : e!.BedStatus!;
                    bed.Patient = new IcuPatientDto
                    {
                        Name = MaskName(o.Hnamec), Gender = o.Hsex, BirthDate = FormatBirth(o.Hbirthdt), Age = CalcAge(o.Hbirthdt),
                        MedRecord = o.Hhisnum, IdNo = o.Hidno,
                        Department = string.IsNullOrWhiteSpace(o.Department) ? e?.Department : o.Department, Admission = FormatBirth(o.AdmitDate) ?? e?.AdmissionDate,
                        Diagnosis = string.IsNullOrWhiteSpace(o.Diagnosis) ? e?.Diagnosis : o.Diagnosis,  // 院方診斷優先
                        Doctor = string.IsNullOrWhiteSpace(o.Doctor) ? e?.AttendingDoctor : o.Doctor,
                        Nurse = nurseByBed.TryGetValue(bed.Id, out var rn) && !string.IsNullOrWhiteSpace(rn) ? rn : null,  // 責任護理師＝勾床配對（可多位逗號並列）
                        Condition = string.IsNullOrWhiteSpace(e?.Condition) ? "危急" : e!.Condition,  // ICU 病況預設 A級（危急）；無後台設定即 A
                        Isolation = e?.Isolation,
                        Dnr = e?.Dnr ?? false, Ventilator = e?.Ventilator ?? false, Crrt = e?.Crrt ?? false,
                        Ng = e?.Ng ?? false, Foley = e?.Foley ?? false, Cvc = e?.CVC ?? false,
                        Restraint = !string.IsNullOrWhiteSpace(o.Hhisnum) && restraintByHis.TryGetValue(o.Hhisnum!.Trim(), out var rst) && rst,  // 約束：AICUPHY（4F）

                        FallRisk = e?.FallRisk ?? false, Dependency = e?.Dependency, Confidential = e?.Confidential ?? false,
                        NoTreatment = e?.NoTreatment ?? false, Npo = e?.Npo ?? false, Allergy = e?.Allergy ?? false,
                        Rrt = e?.Rrt ?? false, Chemo = e?.Chemo ?? false, Transport = e?.Transport, Oxygen = e?.Oxygen ?? false,
                        Surgery = e?.Surgery ?? false, Exam = e?.Exam ?? false, Consult = e?.Consult ?? false, Notes = e?.Notes
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
                bed.Patient = BuildErPatient(o, e);
                bed.Patient.Nurse = nurseByBed.TryGetValue(b.BedId, out var ern) && !string.IsNullOrWhiteSpace(ern) ? ern : null;  // 責任護理師＝我的病床勾床（可多位逗號並列）
                bed.Status = DeriveErStatus(o, e);
            }
            resp.Beds.Add(bed);
        }

        // 2) 床碼不在主檔的在室病人 → Unplaced（前端落溢位區，提示後台補建該床）
        var placed = new HashSet<string>(beds.Select(b => b.BedId), StringComparer.OrdinalIgnoreCase);
        foreach (var kv in occByBed)
        {
            if (placed.Contains(kv.Key)) continue;
            var e = ExtOf(kv.Value);
            resp.Beds.Add(new ErBedDto
            {
                BedId = kv.Key, Ward = kv.Value.Ward?.Trim(), Zone = "未配置", Unplaced = true,
                SortOrder = 9000, Status = DeriveErStatus(kv.Value, e), Patient = BuildErPatient(kv.Value, e)
            });
        }

        return Ok(resp);
    }

    /// <summary>合併 Board_ER 真實病人 ＋ WardPatientExt overlay → ER 病人卡 DTO。</summary>
    private static ErBedPatientDto BuildErPatient(BoardErItem o, WardPatientExtItem? e) => new()
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
        // 設定了轉入/轉出醫院時，視同已勾轉入/轉出（讓看板旗標、篩選、急診統計一致對應）
        TransferIn = (e?.TransferIn ?? false) || !string.IsNullOrWhiteSpace(e?.TransferInHospital),
        TransferOut = (e?.TransferOut ?? false) || !string.IsNullOrWhiteSpace(e?.TransferHospital),
        TransferHospital = e?.TransferHospital, TransferInHospital = e?.TransferInHospital,
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

    /// <summary>推導床位狀態（隔離→轉床→待床→留觀→否則 occupied）；待床/留觀含院方 Flow(4/A)。空床由呼叫端設 empty。</summary>
    private static string DeriveErStatus(BoardErItem o, WardPatientExtItem? e)
    {
        if (e is not null && !string.IsNullOrWhiteSpace(e.Isolation) && e.Isolation!.Trim() is not ("" or "無")) return "isolation";
        if (e is not null && (e.TransferIn || e.TransferOut)) return "transfer";
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
        await SyncOrDailyIfFetchedAsync(ct);   // 取 Board_OR 成功才同步當日快照（失敗則僅讀快照）

        var daily = (await _ward.GetOrDailyAsync(today, today, ct)).ToList();   // 當日累積快照（含已完成）
        // 取消排除：Board_OR 消失＝已完成，但「取消」的刀也會消失而被誤判。
        // 以 OPORDER(OrSurgery) 今日 StatusCode=82（取消）為準，將這些刀自快照剔除（不視為已完成、不上看板、不計入總刀數）。
        var cancelledKeys = (await _ward.GetOrSurgeryListAsync(today, today, ct))
            .Where(x => x.StatusCode == "82")
            .Select(x => OsnKey(x.OpDate, x.RoomId, x.ChartNo, x.OpTime))
            .ToHashSet();
        if (cancelledKeys.Count > 0)
            daily = daily.Where(d => !cancelledKeys.Contains(OsnKey(d.SurgeryDate, d.RoomId, d.Hhisnum, d.OpTime))).ToList();
        var rooms = (await _ward.GetOrRoomsAsync("OR", includeAll: false, ct)).ToList();
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
        // 「已完成」僅以實際出刀房時間(overlay EndTime)為準（唯一可信的完成訊號）。
        // 從 Board_OR 消失(Completed=1)但未登記出刀房者，完成與否未明（可能已完成/改期/未登記）→ 暫不上看板，
        // 避免把「消失」誤判為已完成，或殘留成排程。院方提供 ORSTATUS 完成碼後再改以其為準。
        daily = daily.Where(d => !d.Completed || !string.IsNullOrWhiteSpace(ExtOf(d.Hhisnum)?.EndTime)).ToList();
        // 逐台刀刷手/流動/備註覆蓋（今日）
        var osn = (await _ward.GetOrSurgeryNurseAsync(today, today, ct))
            .GroupBy(x => OsnKey(x.OpDate, x.RoomId, x.ChartNo, x.OpTime))
            .ToDictionary(g => g.Key, g => g.First());
        OrSurgeryNurseItem? OsnOf(OrDailySurgeryItem d) => osn.TryGetValue(OsnKey(d.SurgeryDate, d.RoomId, d.Hhisnum, d.OpTime), out var a) ? a : null;

        var byRoom = daily
            .GroupBy(d => d.RoomId ?? "", StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.OrderBy(x => x.OpTime).ToList(), StringComparer.OrdinalIgnoreCase);

        var resp = new OrBoardResponse
        {
            Count = daily.Count,   // 當日總刀數（累積、整天穩定）
            Version = extList.Count > 0
                ? new DateTimeOffset(extList.Max(e => e.UpdatedAt), TimeSpan.Zero).ToUnixTimeSeconds()
                : 0
        };

        foreach (var r in rooms)
        {
            var dto = new OrRoomDto { RoomId = r.RoomId, ApiRoom = r.ApiRoom, SortOrder = r.SortOrder };
            if (byRoom.TryGetValue(r.RoomId, out var list) && list.Count > 0)
            {
                dto.Surgeries = list.Select(d => BuildOrSurgeryFromDaily(d, ExtOf(d.Hhisnum), OsnOf(d), now)).ToList();
                dto.TodayCount = dto.Surgeries.Count;
                // 房卡顯示（Surgeries 已依時間排序）：手術中優先；否則顯示「第一台仍在保留期內」的刀——
                // 每台過預定時間後房卡仍停留 OrCardHoldMinutes 分鐘，超過才換下一台；全部過保留則停在最後一台。
                var nowMinOr = now.Hour * 60 + now.Minute;
                var active = dto.Surgeries.Where(s => s.SurgeryStatus != "已完成").ToList();
                var current = active.FirstOrDefault(s => s.SurgeryStatus == "手術中")
                           ?? active.FirstOrDefault(s => { var m = HmToMin(s.ScheduledTime); return m is null || m.Value + OrCardHoldMinutes > nowMinOr; })
                           ?? active.LastOrDefault()
                           ?? dto.Surgeries[^1];
                dto.Patient = current;
                dto.Status = StatusToClass(current.SurgeryStatus);
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

    /// <summary>手術狀態中文 → 卡片 class；排程/未知則 scheduled。</summary>
    private static string StatusToClass(string? status) => status switch
    {
        "手術中" => "in-surgery",
        "準備中" => "prep",
        "已完成" => "completed",
        _ => "scheduled"
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

    [HttpGet("oncall/{id:int}")]
    public async Task<IActionResult> GetOnCallById(int id, CancellationToken ct = default)
    {
        var item = await _ward.GetOnCallByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost("oncall")]
    public async Task<IActionResult> CreateOnCall([FromBody] ErOnCallDoctorUpsertRequest req, CancellationToken ct = default)
    {
        var id = await _ward.CreateOnCallAsync(req, ct);
        return CreatedAtAction(nameof(GetOnCallById), new { id }, await _ward.GetOnCallByIdAsync(id, ct));
    }

    [HttpPut("oncall/{id:int}")]
    public async Task<IActionResult> UpdateOnCall(int id, [FromBody] ErOnCallDoctorUpsertRequest req, CancellationToken ct = default)
        => await _ward.UpdateOnCallAsync(id, req, ct) ? Ok(await _ward.GetOnCallByIdAsync(id, ct)) : NotFound();

    [HttpDelete("oncall/{id:int}")]
    public async Task<IActionResult> DeleteOnCall(int id, CancellationToken ct = default)
        => await _ward.DeleteOnCallAsync(id, ct) ? NoContent() : NotFound();

    // ── 各科值班醫師「每日輪值排程」（月曆後台；顯示端日後接）──────────────
    // 科別設定 OnCallDept
    [HttpGet("oncall-dept")]
    public async Task<IActionResult> GetOnCallDepts([FromQuery] bool includeAll = true, CancellationToken ct = default)
        => Ok(await _oncall.GetDeptsAsync(includeAll, ct));

    [HttpGet("oncall-dept/{id:int}")]
    public async Task<IActionResult> GetOnCallDeptById(int id, CancellationToken ct = default)
    {
        var item = await _oncall.GetDeptByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost("oncall-dept")]
    public async Task<IActionResult> CreateOnCallDept([FromBody] OnCallDeptUpsertRequest req, CancellationToken ct = default)
    {
        var id = await _oncall.CreateDeptAsync(req, ct);
        return CreatedAtAction(nameof(GetOnCallDeptById), new { id }, await _oncall.GetDeptByIdAsync(id, ct));
    }

    [HttpPut("oncall-dept/{id:int}")]
    public async Task<IActionResult> UpdateOnCallDept(int id, [FromBody] OnCallDeptUpsertRequest req, CancellationToken ct = default)
        => await _oncall.UpdateDeptAsync(id, req, ct) ? Ok(await _oncall.GetDeptByIdAsync(id, ct)) : NotFound();

    [HttpDelete("oncall-dept/{id:int}")]
    public async Task<IActionResult> DeleteOnCallDept(int id, CancellationToken ct = default)
        => await _oncall.DeleteDeptAsync(id, ct) ? NoContent() : NotFound();

    // 每日輪值 OnCallRoster
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
        var depts = (await _oncall.GetDeptsAsync(false, ct)).OrderBy(x => x.SortOrder).ThenBy(x => x.Id).ToList();
        var rows = (await _oncall.GetDayAsync(d, ct)).ToList();
        var result = depts.Select(dp => BuildOnCallEntry(dp.DeptCode, dp.DeptName, rows));
        return Ok(result);
    }

    // 某科當日值班醫師挑選：多時段科（內科）取 Slot=值班；無值班列或單一時段科取當日該科第一列。
    private static object BuildOnCallEntry(string deptCode, string? deptName, List<OnCallRosterItem> rows)
    {
        var drows = rows.Where(r => r.DeptCode == deptCode).OrderBy(r => r.SortOrder).ThenBy(r => r.Id).ToList();
        var pick = drows.Count <= 1 ? drows.FirstOrDefault()
                 : (drows.FirstOrDefault(r => r.Slot == "值班") ?? drows.First());
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
        var d = string.IsNullOrWhiteSpace(date) ? DateTime.Today : DateTime.Parse(date);
        var rows = (await _oncall.GetDayAsync(d, ct)).ToList();
        var result = selected.Select(s => BuildOnCallEntry(s.DeptCode, s.DeptName, rows));
        return Ok(result);
    }

    [HttpPost("oncall-roster")]
    public async Task<IActionResult> CreateOnCallRoster([FromBody] OnCallRosterUpsertRequest req, CancellationToken ct = default)
        => Ok(new { id = await _oncall.CreateRosterAsync(req, ct) });

    [HttpPut("oncall-roster/{id:int}")]
    public async Task<IActionResult> UpdateOnCallRoster(int id, [FromBody] OnCallRosterUpsertRequest req, CancellationToken ct = default)
        => await _oncall.UpdateRosterAsync(id, req, ct) ? NoContent() : NotFound();

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
    [HttpGet("{unitCode}/shiftpanel-list")]
    public async Task<IActionResult> GetErShiftList(string unitCode, [FromQuery] bool includeAll = true, CancellationToken ct = default)
        => Ok(await _ward.GetErShiftAsync(unitCode, includeAll, ct));
    [HttpGet("shiftpanel/{id:int}")]
    public async Task<IActionResult> GetErShiftById(int id, CancellationToken ct = default)
    { var x = await _ward.GetErShiftByIdAsync(id, ct); return x is null ? NotFound() : Ok(x); }
    [HttpPost("shiftpanel")]
    public async Task<IActionResult> CreateErShift([FromBody] ErShiftStaffUpsertRequest req, CancellationToken ct = default)
    { var id = await _ward.CreateErShiftAsync(req, ct); return CreatedAtAction(nameof(GetErShiftById), new { id }, await _ward.GetErShiftByIdAsync(id, ct)); }
    [HttpPut("shiftpanel/{id:int}")]
    public async Task<IActionResult> UpdateErShift(int id, [FromBody] ErShiftStaffUpsertRequest req, CancellationToken ct = default)
        => await _ward.UpdateErShiftAsync(id, req, ct) ? Ok(await _ward.GetErShiftByIdAsync(id, ct)) : NotFound();
    [HttpDelete("shiftpanel/{id:int}")]
    public async Task<IActionResult> DeleteErShift(int id, CancellationToken ct = default)
        => await _ward.DeleteErShiftAsync(id, ct) ? NoContent() : NotFound();

    // ── ER 床位主檔（病室動態平面圖 + 後台 CRUD）──────────────────────
    /// <summary>查詢某單位 ER 床位主檔（白板傳 includeAll=false；後台傳 true 含停用）。</summary>
    [HttpGet("{unitCode}/bed")]
    public async Task<IActionResult> GetErBeds(string unitCode, [FromQuery] bool includeAll = false, CancellationToken ct = default)
        => Ok(await _ward.GetErBedsAsync(unitCode, includeAll, ct));

    [HttpGet("bed/{id:int}")]
    public async Task<IActionResult> GetErBedById(int id, CancellationToken ct = default)
    {
        var item = await _ward.GetErBedByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost("bed")]
    public async Task<IActionResult> CreateErBed([FromBody] ErBedUpsertRequest req, CancellationToken ct = default)
    {
        var id = await _ward.CreateErBedAsync(req, ct);
        return CreatedAtAction(nameof(GetErBedById), new { id }, await _ward.GetErBedByIdAsync(id, ct));
    }

    [HttpPut("bed/{id:int}")]
    public async Task<IActionResult> UpdateErBed(int id, [FromBody] ErBedUpsertRequest req, CancellationToken ct = default)
        => await _ward.UpdateErBedAsync(id, req, ct) ? Ok(await _ward.GetErBedByIdAsync(id, ct)) : NotFound();

    [HttpDelete("bed/{id:int}")]
    public async Task<IActionResult> DeleteErBed(int id, CancellationToken ct = default)
        => await _ward.DeleteErBedAsync(id, ct) ? NoContent() : NotFound();

    // ── OR 刀房主檔（手術動態房卡 + 後台 CRUD）────────────────────────
    /// <summary>查詢某單位 OR 刀房主檔（白板傳 includeAll=false；後台傳 true 含停用）。</summary>
    [HttpGet("{unitCode}/room")]
    public async Task<IActionResult> GetOrRooms(string unitCode, [FromQuery] bool includeAll = false, CancellationToken ct = default)
        => Ok(await _ward.GetOrRoomsAsync(unitCode, includeAll, ct));

    [HttpGet("room/{id:int}")]
    public async Task<IActionResult> GetOrRoomById(int id, CancellationToken ct = default)
    {
        var item = await _ward.GetOrRoomByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost("room")]
    public async Task<IActionResult> CreateOrRoom([FromBody] OrRoomUpsertRequest req, CancellationToken ct = default)
    {
        var id = await _ward.CreateOrRoomAsync(req, ct);
        return CreatedAtAction(nameof(GetOrRoomById), new { id }, await _ward.GetOrRoomByIdAsync(id, ct));
    }

    [HttpPut("room/{id:int}")]
    public async Task<IActionResult> UpdateOrRoom(int id, [FromBody] OrRoomUpsertRequest req, CancellationToken ct = default)
        => await _ward.UpdateOrRoomAsync(id, req, ct) ? Ok(await _ward.GetOrRoomByIdAsync(id, ct)) : NotFound();

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

    /// <summary>OR 手術清單（全部排程，攤平）：供 ICU/W52「手術資訊」分頁；狀態依時間推導。</summary>
    [HttpGet("or/surgeries")]
    public async Task<IActionResult> GetOrSurgeries(CancellationToken ct = default)
    {
        var now = DateTime.Now; var today = DateTime.Today;
        await SyncOrDailyIfFetchedAsync(ct);   // 同步當日快照（成功才寫；失敗僅讀）

        // 讀當日快照（涵蓋手術資訊日期列 ±範圍）；已完成的刀亦留存
        var daily = (await _ward.GetOrDailyAsync(today.AddDays(-7), today.AddDays(14), ct)).ToList();
        var list = daily.Select(d => new OrSurgeryListItem
        {
            OrRoom = d.RoomId ?? d.ApiRoom, Date = d.SurgeryDate.ToString("yyyy-MM-dd"), ScheduledTime = d.OpTime,
            PatientName = MaskName(d.PatientName), Gender = d.Gender, Age = CalcAge(d.BirthDate),
            Procedure = d.SurgeryName, Diagnosis = d.Diagnosis, AnesthesiaMethod = d.AnesType,
            AttendingSurgeon = d.Doctor,
            Status = d.Completed ? "已完成" : DeriveSurgeryStatus(d.SurgeryDate, d.OpTime, now, today)
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
        // 取該單位目前在床病歷號集合（SafeBoardAsync 內含 try/catch，失敗回空）
        HashSet<string> inBed;
        if (u == "W52")
            inBed = (await SafeBoardAsync("W52", ct))
                .Where(o => !string.IsNullOrWhiteSpace(o.Hhisnum))
                .Select(o => o.Hhisnum!.Trim())
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
        else if (u == "ICU")
            inBed = (await SafeBoardAsync("AICU", ct)).Concat(await SafeBoardAsync("CICU", ct))
                .Where(o => !string.IsNullOrWhiteSpace(o.Hhisnum))
                .Select(o => o.Hhisnum!.Trim())
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
        else
            return BadRequest(new { message = $"尚未支援單位 {unitCode} 的手術過濾（目前僅 W52 / ICU）" });

        if (inBed.Count == 0) return Ok(new List<OrSurgeryListItem>());   // 無在床病人 → 無內容

        var now = DateTime.Now; var today = DateTime.Today;
        var f = from?.Date ?? today;
        var t = to?.Date ?? today;
        if (t < f) (f, t) = (t, f);
        if ((t - f).TotalDays > 14) return BadRequest(new { message = "查詢區間過長（上限 14 天）" });

        // 查區間本地手術表，再過濾成「病歷號屬該單位在床病人」者
        var rows = (await _ward.GetOrSurgeryListAsync(f, t, ct))
            .Where(r => !string.IsNullOrWhiteSpace(r.ChartNo) && inBed.Contains(r.ChartNo!.Trim()))
            .ToList();

        var list = rows.Select(r => new OrSurgeryListItem
        {
            OrRoom = r.RoomId ?? r.Room, Date = r.OpDate.ToString("yyyy-MM-dd"), ScheduledTime = r.OpTime,
            PatientName = MaskName(r.PatientName), Gender = r.Sex, Age = r.Age,
            Procedure = r.SurgeryName, Diagnosis = r.IcdCodes, AnesthesiaMethod = r.Anesthesia,
            AttendingSurgeon = r.SurgeonName,
            Status = (r.StatusCode == "82" || !string.IsNullOrWhiteSpace(r.CancelReason)) ? "取消"
                     : !string.IsNullOrWhiteSpace(r.EndTime) ? "已完成"
                     : DeriveSurgeryStatus(r.OpDate, r.OpTime, now, today)
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
    [HttpGet("{unitCode}/shiftstaff")]
    public async Task<IActionResult> GetShiftStaff(string unitCode, [FromQuery] bool includeAll = false, CancellationToken ct = default)
        => Ok(await _ward.GetShiftStaffAsync(unitCode, includeAll, ct));
    [HttpGet("shiftstaff/{id:int}")]
    public async Task<IActionResult> GetShiftStaffById(int id, CancellationToken ct = default)
    { var x = await _ward.GetShiftStaffByIdAsync(id, ct); return x is null ? NotFound() : Ok(x); }
    [HttpPost("shiftstaff")]
    public async Task<IActionResult> CreateShiftStaff([FromBody] OrShiftStaffUpsertRequest req, CancellationToken ct = default)
    { var id = await _ward.CreateShiftStaffAsync(req, ct); return CreatedAtAction(nameof(GetShiftStaffById), new { id }, await _ward.GetShiftStaffByIdAsync(id, ct)); }
    [HttpPut("shiftstaff/{id:int}")]
    public async Task<IActionResult> UpdateShiftStaff(int id, [FromBody] OrShiftStaffUpsertRequest req, CancellationToken ct = default)
        => await _ward.UpdateShiftStaffAsync(id, req, ct) ? Ok(await _ward.GetShiftStaffByIdAsync(id, ct)) : NotFound();
    [HttpDelete("shiftstaff/{id:int}")]
    public async Task<IActionResult> DeleteShiftStaff(int id, CancellationToken ct = default)
        => await _ward.DeleteShiftStaffAsync(id, ct) ? NoContent() : NotFound();

    // 房×班 刷手/流動 CRUD（後台）
    [HttpGet("{unitCode}/shiftroom")]
    public async Task<IActionResult> GetShiftRoom(string unitCode, [FromQuery] bool includeAll = false, CancellationToken ct = default)
        => Ok(await _ward.GetShiftRoomAsync(unitCode, includeAll, ct));
    [HttpGet("shiftroom/{id:int}")]
    public async Task<IActionResult> GetShiftRoomById(int id, CancellationToken ct = default)
    { var x = await _ward.GetShiftRoomByIdAsync(id, ct); return x is null ? NotFound() : Ok(x); }
    [HttpPost("shiftroom")]
    public async Task<IActionResult> CreateShiftRoom([FromBody] OrShiftRoomUpsertRequest req, CancellationToken ct = default)
    { var id = await _ward.CreateShiftRoomAsync(req, ct); return CreatedAtAction(nameof(GetShiftRoomById), new { id }, await _ward.GetShiftRoomByIdAsync(id, ct)); }
    [HttpPut("shiftroom/{id:int}")]
    public async Task<IActionResult> UpdateShiftRoom(int id, [FromBody] OrShiftRoomUpsertRequest req, CancellationToken ct = default)
        => await _ward.UpdateShiftRoomAsync(id, req, ct) ? Ok(await _ward.GetShiftRoomByIdAsync(id, ct)) : NotFound();
    [HttpDelete("shiftroom/{id:int}")]
    public async Task<IActionResult> DeleteShiftRoom(int id, CancellationToken ct = default)
        => await _ward.DeleteShiftRoomAsync(id, ct) ? NoContent() : NotFound();

    // 特殊交班 CRUD（後台）；list 路由用 handover-list 以避免與 board 的 or/handover 衝突
    [HttpGet("{unitCode}/handover-list")]
    public async Task<IActionResult> GetHandoverList(string unitCode, [FromQuery] bool includeAll = false, CancellationToken ct = default)
        => Ok(await _ward.GetHandoverAsync(unitCode, includeAll, ct));
    [HttpGet("handover/{id:int}")]
    public async Task<IActionResult> GetHandoverById(int id, CancellationToken ct = default)
    { var x = await _ward.GetHandoverByIdAsync(id, ct); return x is null ? NotFound() : Ok(x); }
    [HttpPost("handover")]
    public async Task<IActionResult> CreateHandover([FromBody] OrHandoverUpsertRequest req, CancellationToken ct = default)
    { var id = await _ward.CreateHandoverAsync(req, ct); return CreatedAtAction(nameof(GetHandoverById), new { id }, await _ward.GetHandoverByIdAsync(id, ct)); }
    [HttpPut("handover/{id:int}")]
    public async Task<IActionResult> UpdateHandover(int id, [FromBody] OrHandoverUpsertRequest req, CancellationToken ct = default)
        => await _ward.UpdateHandoverAsync(id, req, ct) ? Ok(await _ward.GetHandoverByIdAsync(id, ct)) : NotFound();
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
        var exams = examList
            .Where(x => examWards.Contains((x.Ward ?? "").Trim())
                     && !string.IsNullOrWhiteSpace(x.Hhisnum)
                     && inBedHis.Contains(x.Hhisnum!.Trim()))
            .OrderBy(x => (x.Hbed ?? "").Trim())
            .ThenBy(x => (x.ExamName ?? "").Trim())
            .Select(x => new
        {
            bedId = (x.Hbed ?? "").Trim(), patientName = MaskName(x.Hnamec), gender = (string?)null,
            examName = (x.ExamName ?? "").Trim(), scheduledDate = FormatExamDate(x.AdmitDate), timeSlot = "",
            status = MapExamStatus(x.Status), notes = ""
        });

        var consults = rows.Where(r => r.Kind == "會診")
            // 未完成（待回覆）視為進行中排最前，其餘依會診完成時間新到舊
            .OrderByDescending(r => string.IsNullOrWhiteSpace(r.CompletedTime) ? "9999-99-99 99:99" : r.CompletedTime)
            .Select(r => new
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
        "31" => "未執行", "32" => "未排程", "34" => "已排程", var s => s
    };

    /// <summary>轉入日期（ISO/含 T）→ yyyy-MM-dd；無法解析則取前 10 碼或原字串。</summary>
    private static string FormatExamDate(string? raw)
    {
        var s = (raw ?? "").Trim();
        if (string.IsNullOrEmpty(s)) return "";
        return DateTime.TryParse(s, out var d) ? d.ToString("yyyy-MM-dd") : (s.Length >= 10 ? s.Substring(0, 10) : s);
    }

    // 後台 CRUD
    [HttpGet("{unitCode}/examconsult")]
    public async Task<IActionResult> GetExamConsultList(string unitCode, [FromQuery] bool includeAll = true, CancellationToken ct = default)
        => Ok(await _ward.GetExamConsultAsync(unitCode, includeAll, ct));
    [HttpGet("examconsult/{id:int}")]
    public async Task<IActionResult> GetExamConsultById(int id, CancellationToken ct = default)
    { var x = await _ward.GetExamConsultByIdAsync(id, ct); return x is null ? NotFound() : Ok(x); }
    [HttpPost("examconsult")]
    public async Task<IActionResult> CreateExamConsult([FromBody] WardExamConsultUpsertRequest req, CancellationToken ct = default)
    { var id = await _ward.CreateExamConsultAsync(req, ct); return CreatedAtAction(nameof(GetExamConsultById), new { id }, await _ward.GetExamConsultByIdAsync(id, ct)); }
    [HttpPut("examconsult/{id:int}")]
    public async Task<IActionResult> UpdateExamConsult(int id, [FromBody] WardExamConsultUpsertRequest req, CancellationToken ct = default)
        => await _ward.UpdateExamConsultAsync(id, req, ct) ? Ok(await _ward.GetExamConsultByIdAsync(id, ct)) : NotFound();
    [HttpDelete("examconsult/{id:int}")]
    public async Task<IActionResult> DeleteExamConsult(int id, CancellationToken ct = default)
        => await _ward.DeleteExamConsultAsync(id, ct) ? NoContent() : NotFound();

    // ── ICU 抗生素（自建；看板＋後台共用，以病歷號掛載）──────────────
    /// <summary>看板＋後台共用：某站抗生素列（camelCase；includeAll=false 僅啟用）。前端以 hhisnum 對應在床病人。</summary>
    [HttpGet("{unitCode}/antibiotic")]
    public async Task<IActionResult> GetAntibiotic(string unitCode, [FromQuery] bool includeAll = false, CancellationToken ct = default)
        => Ok(await _ward.GetAntibioticAsync(unitCode, includeAll, ct));
    [HttpGet("antibiotic/{id:int}")]
    public async Task<IActionResult> GetAntibioticById(int id, CancellationToken ct = default)
    { var x = await _ward.GetAntibioticByIdAsync(id, ct); return x is null ? NotFound() : Ok(x); }
    [HttpPost("antibiotic")]
    public async Task<IActionResult> CreateAntibiotic([FromBody] IcuAntibioticUpsertRequest req, CancellationToken ct = default)
    { var id = await _ward.CreateAntibioticAsync(req, ct); return CreatedAtAction(nameof(GetAntibioticById), new { id }, await _ward.GetAntibioticByIdAsync(id, ct)); }
    [HttpPut("antibiotic/{id:int}")]
    public async Task<IActionResult> UpdateAntibiotic(int id, [FromBody] IcuAntibioticUpsertRequest req, CancellationToken ct = default)
        => await _ward.UpdateAntibioticAsync(id, req, ct) ? Ok(await _ward.GetAntibioticByIdAsync(id, ct)) : NotFound();
    [HttpDelete("antibiotic/{id:int}")]
    public async Task<IActionResult> DeleteAntibiotic(int id, CancellationToken ct = default)
        => await _ward.DeleteAntibioticAsync(id, ct) ? NoContent() : NotFound();

    /// <summary>看板：ICU 實際用藥（自院方 Board_bed 帶入，以病歷號對應在床病人）。
    /// 目前欄名雖為「抗生素」實為全部用藥、暫不過濾藥品種類；僅取「使用中」(結束日 ≥ 今日或無結束日) 避免列出大量歷史。
    /// 回傳與自建 antibiotic 相同的 camelCase 形狀，前端免改渲染。</summary>
    [HttpGet("{unitCode}/antibiotic/live")]
    public async Task<IActionResult> GetAntibioticLive(string unitCode, CancellationToken ct = default)
    {
        if (unitCode.ToUpperInvariant() != "ICU") return Ok(Array.Empty<object>());
        // AICU(4F)＋CICU(3F)；院方目前忽略病房參數會回同一份，跨呼叫以病歷號去重避免用藥重複計。
        var beds = (await SafeBoardAsync("AICU", ct)).Concat(await SafeBoardAsync("CICU", ct))
            .Where(b => !string.IsNullOrWhiteSpace(b.Hhisnum))
            .GroupBy(b => b.Hhisnum!.Trim())
            .Select(g => g.First())
            .ToList();
        var today = DateTime.Today;
        var rows = new List<object>();
        int id = 0;
        foreach (var b in beds)
        {
            var his = b.Hhisnum!.Trim();
            foreach (var m in b.Meds)
            {
                if (string.IsNullOrWhiteSpace(m.Name)) continue;
                var end = TryDate(m.EndDate);
                if (end is { } ed && ed.Date < today) continue;   // 只留使用中（含未來/未結束）
                rows.Add(new
                {
                    id = ++id, hhisnum = his, drugName = m.Name,
                    startDateTime = JoinDateTime(m.StartDate, m.StartTime),
                    firstDoseDateTime = (string?)null,   // 院方未提供首次給藥
                    endDateTime = JoinDateTime(m.EndDate, m.EndTime),
                });
            }
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
    [HttpGet("care-reminder/{id:int}")]
    public async Task<IActionResult> GetCareReminderById(int id, CancellationToken ct = default)
    { var x = await _ward.GetCareReminderByIdAsync(id, ct); return x is null ? NotFound() : Ok(x); }
    [HttpPost("care-reminder")]
    public async Task<IActionResult> CreateCareReminder([FromBody] CareReminderUpsertRequest req, CancellationToken ct = default)
    { var id = await _ward.CreateCareReminderAsync(req, ct); return CreatedAtAction(nameof(GetCareReminderById), new { id }, await _ward.GetCareReminderByIdAsync(id, ct)); }
    [HttpPut("care-reminder/{id:int}")]
    public async Task<IActionResult> UpdateCareReminder(int id, [FromBody] CareReminderUpsertRequest req, CancellationToken ct = default)
        => await _ward.UpdateCareReminderAsync(id, req, ct) ? Ok(await _ward.GetCareReminderByIdAsync(id, ct)) : NotFound();
    [HttpDelete("care-reminder/{id:int}")]
    public async Task<IActionResult> DeleteCareReminder(int id, CancellationToken ct = default)
        => await _ward.DeleteCareReminderAsync(id, ct) ? NoContent() : NotFound();

    // ═══════════════ 人員管理（v14：人員/角色/排班/床位指派/查房/交班/照護團隊）═══════════════

    // ── 人員主檔 ──
    [HttpGet("personnel")]
    public async Task<IActionResult> GetStaff([FromQuery] bool includeAll = true, CancellationToken ct = default)
        => Ok(await _staff.GetStaffAsync(includeAll, ct));
    [HttpGet("personnel/{id:int}")]
    public async Task<IActionResult> GetStaffById(int id, CancellationToken ct = default)
    { var x = await _staff.GetStaffByIdAsync(id, ct); return x is null ? NotFound() : Ok(x); }
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
    [HttpGet("unitrole")]
    public async Task<IActionResult> GetUnitRoles([FromQuery] int? staffId, [FromQuery] string? unit, [FromQuery] bool includeAll = true, CancellationToken ct = default)
        => Ok(await _staff.GetUnitRolesAsync(staffId, unit, includeAll, ct));
    [HttpGet("unitrole/{id:int}")]
    public async Task<IActionResult> GetUnitRoleById(int id, CancellationToken ct = default)
    { var x = await _staff.GetUnitRoleByIdAsync(id, ct); return x is null ? NotFound() : Ok(x); }
    [HttpPost("unitrole")]
    public async Task<IActionResult> CreateUnitRole([FromBody] StaffUnitRoleUpsertRequest req, CancellationToken ct = default)
    { var id = await _staff.CreateUnitRoleAsync(req, ct); return CreatedAtAction(nameof(GetUnitRoleById), new { id }, await _staff.GetUnitRoleByIdAsync(id, ct)); }
    [HttpPut("unitrole/{id:int}")]
    public async Task<IActionResult> UpdateUnitRole(int id, [FromBody] StaffUnitRoleUpsertRequest req, CancellationToken ct = default)
        => await _staff.UpdateUnitRoleAsync(id, req, ct) ? Ok(await _staff.GetUnitRoleByIdAsync(id, ct)) : NotFound();
    [HttpDelete("unitrole/{id:int}")]
    public async Task<IActionResult> DeleteUnitRole(int id, CancellationToken ct = default)
        => await _staff.DeleteUnitRoleAsync(id, ct) ? NoContent() : NotFound();

    // ── 全院共用主檔：科別 Department（先建科別、再建醫師）────────────
    [HttpGet("department")]
    public async Task<IActionResult> GetDepartments([FromQuery] bool includeAll = true, CancellationToken ct = default)
        => Ok(await _master.GetDepartmentsAsync(includeAll, ct));
    [HttpPost("department")]
    public async Task<IActionResult> CreateDepartment([FromBody] DepartmentUpsertRequest req, CancellationToken ct = default)
    { var id = await _master.CreateDepartmentAsync(req, ct); return Ok(new { id }); }
    [HttpPut("department/{id:int}")]
    public async Task<IActionResult> UpdateDepartment(int id, [FromBody] DepartmentUpsertRequest req, CancellationToken ct = default)
        => await _master.UpdateDepartmentAsync(id, req, ct) ? NoContent() : NotFound();
    [HttpDelete("department/{id:int}")]
    public async Task<IActionResult> DeleteDepartment(int id, CancellationToken ct = default)
    {
        var (deleted, reason) = await _master.DeleteDepartmentAsync(id, ct);
        if (deleted) return NoContent();
        return reason is null ? NotFound() : Conflict(new { message = reason });   // 已被醫師使用 → 409＋原因
    }

    // ── 全院共用主檔：醫師 Doctor（DeptCode 對應 Department.Code）─────
    [HttpGet("doctor")]
    public async Task<IActionResult> GetDoctors([FromQuery] bool includeAll = true, [FromQuery] string? deptCode = null, CancellationToken ct = default)
        => Ok(await _master.GetDoctorsAsync(includeAll, deptCode, ct));
    [HttpPost("doctor")]
    public async Task<IActionResult> CreateDoctor([FromBody] DoctorUpsertRequest req, CancellationToken ct = default)
    { var id = await _master.CreateDoctorAsync(req, ct); return Ok(new { id }); }
    [HttpPut("doctor/{id:int}")]
    public async Task<IActionResult> UpdateDoctor(int id, [FromBody] DoctorUpsertRequest req, CancellationToken ct = default)
        => await _master.UpdateDoctorAsync(id, req, ct) ? NoContent() : NotFound();
    [HttpDelete("doctor/{id:int}")]
    public async Task<IActionResult> DeleteDoctor(int id, CancellationToken ct = default)
        => await _master.DeleteDoctorAsync(id, ct) ? NoContent() : NotFound();

    // ── 全院共用主檔：照服員 CareAide ─────
    [HttpGet("care-aide")]
    public async Task<IActionResult> GetCareAides([FromQuery] bool includeAll = true, CancellationToken ct = default)
        => Ok(await _master.GetCareAidesAsync(includeAll, ct));
    [HttpPost("care-aide")]
    public async Task<IActionResult> CreateCareAide([FromBody] CareAideUpsertRequest req, CancellationToken ct = default)
    { var id = await _master.CreateCareAideAsync(req, ct); return Ok(new { id }); }
    [HttpPut("care-aide/{id:int}")]
    public async Task<IActionResult> UpdateCareAide(int id, [FromBody] CareAideUpsertRequest req, CancellationToken ct = default)
        => await _master.UpdateCareAideAsync(id, req, ct) ? NoContent() : NotFound();
    [HttpDelete("care-aide/{id:int}")]
    public async Task<IActionResult> DeleteCareAide(int id, CancellationToken ct = default)
        => await _master.DeleteCareAideAsync(id, ct) ? NoContent() : NotFound();

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

        string Cat(string? role) => role switch
        {
            var r when r != null && r.Contains("住院") => "resident",
            var r when r != null && (r.Contains("專科") || r.Contains("專師")) => "specialist",
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
            specialists = g.Where(r => Cat(r.Role) == "specialist").Select(r => new {
                staffId = r.StaffId, peNo = r.EmployeeNo, peName = r.Name, specialty = r.Department, extension = r.Ext }),
            residents = g.Where(r => Cat(r.Role) == "resident").Select(r => new {
                staffId = r.StaffId, peNo = r.EmployeeNo, peName = r.Name, department = r.Department, extension = r.Ext })
        });
        return Ok(new { unitCode, queryDate = d, shifts });
    }

    // ── 排班 CRUD（admin）──
    [HttpGet("{unitCode}/schedule-list")]
    public async Task<IActionResult> GetScheduleList(string unitCode, [FromQuery] string? date, [FromQuery] bool includeAll = true, CancellationToken ct = default)
        => Ok(await _staff.GetScheduleAsync(unitCode, date, includeAll, ct));
    [HttpGet("schedule/{id:int}")]
    public async Task<IActionResult> GetScheduleById(int id, CancellationToken ct = default)
    { var x = await _staff.GetScheduleByIdAsync(id, ct); return x is null ? NotFound() : Ok(x); }
    [HttpPost("schedule")]
    public async Task<IActionResult> CreateSchedule([FromBody] StaffScheduleUpsertRequest req, CancellationToken ct = default)
    { var id = await _staff.CreateScheduleAsync(req, ct); return CreatedAtAction(nameof(GetScheduleById), new { id }, await _staff.GetScheduleByIdAsync(id, ct)); }
    [HttpPut("schedule/{id:int}")]
    public async Task<IActionResult> UpdateSchedule(int id, [FromBody] StaffScheduleUpsertRequest req, CancellationToken ct = default)
        => await _staff.UpdateScheduleAsync(id, req, ct) ? Ok(await _staff.GetScheduleByIdAsync(id, ct)) : NotFound();
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
    [HttpGet("{unitCode}/bedassign")]
    public async Task<IActionResult> GetBedAssign(string unitCode, [FromQuery] string? date, [FromQuery] string? type, [FromQuery] bool includeAll = true, CancellationToken ct = default)
        => Ok(await _staff.GetBedAssignAsync(unitCode, date, type, includeAll, ct));
    [HttpGet("bedassign/{id:int}")]
    public async Task<IActionResult> GetBedAssignById(int id, CancellationToken ct = default)
    { var x = await _staff.GetBedAssignByIdAsync(id, ct); return x is null ? NotFound() : Ok(x); }
    [HttpPost("bedassign")]
    public async Task<IActionResult> CreateBedAssign([FromBody] BedStaffAssignmentUpsertRequest req, CancellationToken ct = default)
    { var id = await _staff.CreateBedAssignAsync(req, ct); return CreatedAtAction(nameof(GetBedAssignById), new { id }, await _staff.GetBedAssignByIdAsync(id, ct)); }
    [HttpPut("bedassign/{id:int}")]
    public async Task<IActionResult> UpdateBedAssign(int id, [FromBody] BedStaffAssignmentUpsertRequest req, CancellationToken ct = default)
        => await _staff.UpdateBedAssignAsync(id, req, ct) ? Ok(await _staff.GetBedAssignByIdAsync(id, ct)) : NotFound();
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
    [HttpGet("{unitCode}/round-list")]
    public async Task<IActionResult> GetRoundList(string unitCode, [FromQuery] string? date, [FromQuery] bool includeAll = true, CancellationToken ct = default)
        => Ok(await _staff.GetRoundAsync(unitCode, date, includeAll, ct));
    [HttpGet("round/{id:int}")]
    public async Task<IActionResult> GetRoundById(int id, CancellationToken ct = default)
    { var x = await _staff.GetRoundByIdAsync(id, ct); return x is null ? NotFound() : Ok(x); }
    [HttpPost("round")]
    public async Task<IActionResult> CreateRound([FromBody] DoctorRoundUpsertRequest req, CancellationToken ct = default)
    { var id = await _staff.CreateRoundAsync(req, ct); return CreatedAtAction(nameof(GetRoundById), new { id }, await _staff.GetRoundByIdAsync(id, ct)); }
    [HttpPut("round/{id:int}")]
    public async Task<IActionResult> UpdateRound(int id, [FromBody] DoctorRoundUpsertRequest req, CancellationToken ct = default)
        => await _staff.UpdateRoundAsync(id, req, ct) ? Ok(await _staff.GetRoundByIdAsync(id, ct)) : NotFound();
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
    [HttpGet("{unitCode}/handover-shifts")]
    public async Task<IActionResult> GetHandoverShifts(string unitCode, [FromQuery] string? date, [FromQuery] bool includeAll = true, CancellationToken ct = default)
        => Ok(await _staff.GetHandoverShiftsAsync(unitCode, date, null, includeAll, ct));
    [HttpGet("handover-shift/{id:int}")]
    public async Task<IActionResult> GetHandoverShiftById(int id, CancellationToken ct = default)
    { var x = await _staff.GetHandoverShiftByIdAsync(id, ct); return x is null ? NotFound() : Ok(x); }
    [HttpPost("handover-shift")]
    public async Task<IActionResult> CreateHandoverShift([FromBody] HandoverShiftUpsertRequest req, CancellationToken ct = default)
    { var id = await _staff.CreateHandoverShiftAsync(req, ct); return CreatedAtAction(nameof(GetHandoverShiftById), new { id }, await _staff.GetHandoverShiftByIdAsync(id, ct)); }
    [HttpPut("handover-shift/{id:int}")]
    public async Task<IActionResult> UpdateHandoverShift(int id, [FromBody] HandoverShiftUpsertRequest req, CancellationToken ct = default)
        => await _staff.UpdateHandoverShiftAsync(id, req, ct) ? Ok(await _staff.GetHandoverShiftByIdAsync(id, ct)) : NotFound();
    [HttpDelete("handover-shift/{id:int}")]
    public async Task<IActionResult> DeleteHandoverShift(int id, CancellationToken ct = default)
        => await _staff.DeleteHandoverShiftAsync(id, ct) ? NoContent() : NotFound();

    [HttpGet("handover-shift/{shiftId:int}/patients")]
    public async Task<IActionResult> GetHandoverPatients(int shiftId, CancellationToken ct = default)
        => Ok(await _staff.GetHandoverPatientsAsync(shiftId, ct));
    [HttpPost("handover-patient")]
    public async Task<IActionResult> CreateHandoverPatient([FromBody] HandoverPatientUpsertRequest req, CancellationToken ct = default)
    { var id = await _staff.CreateHandoverPatientAsync(req, ct); return Ok(new { id }); }
    [HttpPut("handover-patient/{id:int}")]
    public async Task<IActionResult> UpdateHandoverPatient(int id, [FromBody] HandoverPatientUpsertRequest req, CancellationToken ct = default)
        => await _staff.UpdateHandoverPatientAsync(id, req, ct) ? NoContent() : NotFound();
    [HttpDelete("handover-patient/{id:int}")]
    public async Task<IActionResult> DeleteHandoverPatient(int id, CancellationToken ct = default)
        => await _staff.DeleteHandoverPatientAsync(id, ct) ? NoContent() : NotFound();

    [HttpGet("handover-patient/{patientId:int}/notes")]
    public async Task<IActionResult> GetHandoverNotes(int patientId, CancellationToken ct = default)
        => Ok(await _staff.GetHandoverNotesAsync(patientId, ct));
    [HttpPost("handover-note")]
    public async Task<IActionResult> CreateHandoverNote([FromBody] HandoverNoteUpsertRequest req, CancellationToken ct = default)
    { var id = await _staff.CreateHandoverNoteAsync(req, ct); return Ok(new { id }); }
    [HttpPut("handover-note/{id:int}")]
    public async Task<IActionResult> UpdateHandoverNote(int id, [FromBody] HandoverNoteUpsertRequest req, CancellationToken ct = default)
        => await _staff.UpdateHandoverNoteAsync(id, req, ct) ? NoContent() : NotFound();
    [HttpDelete("handover-note/{id:int}")]
    public async Task<IActionResult> DeleteHandoverNote(int id, CancellationToken ct = default)
        => await _staff.DeleteHandoverNoteAsync(id, ct) ? NoContent() : NotFound();

    // ── 照護團隊：看板組裝（TeamTab）── 由 StaffUnitRole 依 GroupKey 分組
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
