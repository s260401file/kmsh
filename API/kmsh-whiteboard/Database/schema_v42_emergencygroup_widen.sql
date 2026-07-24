-- schema_v42_emergencygroup_widen.sql
-- 緊急編組改為「一人多組」：以逗號分隔多值存於 StaffSchedule.EmergencyGroup。
-- 原 NVARCHAR(20) 不足容納多組（5 組含逗號約 21 字），加寬為 NVARCHAR(60)。
-- 僅加寬欄位，不影響既有單值資料；無 C# 變更。

ALTER TABLE [dbo].[StaffSchedule] ALTER COLUMN [EmergencyGroup] NVARCHAR(60) NULL;
