using kmsh_whiteboard.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace kmsh_whiteboard.Controllers;

/// <summary>
/// 通用看板圖片（以 Kind＋UnitCode 為鍵）：後台上傳一張、前台整頁顯示。目前用於 OR「各科協助業務」(kind=assist)。
/// 授權由全域 MutationAuthorizationFilter 處理：GET 匿名（看板顯示）、POST/DELETE 需登入。
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class BoardImageController : ControllerBase
{
    private readonly IBoardImageRepository _repo;
    private readonly IWebHostEnvironment _env;

    public BoardImageController(IBoardImageRepository repo, IWebHostEnvironment env)
    {
        _repo = repo;
        _env = env;
    }

    // kind 會用於檔案路徑 → 僅允許英數，避免路徑穿越
    private static string SafeKind(string kind) => new string((kind ?? "").Where(char.IsLetterOrDigit).ToArray());
    private string UploadDir(string kind) => Path.Combine(_env.ContentRootPath, "uploads", SafeKind(kind));

    /// <summary>查詢圖片資訊（有無上傳）。</summary>
    [HttpGet("image/info/{kind}/{unitCode}")]
    public async Task<IActionResult> GetImageInfo(string kind, string unitCode, CancellationToken ct = default)
    {
        var item = await _repo.GetAsync(SafeKind(kind), unitCode, ct);
        return item is null ? NotFound(new { message = "尚未上傳" }) : Ok(item);
    }

    /// <summary>取得圖片（binary）— 供前台 &lt;img src&gt; 使用。</summary>
    [HttpGet("image/{kind}/{unitCode}")]
    public async Task<IActionResult> GetImage(string kind, string unitCode, CancellationToken ct = default)
    {
        var k = SafeKind(kind);
        var item = await _repo.GetAsync(k, unitCode, ct);
        if (item is null) return NotFound();

        var filePath = Path.Combine(UploadDir(k), Path.GetFileName(item.ImagePath));
        if (!System.IO.File.Exists(filePath)) return NotFound();

        var ext = Path.GetExtension(filePath).ToLower();
        var mime = ext switch { ".png" => "image/png", ".gif" => "image/gif", _ => "image/jpeg" };
        var bytes = await System.IO.File.ReadAllBytesAsync(filePath, ct);
        return File(bytes, mime);
    }

    /// <summary>上傳圖片（multipart/form-data）；kind＋unitCode 決定覆蓋位置。支援 JPG / PNG。</summary>
    [HttpPost("image")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadImage([FromForm] string kind, [FromForm] string unitCode, IFormFile file, CancellationToken ct = default)
    {
        var k = SafeKind(kind);
        if (string.IsNullOrWhiteSpace(k)) return BadRequest(new { message = "kind 為必填" });
        if (string.IsNullOrWhiteSpace(unitCode)) return BadRequest(new { message = "unitCode 為必填" });
        if (file is null || file.Length == 0) return BadRequest(new { message = "file 為必填" });

        var ext = Path.GetExtension(file.FileName).ToLower();
        if (!new[] { ".jpg", ".jpeg", ".png" }.Contains(ext)) return BadRequest(new { message = "僅支援 JPG / PNG" });

        var dir = UploadDir(k);
        Directory.CreateDirectory(dir);
        var fileName = $"{unitCode}{ext}";
        var filePath = Path.Combine(dir, fileName);

        await using (var stream = System.IO.File.Create(filePath))
            await file.CopyToAsync(stream, ct);

        await _repo.UpsertAsync(k, unitCode, fileName, file.FileName, ct);
        return Ok(new { message = "上傳成功", fileName });
    }

    /// <summary>刪除圖片。</summary>
    [HttpDelete("image/{kind}/{unitCode}")]
    public async Task<IActionResult> DeleteImage(string kind, string unitCode, CancellationToken ct = default)
    {
        var k = SafeKind(kind);
        var item = await _repo.GetAsync(k, unitCode, ct);
        if (item is null) return NotFound();

        var filePath = Path.Combine(UploadDir(k), Path.GetFileName(item.ImagePath));
        if (System.IO.File.Exists(filePath)) System.IO.File.Delete(filePath);

        await _repo.DeleteAsync(k, unitCode, ct);
        return NoContent();
    }
}
