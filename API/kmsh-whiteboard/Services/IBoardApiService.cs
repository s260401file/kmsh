using kmsh_whiteboard.Models.Board;

namespace kmsh_whiteboard.Services;

/// <summary>
/// 院方 Board API 代理介面（主機 http://10.20.111.84:8088）。
/// 目前實作 Board_bed（住院在床清單）；Board_ER 之後可加。
/// </summary>
public interface IBoardApiService
{
    /// <summary>呼叫 Board_bed 取得指定病房（HNURSTA，如 W52 / AICU）的在床病人清單；字串已 trim。</summary>
    Task<List<BoardBedItem>> GetBedListAsync(string ward, CancellationToken ct = default);

    /// <summary>呼叫 Board_ER 取得急診在室清單（body {}，需 x-api-key）；字串已 trim。</summary>
    Task<List<BoardErItem>> GetErListAsync(CancellationToken ct = default);

    /// <summary>呼叫 Board_ER_TypeE 取得死亡類別（不佔床）筆數；失敗回 0。</summary>
    Task<int> GetErTypeECountAsync(CancellationToken ct = default);

    /// <summary>呼叫 Board_ER_TypeE 取得死亡類別（不佔床）清單；失敗回空清單。</summary>
    Task<List<BoardErTypeEItem>> GetErTypeEListAsync(CancellationToken ct = default);

    /// <summary>呼叫 Board_OR 取得手術排程清單（body {}，需 x-api-key）；字串已 trim。</summary>
    Task<List<BoardOrItem>> GetOrListAsync(CancellationToken ct = default);

    /// <summary>呼叫 AICUPHY 取得 AICU 病人身體約束清單（body {}，需 x-api-key）；失敗回空清單（白板不中斷）。字串已 trim。</summary>
    Task<List<AicuPhyItem>> GetAicuRestraintAsync(CancellationToken ct = default);
}
