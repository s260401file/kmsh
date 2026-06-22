---
tags: [kmsh, 技術, W52, 手術資訊, 試作]
---
# W52 手術資訊 — JSON 設計

> 對應分頁 `SurgeryTab`（W52 病人當日手術）。手術資料 ✅有表 `OR.OPORDER`（HIS 候選/待開放）；刷手流動非此頁範圍。
> 方法同 [[W52病室動態-JSON與組裝]]；來源見 [[HIS可用與缺漏分析]]、[[資料項對照表]]。

## ⚠ 實測更新（2026-06-22）
✅ `OR.OPORDER` 核心**可用**（刀房/術式/主刀/助手/麻醉/狀態/來源/起始時間）；鍵＝**`ORHISNUM`**。⚠ NPO `ORNPODT/ORNPOTM` 異常、`ORDIAG`(診斷)/`OREMRFG`(急刀)/`ORBIO`(抗生素) 部分空。詳 [[欄位資料實況]]。

## 名單來源（與 OR 板同源 OPORDER，篩選不同）
手術資料同 `OR.OPORDER`（base SQL 見 [[OR手術動態-JSON與組裝]]），但**篩選對象不同**：
- OR 板：以**刀房** ＋ `ORBGNDT >= 今日`。
- 本頁（W52 手術頁）：以**該病房在床病人**的手術 → `OPORDER.ORHISNUM IN (W52 在床病人病歷號)`，日期可取前後數日 `ORBGNDT`。
- 鍵 `ORHISNUM`；join `HPBASIC` 補基本；診斷 `ORDIAG` 部分空。6/22 實測 OPORDER 核心可用。

## 試作 JSON
```json
{
  "Success": true, "Message": "",
  "Data": {
    "WardCode": "W52", "QueryDate": "2026-06-03",
    "Items": [
      { "SurgeryId": 3, "Date": "2026-06-03", "OrRoom": "OR-02", "ScheduledTime": "10:30",
        "BedNo": "022", "PatientName": "蔡○美", "Gender": "F", "Age": 63,
        "Procedure": "腹腔鏡膽囊切除術 (LC)", "Diagnosis": "急性膽囊炎",
        "AnesthesiaMethod": "全身麻醉", "AttendingSurgeon": "吳○醫師", "Status": "手術中" }
    ]
  }
}
```

## 逐欄來源（三態 × 表）
| 欄位 | 來源 | 表.欄位 | 現況 |
|---|---|---|---|
| OrRoom 刀房 | HIS | `OR.OPORDER` OROPROOM | 候選 |
| ScheduledTime 排程 | HIS | `OR.OPORDER` ORBGNDT/ORBGNTM | 候選 |
| BedNo | HIS | `AM.HLOC.HBED` | 待開放 |
| PatientName/Gender/Age | HIS | `AM.HPBASIC` | ①有值 |
| Procedure 術式 | HIS | `OR.OPORDER` OROPNM1 | 候選 |
| Diagnosis | HIS | `OR.OPORDER` ORDIAG / `AM.HDIAGNOS` | 候選 |
| AnesthesiaMethod 麻醉 | HIS | `OR.OPORDER` OROPAMED | 候選 |
| AttendingSurgeon 主刀 | HIS | `OR.OPORDER` ORDOCNM | 候選 |
| Status 狀態（手術中/待手術/已完成/取消） | HIS | `OR.OPORDER` ORSTATUS | 候選 |

## API 組裝
- `GET /api/Board/w52/surgery?date=`：以 OPORDER 查「當日 ＋ W52 在床病人」一次撈（量小）；與 [[OR手術動態-JSON與組裝]] 同來源、不同篩選（OR 板以刀房、W52 以病房）。
- 全屬 HIS → **待 OPORDER 開放**；開放前以暫存/mock。無自建相依。

相關：[[OR手術動態-JSON與組裝]] · [[W52病室動態-JSON與組裝]] · [[HIS可用與缺漏分析]] · [[W52-一般病房]]
