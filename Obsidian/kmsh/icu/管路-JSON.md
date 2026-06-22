---
tags: [kmsh, 技術, ICU, 管路, 試作]
---
# ICU 管路 — JSON 設計

> 對應分頁 `TubeTab`（逐床列各管路 ✓/—＋底部人數）。管路（ETT/NG/Foley/CVC/CRRT）**字典 0 筆、護理紀錄系統未開放 → 必自建**（[[欄位資料實況]]、[[HIS可用與缺漏分析]] C 區）。★ICU 核心。
> 自建表 [[資料庫Schema]] `PatientMarker`（MarkerCode=LINE）。

## 試作 JSON
```json
{
  "success": true, "message": "",
  "data": {
    "wardCode": "ICU", "queryDate": "2026-06-03",
    "beds": [
      { "id": "F4-01", "floor": 4, "num": 1,
        "patient": { "name": "林○志", "gender": "M", "age": 72 },
        "tubes": { "ett": true, "ng": true, "foley": true, "cvc": true, "crrt": false } }
    ],
    "stats": { "ett": 8, "ng": 12, "foley": 20, "cvc": 14, "crrt": 3 }
  }
}
```

## 逐欄來源（全自建）
| 欄位 | 來源 | 自建表 | 現況 |
|---|---|---|---|
| id/floor/num/patient | HIS+自建 | 床/姓名（`AM.HLOC`/`HPBASIC`）；床位錨點 | 待開放/暫存 |
| tubes.ett 呼吸器 | 自建 | `PatientMarker`（LINE, MarkerValue=ETT；可記置入/換管日 ExpireDate） | ③→自建 |
| tubes.ng 鼻胃管 | 自建 | `PatientMarker`（LINE, NG） | ③→自建 |
| tubes.foley 導尿管 | 自建 | `PatientMarker`（LINE, Foley） | ③→自建 |
| tubes.cvc 中心靜脈 | 自建 | `PatientMarker`（LINE, CVC） | ③→自建 |
| tubes.crrt | 自建 | `PatientMarker`（LINE, CRRT） | ③→自建 |
| stats 各管路人數 | 前端/後端算 | 由上彙總 | — |

> 一床多管 → `PatientMarker` 多列（同病人、MarkerCode=LINE、MarkerValue 各異）；聚合 group by 病人轉成 `tubes{}` 布林。`ExpireDate` 可承接「換管日」。

## API 組裝
- 純自建 `GET /api/Board/icu/tube`：讀 `PatientMarker`（ICU、LINE、active），group by 床號 → `beds[].tubes{}`＋`stats`。
- **現可自建上線**（與 HIS 無相依，且 HIS 本就沒有）；唯一長期解仍是高榮開放護理紀錄系統。
- 與病室動態同一份 `PatientMarker` 來源（病室動態的管路旗標亦由此）。

相關：[[ICU病室動態-JSON與組裝]] · [[欄位資料實況]] · [[資料庫Schema]] · [[ICU]]
