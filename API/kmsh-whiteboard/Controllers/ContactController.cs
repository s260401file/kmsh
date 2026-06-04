using System.ComponentModel;
using kmsh_whiteboard.Models.Db;
using kmsh_whiteboard.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace kmsh_whiteboard.Controllers;

/// <summary>連絡資訊管理（值班人員 + 常用電話）— 本地資料庫</summary>
[ApiController]
[Route("api/[controller]")]
public class ContactController : ControllerBase
{
    private readonly IContactRepository _repo;

    public ContactController(IContactRepository repo) => _repo = repo;

    // ══ 值班人員 ══════════════════════════════════════════════════

    /// <summary>查詢值班人員清單</summary>
    /// <remarks>
    /// 白板前台：includeAll=false（預設），只回傳啟用中項目。
    /// 管理後台：includeAll=true，回傳含停用項目。
    /// ShiftType 欄位：ER 板使用（白班/小夜/大夜），其他板為 null。
    /// </remarks>
    /// <param name="unitCode">單位代號（必填），範例：W52</param>
    /// <param name="includeAll">是否包含停用項目（管理後台傳 true）</param>
    [HttpGet("duty")]
    public async Task<IActionResult> GetDuty(
        [FromQuery, DefaultValue("W52")] string unitCode,
        [FromQuery, DefaultValue(false)] bool includeAll = false,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(unitCode))
            return BadRequest(new { message = "unitCode 為必填" });

        var list = await _repo.GetDutyAsync(unitCode, includeAll, ct);
        return Ok(list);
    }

    /// <summary>查詢單筆值班人員</summary>
    [HttpGet("duty/{id:int}")]
    public async Task<IActionResult> GetDutyById(int id, CancellationToken ct = default)
    {
        var item = await _repo.GetDutyByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    /// <summary>新增值班人員</summary>
    /// <remarks>ShiftType 選填：白班 / 小夜 / 大夜（ER 板用），其他板留空即可。</remarks>
    [HttpPost("duty")]
    public async Task<IActionResult> CreateDuty([FromBody] DutyContactUpsertRequest req, CancellationToken ct = default)
    {
        var newId = await _repo.CreateDutyAsync(req, ct);
        var created = await _repo.GetDutyByIdAsync(newId, ct);
        return CreatedAtAction(nameof(GetDutyById), new { id = newId }, created);
    }

    /// <summary>修改值班人員</summary>
    /// <param name="id">資料 Id</param>
    [HttpPut("duty/{id:int}")]
    public async Task<IActionResult> UpdateDuty(int id, [FromBody] DutyContactUpsertRequest req, CancellationToken ct = default)
    {
        var ok = await _repo.UpdateDutyAsync(id, req, ct);
        if (!ok) return NotFound();
        return Ok(await _repo.GetDutyByIdAsync(id, ct));
    }

    /// <summary>刪除值班人員</summary>
    /// <param name="id">資料 Id</param>
    [HttpDelete("duty/{id:int}")]
    public async Task<IActionResult> DeleteDuty(int id, CancellationToken ct = default)
    {
        var ok = await _repo.DeleteDutyAsync(id, ct);
        return ok ? NoContent() : NotFound();
    }

    // ══ 常用電話 ══════════════════════════════════════════════════

    /// <summary>查詢常用電話清單</summary>
    /// <param name="unitCode">單位代號（必填），範例：W52</param>
    /// <param name="includeAll">是否包含停用項目（管理後台傳 true）</param>
    [HttpGet("common")]
    public async Task<IActionResult> GetCommon(
        [FromQuery, DefaultValue("W52")] string unitCode,
        [FromQuery, DefaultValue(false)] bool includeAll = false,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(unitCode))
            return BadRequest(new { message = "unitCode 為必填" });

        var list = await _repo.GetCommonAsync(unitCode, includeAll, ct);
        return Ok(list);
    }

    /// <summary>查詢單筆常用電話</summary>
    [HttpGet("common/{id:int}")]
    public async Task<IActionResult> GetCommonById(int id, CancellationToken ct = default)
    {
        var item = await _repo.GetCommonByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    /// <summary>新增常用電話</summary>
    [HttpPost("common")]
    public async Task<IActionResult> CreateCommon([FromBody] CommonContactUpsertRequest req, CancellationToken ct = default)
    {
        var newId = await _repo.CreateCommonAsync(req, ct);
        var created = await _repo.GetCommonByIdAsync(newId, ct);
        return CreatedAtAction(nameof(GetCommonById), new { id = newId }, created);
    }

    /// <summary>修改常用電話</summary>
    /// <param name="id">資料 Id</param>
    [HttpPut("common/{id:int}")]
    public async Task<IActionResult> UpdateCommon(int id, [FromBody] CommonContactUpsertRequest req, CancellationToken ct = default)
    {
        var ok = await _repo.UpdateCommonAsync(id, req, ct);
        if (!ok) return NotFound();
        return Ok(await _repo.GetCommonByIdAsync(id, ct));
    }

    /// <summary>刪除常用電話</summary>
    /// <param name="id">資料 Id</param>
    [HttpDelete("common/{id:int}")]
    public async Task<IActionResult> DeleteCommon(int id, CancellationToken ct = default)
    {
        var ok = await _repo.DeleteCommonAsync(id, ct);
        return ok ? NoContent() : NotFound();
    }
}
