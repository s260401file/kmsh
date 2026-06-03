// ──────────────────────────────────────────────────────────────
// 連絡電話 渲染邏輯 — ICU 版
// 欄位使用 camelCase（與 ICU mockData 一致）
// React 對應：<DutyTable /> + <CommonTable />
// ──────────────────────────────────────────────────────────────

function updateClock() {
  const now  = new Date();
  const days = ["日","一","二","三","四","五","六"];
  const dateStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} (${days[now.getDay()]})`;
  const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
  document.getElementById("clock-date").textContent = dateStr;
  document.getElementById("clock-time").textContent = timeStr;
}

// ── (6.1) 當日值班表格 ──
// React 對應：<DutyTable items={items} />
function renderDutyContacts(items) {
  if (!items.length) {
    document.getElementById("duty-list").innerHTML =
      `<tr class="ct-empty-row"><td colspan="5">無當日值班資料</td></tr>`;
    return;
  }

  document.getElementById("duty-list").innerHTML = items.map(item => `
    <tr>
      <td>${item.dutyTitle}</td>
      <td>${item.name}</td>
      <td class="ct-ext">分機 ${item.extension}</td>
      <td class="ct-mobile">${item.mobile || "—"}</td>
      <td class="ct-slot">${item.timeSlot}</td>
    </tr>`
  ).join("");
}

// ── (6.2) 常用電話表格 ──
// React 對應：<CommonTable items={items} />
function renderCommonContacts(items) {
  if (!items.length) {
    document.getElementById("common-list").innerHTML =
      `<tr class="ct-empty-row"><td colspan="2">無常用電話資料</td></tr>`;
    return;
  }

  document.getElementById("common-list").innerHTML = items.map(item => `
    <tr>
      <td>${item.name}</td>
      <td class="ct-ext ct-col-ext">分機 ${item.extension}</td>
    </tr>`
  ).join("");
}

// ── 入口 ──
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("ward-director").textContent = "王○明";
  document.getElementById("head-nurse").textContent    = "陳○美";

  updateClock();
  setInterval(updateClock, 1000);

  const res = await getIcuContacts("ICU", "2026-06-03");
  if (!res.success) {
    document.getElementById("duty-list").innerHTML =
      `<tr class="ct-empty-row"><td colspan="5">資料載入失敗</td></tr>`;
    document.getElementById("common-list").innerHTML =
      `<tr class="ct-empty-row"><td colspan="2">資料載入失敗</td></tr>`;
    return;
  }

  renderDutyContacts(res.data.dutyContacts);
  renderCommonContacts(res.data.commonContacts);
});
