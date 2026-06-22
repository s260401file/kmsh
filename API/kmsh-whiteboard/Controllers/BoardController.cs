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

    // ── 私有輔助 ───────────────────────────────────────────────────
    /// <summary>呼叫 Board_bed 取病房在床清單；失敗時記錄並回空清單（白板不中斷）。</summary>
    private async Task<List<BoardBedItem>> SafeBoardAsync(string ward, CancellationToken ct)
    {
        try { return await _board.GetBedListAsync(ward, ct); }
        catch (Exception ex) { _logger.LogWarning(ex, "Board_bed {Ward} 取得失敗，以空清單續行", ward); return new(); }
    }

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
