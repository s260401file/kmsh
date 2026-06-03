const BULLETIN_DATA = {
  Success: true,
  Message: "",
  Data: {
    WardCode: "ER",
    QueryDate: "2026-06-03",
    UnitBulletins: [
      { BulletinId: 1, Category: "急診室", Title: "急診 TRIAGE 檢傷流程更新", Content: "即日起，TRIAGE 1、2 級病人需在 10 分鐘內完成初步評估並通知值班醫師，請全體護理人員確實執行並於班交記錄。", Priority: "重要", PostedBy: "急診護理長", PostedAt: "2026-06-01", IsActive: true },
      { BulletinId: 2, Category: "急診室", Title: "大量傷患演練預告", Content: "本月 20 日（六）上午 09:00 將進行年度大量傷患（MCI）桌上演練，各班請預留至少一位護理師待命配合，不克出席者請提前知會護理長。", Priority: "重要", PostedBy: "急診護理長", PostedAt: "2026-05-28", IsActive: true },
      { BulletinId: 3, Category: "急診室", Title: "急救推車藥品補充提醒", Content: "本週完成急救推車藥品盤點，請白班護理師於交班前確認 Epinephrine × 5 支、Atropine × 3 支，如有不足立即通知藥局補充。", Priority: "一般", PostedBy: "急診護理長", PostedAt: "2026-05-30", IsActive: true },
      { BulletinId: 4, Category: "急診室", Title: "6 月份排班意願收集", Content: "6 月底排班意願表請於本週五（6/6）前回交護理長，7 月份固定休假申請亦同時收集。", Priority: "一般", PostedBy: "急診護理長", PostedAt: "2026-06-02", IsActive: true }
    ],
    HospBulletins: [
      { BulletinId: 101, Category: "院方", Title: "院內感染管制週宣導", Content: "本週（6/2–6/8）為院感管制週，急診為高感染風險區域，請確實執行五時機手部衛生，接觸疑似傳染病病人前後務必更換手套與隔離衣。", Priority: "重要", PostedBy: "感染管制組", PostedAt: "2026-06-02", IsActive: true },
      { BulletinId: 102, Category: "院方", Title: "2026 年度醫療品質評鑑", Content: "本院將於 7 月 14–16 日接受醫策會評鑑，急診評鑑說明會訂於 6 月 25 日上午 10 時，請全體急診護理師留意通知。", Priority: "重要", PostedBy: "醫療品質部", PostedAt: "2026-06-01", IsActive: true },
      { BulletinId: 103, Category: "院方", Title: "暑假急診加強應對計畫", Content: "7–8 月急診就診人數歷年增加 20–30%，醫院已協調增加備班護理師人力，相關細節待護理部通知各班。", Priority: "一般", PostedBy: "護理部", PostedAt: "2026-06-03", IsActive: true }
    ]
  }
}

export default BULLETIN_DATA
