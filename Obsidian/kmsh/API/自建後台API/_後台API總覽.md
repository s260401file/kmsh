---
tags: [kmsh, API, 後台]
---
# 自建後台 API 總覽（.NET）

我們自建的 .NET API（`…\API`），前端 `services/` 以相對 `/api/...` 呼叫（見 [[系統架構]]）。對應後台管理見 [[後台總覽]]。

## 現有控制器 / 端點
| 控制器 | 前綴 | 功能 | 前端 service |
|--------|------|------|------|
| TextController | `/api/Text` | 跑馬燈、佈告欄（category 區分）| `textApi`、`marqueeApi` |
| ContactController | `/api/Contact` | 值班人員 `/duty`、常用電話 `/common` | `contactApi` |
| EvacuationController | `/api/Evacuation` | 避難圖 圖片/設備/聯絡 | `evacuationApi` |

- 共同：多支援 `unitCode` 參數（多單位）、CRUD（GET/POST/PUT/DELETE）、`isActive` 上下架、`sortOrder`。
- 資料庫：SQL Express。

## 待長出（對應 [[資料項對照表]] 待建項）
排班 / 醫師查房 / 檢查會診 / 手術 / 抗生素 / 交班 / 照護團隊 / 病人註記… 以及轉接 [[_院方API總覽|院方 API]]。
