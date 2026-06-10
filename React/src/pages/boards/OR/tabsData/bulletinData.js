const BULLETIN_DATA = {
  Success: true,
  Message: "",
  Data: {
    WardCode: "OR",
    QueryDate: "2026-06-03",
    UnitBulletins: [
      { BulletinId: 1, Category: "手術室", Title: "單孔腹腔鏡器械清潔流程更新", Content: "即日起，單孔腹腔鏡（SILS）器械術後清潔須依新版 SOP（2026年5月版）執行，請各刷手護理師完成閱讀後於流程表簽名，如有疑問洽護理長。", Priority: "重要", PostedBy: "陳○雅護理長", PostedAt: "2026-06-01", IsActive: true },
      { BulletinId: 2, Category: "手術室", Title: "心臟手術體外循環安全核查表啟用", Content: "OR-05 心臟手術起，術前須完成新版體外循環（CPB）安全核查表（含術前 Team Briefing、手術開始前 Time-Out），由主刀醫師主導執行，並留存紀錄。", Priority: "重要", PostedBy: "林○泰醫師", PostedAt: "2026-05-28", IsActive: true },
      { BulletinId: 3, Category: "手術室", Title: "器械借用申請流程提醒", Content: "需向他院借用特殊器械時，請提前 48 小時透過護理長向供應室申請，急診緊急借用聯繫分機 5550。", Priority: "一般", PostedBy: "陳○雅護理長", PostedAt: "2026-05-25", IsActive: true },
      { BulletinId: 4, Category: "手術室", Title: "7 月排班意願收集", Content: "7 月份排班意願表請於 6/10 前交回護理長辦公室，逾期視同無特殊需求。", Priority: "一般", PostedBy: "陳○雅護理長", PostedAt: "2026-05-27", IsActive: true }
    ],
    HospBulletins: [
      { BulletinId: 101, Category: "院方", Title: "院內感染管制週宣導", Content: "本週（5/12–5/18）為院內感染管制週，請確實執行五時機手部衛生，進出隔離手術間務必穿戴適當防護裝備。", Priority: "重要", PostedBy: "感染管制組", PostedAt: "2026-05-15", IsActive: true },
      { BulletinId: 102, Category: "院方", Title: "2026 年度醫療品質評鑑", Content: "本院將於 7 月 14–16 日接受醫策會評鑑，手術室評鑑說明會訂於 6 月 22 日上午 10 時。", Priority: "重要", PostedBy: "醫療品質部", PostedAt: "2026-06-01", IsActive: true },
      { BulletinId: 103, Category: "院方", Title: "新版電子病歷系統上線", Content: "HIS 系統將於 6/15（一）凌晨 2 時進行版本升級，升級期間約 4 小時，術中記錄請預先列印紙本備用。", Priority: "一般", PostedBy: "資訊室", PostedAt: "2026-06-02", IsActive: true }
    ]
  }
}

export default BULLETIN_DATA
