-- schema_v50：外傷小組（TR）值班醫師排程改為「單一全日格」（移除日班/夜班時段）
-- 背景：ER 管理 › 值班醫師排程的每日時段由 OnCallDept.Slots 逗號切分而來
--       （前端 OnCallScheduleSection：Slots 有值→多時段；NULL/空→單一全日格）。
--       外傷小組原設 Slots='日班,夜班'，現改為不分班 → Slots 設為 NULL。
-- 安全：TR 目前無 OnCallRoster 資料；日後「儲存本月」以 DeptCode+月覆寫，不留孤兒。
-- 冪等：可重複執行。

UPDATE [dbo].[OnCallDept]
   SET Slots = NULL, UpdatedAt = GETDATE()
 WHERE DeptCode = N'TR';

PRINT N'[v50] 外傷小組(TR) 值班排程改為單一全日格（Slots=NULL）。';
