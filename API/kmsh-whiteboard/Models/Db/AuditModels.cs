namespace kmsh_whiteboard.Models.Db;

/// <summary>操作稽核列（規格書：資料之新增/修改/刪除須記錄使用者帳號與發生時間）。</summary>
public class OperationAuditItem
{
    public int Id { get; set; }
    /// <summary>操作者員編（JWT sub）。</summary>
    public string? EmployeeNo { get; set; }
    /// <summary>操作者姓名（JWT name）。</summary>
    public string? Name { get; set; }
    /// <summary>HTTP 方法：POST/PUT/PATCH/DELETE。</summary>
    public string Method { get; set; } = "";
    /// <summary>端點路徑（含路由參數，如 /api/Board/ext/12）。</summary>
    public string Path { get; set; } = "";
    /// <summary>請求內容摘要（[FromBody] 參數 JSON，最長 4000 字）。</summary>
    public string? Body { get; set; }
    /// <summary>回應狀態碼（成功 2xx；4xx/5xx 亦記錄）。</summary>
    public int? StatusCode { get; set; }
    public string? Ip { get; set; }
    public DateTime CreatedAt { get; set; }
}
