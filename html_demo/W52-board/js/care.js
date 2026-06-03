// ──────────────────────────────────────────────────────────────
// 照護提醒 渲染邏輯
// 函式命名採 component-like pattern，對應日後 React 元件結構
// ──────────────────────────────────────────────────────────────

// ── 時鐘（同 main.js）──
function updateClock() {
  const now  = new Date();
  const days = ["日","一","二","三","四","五","六"];
  const dateStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} (${days[now.getDay()]})`;
  const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
  document.getElementById("clock-date").textContent = dateStr;
  document.getElementById("clock-time").textContent = timeStr;
}

// ── 單筆卡片 HTML ──
// React 對應：<CareItem key={item.ReminderId} {...item} />
function renderCareItem(item) {
  const genderClass = item.Gender === "M" ? "care-gender-m" : "care-gender-f";
  const genderText  = item.Gender === "M" ? "男" : "女";

  return `
    <div class="care-item priority-${item.Priority}">
      <div class="care-priority-bar priority-bar-${item.Priority}"></div>
      <div class="care-bed-info">
        <span class="care-bed">${item.BedNo}</span>
        <span class="care-patient ${genderClass}">${item.PatientName}</span>
        <span class="care-basic">${genderText}/${item.Age}</span>
      </div>
      <span class="care-category cat-${item.Category}">${item.Category}</span>
      <div class="care-content">${item.Content}</div>
      <div class="care-meta">
        <span class="care-time">${item.RemindTime}</span>
        <span class="care-nurse">${item.PrimaryNurse}</span>
      </div>
    </div>
  `;
}

// ── 提醒列表 ──
// React 對應：<CareList items={items} />
function renderCareList(items) {
  const order = { "高": 0, "中": 1, "低": 2 };
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const toMin = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

  const sorted = [...items]
    .filter(i => !i.IsDone)
    .sort((a, b) => {
      const aMin = toMin(a.RemindTime), bMin = toMin(b.RemindTime);
      const aPast = aMin < nowMin ? 1 : 0;
      const bPast = bMin < nowMin ? 1 : 0;
      if (aPast !== bPast) return aPast - bPast;           // 未來 before 過去
      if (aPast === 0) {
        // 未來群組：優先度 → 時間升序（最快到的排前）
        const p = order[a.Priority] - order[b.Priority];
        return p !== 0 ? p : aMin - bMin;
      } else {
        // 過去群組：時間降序（最近過去的排前，06:45 沉到最底）
        return bMin - aMin;
      }
    });

  const html = sorted.map(renderCareItem).join("");
  document.getElementById("care-list").innerHTML = html;
}

// ── 入口（對應 React useEffect）──
document.addEventListener("DOMContentLoaded", async () => {
  // Header 資訊
  const info = _MOCK_CARE_REMINDERS.Data;
  document.getElementById("ward-director").textContent = "吳○明";
  document.getElementById("head-nurse").textContent    = "林○芳";

  // 時鐘
  updateClock();
  setInterval(updateClock, 1000);

  // 模擬 API fetch
  // TODO 正式上線：const res = await getCareReminders("W52");
  const res = await getCareReminders("W52");
  if (!res.Success) {
    document.getElementById("care-list").innerHTML =
      `<div class="care-error">資料載入失敗：${res.Message}</div>`;
    return;
  }

  const items = res.Data.Items;
  renderCareList(items);
});
