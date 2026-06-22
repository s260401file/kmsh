// pollingConfig.js — 白板定時輪詢間隔（集中設定）
// 角色：白板需「免 F5 自動更新」，各資料以 usePolling 定時重抓；間隔統一在此調整。
// 慣例：之後新增的白板資料模組，輪詢間隔一律取自本檔常數，勿散落各元件。
// 參考：Obsidian「即時更新-輪詢設計」分層頻率建議。

export const MARQUEE_MS = 30000   // 跑馬燈：30s
export const BULLETIN_MS = 60000  // 佈告欄/公告：60s（變動少）
export const CENSUS_MS = 20000    // 病床動態 / 病人註記：15–30s

// 未來模組建議值（待對應功能開發時啟用）：
// export const TRIAGE_MS = 12000   // 急診檢傷 / 大量傷患：10–15s
