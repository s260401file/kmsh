using System.Globalization;
using kmsh_whiteboard.Models.Board;
using kmsh_whiteboard.Models.Db;
using kmsh_whiteboard.Repositories;
using kmsh_whiteboard.Services;
using Microsoft.AspNetCore.Mvc;

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
    private readonly ILogger<BoardController> _logger;

    public BoardController(IBoardApiService board, IWardRepository ward, ILogger<BoardController> logger)
    {
        _board = board;
        _ward = ward;
        _logger = logger;
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
                    PatientName = o.Hnamec,
                    Gender = o.Hsex,
                    BirthDate = FormatBirth(o.Hbirthdt),
                    Age = CalcAge(o.Hbirthdt),
                    MedicalRecordNo = o.Hhisnum,
                    IdNo = o.Hidno,                       // 身分證（白板需顯示）
                    // 臨床（自建補充層；無資料則預設）
                    Department = e?.Department,
                    AdmissionDate = e?.AdmissionDate,
                    Diagnosis = e?.Diagnosis,
                    AttendingDoctor = e?.AttendingDoctor,
                    PrimaryNurse = e?.PrimaryNurse,
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
                        Name = o.Hnamec, Gender = o.Hsex, BirthDate = FormatBirth(o.Hbirthdt), Age = CalcAge(o.Hbirthdt),
                        MedRecord = o.Hhisnum, IdNo = o.Hidno,
                        Department = e?.Department, Admission = e?.AdmissionDate, Diagnosis = e?.Diagnosis,
                        Doctor = e?.AttendingDoctor, Nurse = e?.PrimaryNurse, Condition = e?.Condition, Isolation = e?.Isolation,
                        Dnr = e?.Dnr ?? false, Ventilator = e?.Ventilator ?? false, Crrt = e?.Crrt ?? false,
                        Ng = e?.Ng ?? false, Foley = e?.Foley ?? false, Cvc = e?.CVC ?? false,
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
        return Ok(result);
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

        var resp = new ErBoardResponse
        {
            Count = occ.Count,
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
                bed.Status = DeriveErStatus(e);
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
                SortOrder = 9000, Status = DeriveErStatus(e), Patient = BuildErPatient(kv.Value, e)
            });
        }

        return Ok(resp);
    }

    /// <summary>合併 Board_ER 真實病人 ＋ WardPatientExt overlay → ER 病人卡 DTO。</summary>
    private static ErBedPatientDto BuildErPatient(BoardErItem o, WardPatientExtItem? e) => new()
    {
        PatientName = o.Hnamec, Gender = o.Hsex, BirthDate = FormatBirth(o.Hbirthdt), Age = CalcAge(o.Hbirthdt),
        MedRecord = o.Hhisnum, IdNo = o.Hidno, Doctor = o.Doctor, DoctorCard = o.DoctorCard,
        Flow = o.Flow, Category = o.Category,
        Triage = int.TryParse(o.Triage?.Trim(), out var t) ? t : (int?)null, TriageGrade = TriageToGrade(o.Triage),
        Department = e?.Department, Nurse = e?.PrimaryNurse, Diagnosis = e?.Diagnosis, Isolation = e?.Isolation, Notes = e?.Notes,
        ArrivalDate = e?.ArrivalDate, ArrivalTime = e?.ArrivalTime,
        Observation = e?.Observation ?? false, Awaiting = e?.Awaiting ?? false, AwaitingType = e?.AwaitingType,
        TransferIn = e?.TransferIn ?? false, TransferOut = e?.TransferOut ?? false, TransferHospital = e?.TransferHospital,
        Admitted = e?.Admitted ?? false, AdmBedNo = e?.AdmBedNo,
        Dnr = e?.Dnr ?? false, Aad = e?.Aad ?? false, Mbd = e?.Mbd ?? false, Deceased = e?.Deceased ?? false,
        FallRisk = e?.FallRisk ?? false, Allergy = e?.Allergy ?? false, Exam = e?.Exam ?? false, Consult = e?.Consult ?? false
    };

    /// <summary>由 overlay 旗標推導床位狀態（隔離→轉床→待床→留觀→否則 occupied）；空床由呼叫端設 empty。</summary>
    private static string DeriveErStatus(WardPatientExtItem? e)
    {
        if (e is null) return "occupied";
        if (!string.IsNullOrWhiteSpace(e.Isolation) && e.Isolation!.Trim() is not ("" or "無")) return "isolation";
        if (e.TransferIn || e.TransferOut) return "transfer";
        if (e.Awaiting) return "awaiting";
        if (e.Observation) return "observation";
        return "occupied";
    }

    /// <summary>
    /// OR 手術動態：自建刀房主檔(OrRoom)鋪 4×2 房卡 ＋ Board_OR 今日手術(以 ApiRoom merge)
    /// ＋ WardPatientExt(OR) overlay 補狀態/起訖/刷手流動。每房顯示今日「進行中/首台」＋今日台數。
    /// </summary>
    [HttpGet("or")]
    public async Task<IActionResult> GetOr(CancellationToken ct = default)
    {
        List<BoardOrItem> occ;
        try { occ = await _board.GetOrListAsync(ct); }
        catch (Exception ex) { _logger.LogWarning(ex, "Board_OR 取得失敗，以空清單續行"); occ = new(); }

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

        // 今日手術（手術日期＝今天），依刀房代碼分組、依手術時間排序
        var today = DateTime.Today;
        var todayByRoom = occ
            .Where(o => !string.IsNullOrWhiteSpace(o.Room) && ParseBirth(o.OpDate) is { } d && d.Date == today)
            .GroupBy(o => o.Room!.Trim(), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.OrderBy(x => x.OpTime ?? "").ToList(), StringComparer.OrdinalIgnoreCase);

        var resp = new OrBoardResponse
        {
            Count = todayByRoom.Values.Sum(v => v.Count),
            Version = extList.Count > 0
                ? new DateTimeOffset(extList.Max(e => e.UpdatedAt), TimeSpan.Zero).ToUnixTimeSeconds()
                : 0
        };

        foreach (var r in rooms)
        {
            var dto = new OrRoomDto { RoomId = r.RoomId, ApiRoom = r.ApiRoom, SortOrder = r.SortOrder };
            if (!string.IsNullOrWhiteSpace(r.ApiRoom) && todayByRoom.TryGetValue(r.ApiRoom!.Trim(), out var list) && list.Count > 0)
            {
                dto.Surgeries = list.Select(o => BuildOrSurgery(o, ExtOf(o.Hhisnum))).ToList();
                dto.TodayCount = dto.Surgeries.Count;
                var current = dto.Surgeries.FirstOrDefault(s => s.SurgeryStatus == "手術中") ?? dto.Surgeries[0];
                dto.Patient = current;
                dto.Status = StatusToClass(current.SurgeryStatus);
            }
            resp.Rooms.Add(dto);
        }
        return Ok(resp);
    }

    /// <summary>合併 Board_OR 真實手術 ＋ WardPatientExt overlay → OR 手術 DTO。</summary>
    private static OrSurgeryDto BuildOrSurgery(BoardOrItem o, WardPatientExtItem? e) => new()
    {
        PatientName = o.Hnamec, Gender = o.Hsex, Age = CalcAge(o.Hbirthdt), BirthDate = FormatBirth(o.Hbirthdt),
        MedRecord = o.Hhisnum, Diagnosis = string.IsNullOrWhiteSpace(o.Diagnosis) ? e?.Diagnosis : o.Diagnosis,
        SurgeryName = o.Surgery, Doctor = o.Doctor, AnesType = o.Anes, SurgerySource = SourceToLabel(o.Source),
        ScheduledTime = o.OpTime,
        SurgeryStatus = e?.SurgeryStatus, StartTime = e?.StartTime, EndTime = e?.EndTime,
        Department = e?.Department, ScrubNurse = e?.ScrubNurse, CircNurse = e?.CircNurse, Notes = e?.Notes
    };

    /// <summary>手術狀態中文 → 卡片 class；無 overlay 狀態則 scheduled(排程)。</summary>
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

    // ── 私有輔助 ───────────────────────────────────────────────────
    /// <summary>呼叫 Board_bed 取病房在床清單；失敗時記錄並回空清單（白板不中斷）。</summary>
    private async Task<List<BoardBedItem>> SafeBoardAsync(string ward, CancellationToken ct)
    {
        try { return await _board.GetBedListAsync(ward, ct); }
        catch (Exception ex) { _logger.LogWarning(ex, "Board_bed {Ward} 取得失敗，以空清單續行", ward); return new(); }
    }

    /// <summary>
    /// ER 床號對應：病房(英文前綴) ＋ 床位 → 白板床號。
    /// 床位為數字則去前導零、不足兩位補零（MER+007→MER07、MER+022→MER22、MER+991→MER991）；
    /// 前綴直接用 Board_ER 回傳的「病房」值（負壓/OER 等亦同，待院方確認其英文代碼）。
    /// </summary>
    private static string? MapErBedId(string? ward, string? bed)
    {
        var w = ward?.Trim();
        var b = bed?.Trim();
        if (string.IsNullOrWhiteSpace(w) || string.IsNullOrWhiteSpace(b)) return null;
        return int.TryParse(b, out var n) ? w + (n < 100 ? n.ToString("00") : n.ToString()) : w + b;
    }

    /// <summary>檢傷分類 1–5 → A/B/C（A:1-2 重症、B:3 中症、C:4-5 輕症）；無法解析回 null。</summary>
    // 急診檢傷僅 3 級：院方真實值 1/2/3 → A/B/C（1→A 重症、2→B 中症、3→C 輕症）
    private static string? TriageToGrade(string? triage)
        => int.TryParse(triage, out var t) ? (t == 1 ? "A" : (t == 2 ? "B" : "C")) : null;

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
}
