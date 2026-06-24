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
                    AdmissionDate = FormatBirth(o.AdmitDate) ?? e?.AdmissionDate,   // 院方轉入日期（yyyy/MM/dd）優先
                    Diagnosis = string.IsNullOrWhiteSpace(o.Diagnosis) ? e?.Diagnosis : o.Diagnosis,  // 院方診斷優先
                    AttendingDoctor = string.IsNullOrWhiteSpace(o.Doctor) ? e?.AttendingDoctor : o.Doctor,  // 院方負責醫師優先
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
                        Department = e?.Department, Admission = FormatBirth(o.AdmitDate) ?? e?.AdmissionDate,
                        Diagnosis = string.IsNullOrWhiteSpace(o.Diagnosis) ? e?.Diagnosis : o.Diagnosis,  // 院方診斷優先
                        Doctor = string.IsNullOrWhiteSpace(o.Doctor) ? e?.AttendingDoctor : o.Doctor, Nurse = e?.PrimaryNurse, Condition = e?.Condition, Isolation = e?.Isolation,
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
        Department = e?.Department, Nurse = e?.PrimaryNurse, Diagnosis = e?.Diagnosis,  // Board_ER 無診斷 → 仍用後台
        Isolation = e?.Isolation, Notes = e?.Notes,
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
        var today = DateTime.Today; var now = DateTime.Now;
        await SyncOrDailyIfFetchedAsync(ct);   // 取 Board_OR 成功才同步當日快照（失敗則僅讀快照）

        var daily = (await _ward.GetOrDailyAsync(today, today, ct)).ToList();   // 當日累積快照（含已完成）
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
                dto.Surgeries = list.Select(d => BuildOrSurgeryFromDaily(d, ExtOf(d.Hhisnum), now)).ToList();
                dto.TodayCount = dto.Surgeries.Count;
                // 房卡顯示：優先進行中→準備中→未完成首台→首台
                var current = dto.Surgeries.FirstOrDefault(s => s.SurgeryStatus == "手術中")
                           ?? dto.Surgeries.FirstOrDefault(s => s.SurgeryStatus == "準備中")
                           ?? dto.Surgeries.FirstOrDefault(s => s.SurgeryStatus != "已完成")
                           ?? dto.Surgeries[0];
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
                Doctor = o.Doctor, AnesType = o.Anes, Source = o.Source, OpTime = opt, Diagnosis = o.Diagnosis
            }, ct);
            if (d.Date == today) presentToday.Add($"{apiRoom}|{his}|{opt}");
        }
        await _ward.MarkOrDailyCompletedAsync(today, presentToday, ct);   // 今日消失者→已完成
        await _ward.PurgeOrDailyAsync(today.AddDays(-14), ct);
    }

    /// <summary>當日快照 ＋ WardPatientExt overlay → OR 手術 DTO；Completed→已完成、否則時間/overlay 推導。</summary>
    private static OrSurgeryDto BuildOrSurgeryFromDaily(OrDailySurgeryItem d, WardPatientExtItem? e, DateTime now) => new()
    {
        PatientName = d.PatientName, Gender = d.Gender, Age = CalcAge(d.BirthDate), BirthDate = FormatBirth(d.BirthDate),
        MedRecord = d.Hhisnum, Diagnosis = string.IsNullOrWhiteSpace(d.Diagnosis) ? e?.Diagnosis : d.Diagnosis,
        SurgeryName = d.SurgeryName, Doctor = d.Doctor, AnesType = d.AnesType, SurgerySource = SourceToLabel(d.Source),
        ScheduledTime = d.OpTime,
        SurgeryStatus = d.Completed ? "已完成" : DeriveOrStatus(d.OpTime, e?.StartTime, e?.EndTime, now),
        StartTime = e?.StartTime, EndTime = e?.EndTime,
        Department = e?.Department, ScrubNurse = e?.ScrubNurse, CircNurse = e?.CircNurse, Notes = e?.Notes
    };

    /// <summary>
    /// 手術狀態依時間自動判定（不採手填）：已填實際出刀房→已完成；已填實際進刀房且已過該時間→手術中；
    /// 否則已過預定手術時間→準備中、未到→排程。時間為 HH:mm，已先以「手術日期＝今日」過濾。
    /// </summary>
    private static string DeriveOrStatus(string? sched, string? start, string? end, DateTime now)
    {
        static int? Min(string? t)
        {
            if (string.IsNullOrWhiteSpace(t)) return null;
            var p = t.Trim().Split(':');
            return p.Length >= 2 && int.TryParse(p[0], out var h) && int.TryParse(p[1], out var m) ? h * 60 + m : (int?)null;
        }
        var nowMin = now.Hour * 60 + now.Minute;
        if (Min(end) is not null) return "已完成";
        if (Min(start) is { } st) return nowMin >= st ? "手術中" : "準備中";
        if (Min(sched) is { } sc) return nowMin >= sc ? "準備中" : "排程";
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
            HandoverId = h.Id, RoomId = h.RoomId, SurgerySource = h.SurgerySource, PatientName = h.PatientName,
            Gender = h.Gender, Age = h.Age, MedRecord = h.Hhisnum, SurgeryName = h.SurgeryName, SurgeonName = h.SurgeonName,
            DestWard = h.DestWard, DestBed = h.DestBed, EndTime = h.EndTime, BloodLoss = h.BloodLoss,
            BloodTransfusion = h.BloodTransfusion, DrainDetails = h.DrainDetails, SpecialNotes = h.SpecialNotes
        }).ToList();
        return Ok(resp);
    }

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
            PatientName = d.PatientName, Gender = d.Gender, Age = CalcAge(d.BirthDate),
            Procedure = d.SurgeryName, Diagnosis = d.Diagnosis, AnesthesiaMethod = d.AnesType,
            AttendingSurgeon = d.Doctor,
            Status = d.Completed ? "已完成" : DeriveSurgeryStatus(d.SurgeryDate, d.OpTime, now, today)
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
        var rows = (await _ward.GetExamConsultAsync(unitCode, false, ct)).ToList();
        var exams = rows.Where(r => r.Kind == "檢查").Select(r => new
        {
            bedId = r.BedId, patientName = r.PatientName, gender = r.Gender, examName = r.ItemName,
            scheduledDate = r.ScheduledDate, timeSlot = r.TimeSlot, status = r.Status, notes = r.Notes
        });
        var consults = rows.Where(r => r.Kind == "會診").Select(r => new
        {
            bedId = r.BedId, patientName = r.PatientName, gender = r.Gender, consultDept = r.ItemName,
            consultDoctor = r.Doctor, completedTime = r.CompletedTime, status = r.Status, notes = r.Notes
        });
        return Ok(new { exams, consults });
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
