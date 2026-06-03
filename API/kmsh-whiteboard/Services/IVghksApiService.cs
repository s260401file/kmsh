using kmsh_whiteboard.Models.Common;
using kmsh_whiteboard.Models.NonExSchList;
using kmsh_whiteboard.Models.Patient;
using kmsh_whiteboard.Models.Ward;

namespace kmsh_whiteboard.Services;

public interface IVghksApiService
{
    // 未執行檢查及會診清單
    Task<VghksApiResponse<NonExSchListItem>> GetNonExSchListAsync(
        string hhisnum, string? hcasetyp = null, CancellationToken ct = default);

    // 取得急診/住院病房清單
    Task<VghksApiResponse<HnurstaItem>> GetHnurstaListAsync(
        string hcsetyp = "E", CancellationToken ct = default);

    // 取得病房病人床位清單
    Task<VghksApiResponse<BedListItem>> GetBedListAsync(
        string hnursta, string hcasetyp = "E", CancellationToken ct = default);

    // 急診病人詳細資料
    Task<AmdrCaseResponse> GetERPatAsync(
        string hhisnum, string hcaseno,
        string? hnursta = null, string? hbedno = null,
        CancellationToken ct = default);

    // 住院病人詳細資料
    Task<AmdrCaseResponse> GetAMPatAsync(
        string hhisnum, string hcaseno, CancellationToken ct = default);
}
