using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace kmsh_whiteboard.Security;

/// <summary>
/// 全域防護：非 GET（POST/PUT/PATCH/DELETE）一律要求已登入（JWT），
/// 僅標 [AllowAnonymous] 的端點（登入/登出）放行。
/// 採全域註冊而非逐端點掛 [Authorize]，日後新增修改類端點預設即受保護、不會漏掛。
/// GET（白板輪詢顯示）維持免登入。
/// </summary>
public class MutationAuthorizationFilter : IAuthorizationFilter
{
    private static readonly string[] MutatingMethods = { "POST", "PUT", "PATCH", "DELETE" };

    public void OnAuthorization(AuthorizationFilterContext context)
    {
        if (!MutatingMethods.Contains(context.HttpContext.Request.Method)) return;
        if (context.ActionDescriptor.EndpointMetadata.OfType<IAllowAnonymous>().Any()) return;
        if (context.HttpContext.User?.Identity?.IsAuthenticated == true) return;
        context.Result = new UnauthorizedObjectResult(new { message = "未登入或登入已過期，請重新登入" });
    }
}
