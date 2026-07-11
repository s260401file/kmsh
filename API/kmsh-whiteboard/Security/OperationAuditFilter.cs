using System.Text.Json;
using kmsh_whiteboard.Models.Db;
using kmsh_whiteboard.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.Infrastructure;

namespace kmsh_whiteboard.Security;

/// <summary>
/// 全域操作稽核：POST/PUT/PATCH/DELETE 執行後記錄「誰／方法／路徑／內容摘要／結果／IP／時間」到 dbo.OperationAudit。
/// [AllowAnonymous] 端點（登入/登出）不在此記——已有 LoginAudit，且登入 body 含密碼不可入庫。
/// 稽核寫入失敗只記 log、不影響原請求。
/// </summary>
public class OperationAuditFilter : IAsyncActionFilter
{
    private const int BodyMaxLength = 4000;
    private static readonly string[] MutatingMethods = { "POST", "PUT", "PATCH", "DELETE" };

    private readonly IAuditRepository _audit;
    private readonly ILogger<OperationAuditFilter> _logger;

    public OperationAuditFilter(IAuditRepository audit, ILogger<OperationAuditFilter> logger)
    {
        _audit = audit;
        _logger = logger;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var http = context.HttpContext;
        var isMutation = MutatingMethods.Contains(http.Request.Method)
            && !context.ActionDescriptor.EndpointMetadata.OfType<IAllowAnonymous>().Any();

        // body 參數先序列化（action 內可能改動物件內容）
        var body = isMutation ? SerializeArgs(context) : null;

        var executed = await next();

        if (!isMutation) return;
        try
        {
            var status = (executed.Result as IStatusCodeActionResult)?.StatusCode
                         ?? (executed.Exception is null || executed.ExceptionHandled ? http.Response.StatusCode : 500);
            await _audit.AddOperationAsync(new OperationAuditItem
            {
                EmployeeNo = http.User?.Identity?.Name,
                Name = http.User?.FindFirst("name")?.Value,
                Method = http.Request.Method,
                Path = http.Request.Path.Value ?? "",
                Body = body,
                StatusCode = status,
                Ip = http.Connection.RemoteIpAddress?.ToString(),
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "操作稽核寫入失敗（不影響原請求）：{Method} {Path}", http.Request.Method, http.Request.Path);
        }
    }

    /// <summary>序列化 action 參數為 JSON 摘要；略過 CancellationToken 與檔案上傳，長度截斷。</summary>
    private static string? SerializeArgs(ActionExecutingContext context)
    {
        try
        {
            var args = context.ActionArguments
                .Where(kv => kv.Value is not null
                             && kv.Value is not CancellationToken
                             && kv.Value is not IFormFile
                             && kv.Value is not IFormFileCollection)
                .ToDictionary(kv => kv.Key, kv => kv.Value);
            if (args.Count == 0) return null;
            var json = JsonSerializer.Serialize(args);
            json = RedactPasswords(json);   // 任何 key 含 password 的值遮蔽，避免明碼入庫
            return json.Length > BodyMaxLength ? json[..BodyMaxLength] : json;
        }
        catch
        {
            return null;   // 序列化失敗不阻擋稽核其餘欄位
        }
    }

    /// <summary>遮蔽 JSON 中任何欄名含 "password" 的字串值（改密/重設/建帳號密碼不入庫）。</summary>
    private static string RedactPasswords(string json)
        => System.Text.RegularExpressions.Regex.Replace(
            json,
            "(\"[^\"]*[Pp]assword[^\"]*\"\\s*:\\s*)\"[^\"]*\"",
            "$1\"***\"");
}
