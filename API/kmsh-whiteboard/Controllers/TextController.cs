using System.ComponentModel;
using kmsh_whiteboard.Models.Db;
using kmsh_whiteboard.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace kmsh_whiteboard.Controllers;

/// <summary>本地文字內容管理（跑馬燈 / 佈告欄）— 本地資料庫</summary>
[ApiController]
[Route("api/[controller]")]
public class TextController : ControllerBase
{
    private readonly ITextRepository _repo;

    public TextController(ITextRepository repo) => _repo = repo;

    /// <summary>查詢文字內容清單</summary>
    /// <remarks>
    /// 用途：管理後台讀取跑馬燈、佈告欄等自建內容。
    ///
    /// category 常用值：
    /// - marquee：跑馬燈（各板公告欄文字）
    /// - bulletin_unit：科內公告（顯示在白板佈告欄左欄）
    /// - bulletin_hosp：院方公告（unitCode 固定為 ALL，顯示在白板佈告欄右欄）
    ///
    /// unitCode 常用值：W52、ICU、OR、ER、ALL（院方公告用）。
    ///
    /// includeAll=false（預設）：只回傳啟用中（IsActive=1）的項目，供前台白板使用。
    /// includeAll=true：回傳含停用項目，供管理後台使用。
    /// </remarks>
    /// <param name="unitCode">單位代號（選填），範例：W52</param>
    /// <param name="category">分類（選填），範例：marquee</param>
    /// <param name="includeAll">是否包含停用項目（預設 false，管理後台傳 true）</param>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery, DefaultValue("W52")] string? unitCode,
        [FromQuery, DefaultValue("marquee")] string? category,
        [FromQuery, DefaultValue(false)] bool includeAll = false,
        CancellationToken ct = default)
    {
        var list = await _repo.GetAllAsync(unitCode, category, includeAll, ct);
        return Ok(list);
    }

    /// <summary>查詢單筆文字內容</summary>
    /// <param name="id">資料 Id</param>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken ct = default)
    {
        var item = await _repo.GetByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    /// <summary>新增文字內容</summary>
    /// <remarks>
    /// 建立新的跑馬燈或佈告欄內容。Priority 欄位：重要 / 一般（佈告欄用，跑馬燈可留空）。
    /// </remarks>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] TextCreateRequest req, CancellationToken ct = default)
    {
        var newId = await _repo.CreateAsync(req, ct);
        var created = await _repo.GetByIdAsync(newId, ct);
        return CreatedAtAction(nameof(GetById), new { id = newId }, created);
    }

    /// <summary>修改文字內容</summary>
    /// <param name="id">資料 Id</param>
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] TextUpdateRequest req, CancellationToken ct = default)
    {
        var ok = await _repo.UpdateAsync(id, req, ct);
        if (!ok) return NotFound();
        var updated = await _repo.GetByIdAsync(id, ct);
        return Ok(updated);
    }

    /// <summary>刪除文字內容</summary>
    /// <param name="id">資料 Id</param>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct = default)
    {
        var ok = await _repo.DeleteAsync(id, ct);
        return ok ? NoContent() : NotFound();
    }
}
