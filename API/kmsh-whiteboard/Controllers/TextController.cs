using kmsh_whiteboard.Models.Db;
using kmsh_whiteboard.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace kmsh_whiteboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TextController : ControllerBase
{
    private readonly ITextRepository _repo;

    public TextController(ITextRepository repo) => _repo = repo;

    /// <summary>查詢清單</summary>
    /// <param name="unitCode">單位代號（選填）</param>
    /// <param name="category">分類（選填）</param>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? unitCode,
        [FromQuery] string? category,
        CancellationToken ct)
    {
        var list = await _repo.GetAllAsync(unitCode, category, ct);
        return Ok(list);
    }

    /// <summary>查詢單筆</summary>
    /// <param name="id">資料 Id</param>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken ct)
    {
        var item = await _repo.GetByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    /// <summary>新增</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] TextCreateRequest req, CancellationToken ct)
    {
        var newId = await _repo.CreateAsync(req, ct);
        var created = await _repo.GetByIdAsync(newId, ct);
        return CreatedAtAction(nameof(GetById), new { id = newId }, created);
    }

    /// <summary>修改</summary>
    /// <param name="id">資料 Id</param>
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] TextUpdateRequest req, CancellationToken ct)
    {
        var ok = await _repo.UpdateAsync(id, req, ct);
        if (!ok) return NotFound();
        var updated = await _repo.GetByIdAsync(id, ct);
        return Ok(updated);
    }

    /// <summary>刪除</summary>
    /// <param name="id">資料 Id</param>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var ok = await _repo.DeleteAsync(id, ct);
        return ok ? NoContent() : NotFound();
    }
}
