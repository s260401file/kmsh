using System.ComponentModel;
using kmsh_whiteboard.Models.Db;
using kmsh_whiteboard.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace kmsh_whiteboard.Controllers;

/// <summary>避難圖管理（圖片上傳 + 設備清單 + 緊急聯絡）— 本地資料庫</summary>
[ApiController]
[Route("api/[controller]")]
public class EvacuationController : ControllerBase
{
    private readonly IEvacRepository _repo;
    private readonly IWebHostEnvironment _env;

    public EvacuationController(IEvacRepository repo, IWebHostEnvironment env)
    {
        _repo = repo;
        _env  = env;
    }

    private string UploadDir => Path.Combine(_env.ContentRootPath, "uploads", "evac");

    // ══ 圖片 ══════════════════════════════════════════════════════

    /// <summary>查詢圖片資訊（有無上傳）</summary>
    /// <param name="unitCode">單位代號（必填），範例：W52</param>
    [HttpGet("image/info/{unitCode}")]
    public async Task<IActionResult> GetImageInfo(string unitCode, CancellationToken ct = default)
    {
        var item = await _repo.GetImageAsync(unitCode, ct);
        return item is null ? NotFound(new { message = "尚未上傳" }) : Ok(item);
    }

    /// <summary>取得避難圖圖片（binary）— 供前台 &lt;img src&gt; 使用</summary>
    /// <param name="unitCode">單位代號（必填），範例：W52</param>
    [HttpGet("image/{unitCode}")]
    public async Task<IActionResult> GetImage(string unitCode, CancellationToken ct = default)
    {
        var item = await _repo.GetImageAsync(unitCode, ct);
        if (item is null) return NotFound();

        var filePath = Path.Combine(UploadDir, Path.GetFileName(item.ImagePath));
        if (!System.IO.File.Exists(filePath)) return NotFound();

        var ext = Path.GetExtension(filePath).ToLower();
        var mime = ext switch { ".png" => "image/png", ".gif" => "image/gif", _ => "image/jpeg" };
        var bytes = await System.IO.File.ReadAllBytesAsync(filePath, ct);
        return File(bytes, mime);
    }

    /// <summary>上傳避難圖圖片（multipart/form-data）</summary>
    /// <remarks>unitCode 與 file 需同時傳入。同一板只有一張圖，重複上傳會覆蓋。支援 JPG / PNG。</remarks>
    [HttpPost("image")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadImage(
        [FromForm] string unitCode,
        IFormFile file,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(unitCode)) return BadRequest(new { message = "unitCode 為必填" });
        if (file is null || file.Length == 0)    return BadRequest(new { message = "file 為必填" });

        var ext      = Path.GetExtension(file.FileName).ToLower();
        var allowed  = new[] { ".jpg", ".jpeg", ".png" };
        if (!allowed.Contains(ext)) return BadRequest(new { message = "僅支援 JPG / PNG" });

        Directory.CreateDirectory(UploadDir);
        var fileName = $"{unitCode}{ext}";
        var filePath = Path.Combine(UploadDir, fileName);

        await using var stream = System.IO.File.Create(filePath);
        await file.CopyToAsync(stream, ct);

        await _repo.UpsertImageAsync(unitCode, fileName, file.FileName, ct);
        return Ok(new { message = "上傳成功", fileName });
    }

    /// <summary>刪除避難圖圖片</summary>
    /// <param name="unitCode">單位代號（必填）</param>
    [HttpDelete("image/{unitCode}")]
    public async Task<IActionResult> DeleteImage(string unitCode, CancellationToken ct = default)
    {
        var item = await _repo.GetImageAsync(unitCode, ct);
        if (item is null) return NotFound();

        var filePath = Path.Combine(UploadDir, Path.GetFileName(item.ImagePath));
        if (System.IO.File.Exists(filePath)) System.IO.File.Delete(filePath);

        await _repo.DeleteImageAsync(unitCode, ct);
        return NoContent();
    }

    // ══ 設備清單 ══════════════════════════════════════════════════

    /// <summary>查詢避難設備清單</summary>
    /// <param name="unitCode">單位代號（必填），範例：W52</param>
    /// <param name="includeAll">是否包含停用項目（管理後台傳 true）</param>
    [HttpGet("equipment")]
    public async Task<IActionResult> GetEquipment(
        [FromQuery, DefaultValue("W52")] string unitCode,
        [FromQuery, DefaultValue(false)] bool includeAll = false,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(unitCode)) return BadRequest(new { message = "unitCode 為必填" });
        return Ok(await _repo.GetEquipmentAsync(unitCode, includeAll, ct));
    }

    /// <summary>查詢單筆設備</summary>
    [HttpGet("equipment/{id:int}")]
    public async Task<IActionResult> GetEquipmentById(int id, CancellationToken ct = default)
    {
        var item = await _repo.GetEquipmentByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    /// <summary>新增避難設備</summary>
    [HttpPost("equipment")]
    public async Task<IActionResult> CreateEquipment([FromBody] EvacEquipmentUpsertRequest req, CancellationToken ct = default)
    {
        var id = await _repo.CreateEquipmentAsync(req, ct);
        return CreatedAtAction(nameof(GetEquipmentById), new { id }, await _repo.GetEquipmentByIdAsync(id, ct));
    }

    /// <summary>修改避難設備</summary>
    [HttpPut("equipment/{id:int}")]
    public async Task<IActionResult> UpdateEquipment(int id, [FromBody] EvacEquipmentUpsertRequest req, CancellationToken ct = default)
    {
        return await _repo.UpdateEquipmentAsync(id, req, ct)
            ? Ok(await _repo.GetEquipmentByIdAsync(id, ct))
            : NotFound();
    }

    /// <summary>刪除避難設備</summary>
    [HttpDelete("equipment/{id:int}")]
    public async Task<IActionResult> DeleteEquipment(int id, CancellationToken ct = default)
        => await _repo.DeleteEquipmentAsync(id, ct) ? NoContent() : NotFound();

    // ══ 緊急聯絡 ══════════════════════════════════════════════════

    /// <summary>查詢避難緊急聯絡清單</summary>
    /// <param name="unitCode">單位代號（必填），範例：W52</param>
    /// <param name="includeAll">是否包含停用項目（管理後台傳 true）</param>
    [HttpGet("contact")]
    public async Task<IActionResult> GetContact(
        [FromQuery, DefaultValue("W52")] string unitCode,
        [FromQuery, DefaultValue(false)] bool includeAll = false,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(unitCode)) return BadRequest(new { message = "unitCode 為必填" });
        return Ok(await _repo.GetContactAsync(unitCode, includeAll, ct));
    }

    /// <summary>查詢單筆緊急聯絡</summary>
    [HttpGet("contact/{id:int}")]
    public async Task<IActionResult> GetContactById(int id, CancellationToken ct = default)
    {
        var item = await _repo.GetContactByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    /// <summary>新增緊急聯絡</summary>
    [HttpPost("contact")]
    public async Task<IActionResult> CreateContact([FromBody] EvacContactUpsertRequest req, CancellationToken ct = default)
    {
        var id = await _repo.CreateContactAsync(req, ct);
        return CreatedAtAction(nameof(GetContactById), new { id }, await _repo.GetContactByIdAsync(id, ct));
    }

    /// <summary>修改緊急聯絡</summary>
    [HttpPut("contact/{id:int}")]
    public async Task<IActionResult> UpdateContact(int id, [FromBody] EvacContactUpsertRequest req, CancellationToken ct = default)
    {
        return await _repo.UpdateContactAsync(id, req, ct)
            ? Ok(await _repo.GetContactByIdAsync(id, ct))
            : NotFound();
    }

    /// <summary>刪除緊急聯絡</summary>
    [HttpDelete("contact/{id:int}")]
    public async Task<IActionResult> DeleteContact(int id, CancellationToken ct = default)
        => await _repo.DeleteContactAsync(id, ct) ? NoContent() : NotFound();
}
