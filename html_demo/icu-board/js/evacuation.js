// ──────────────────────────────────────────────────────────────
// 避難圖 渲染邏輯 — ICU 版
// 欄位使用 camelCase（與 ICU mockData 一致）
// React 對應：<EvacPlanView /> + <EquipmentList /> + <EmergencyContacts />
// ──────────────────────────────────────────────────────────────

function updateClock() {
  const now  = new Date();
  const days = ["日","一","二","三","四","五","六"];
  const dateStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} (${days[now.getDay()]})`;
  const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
  document.getElementById("clock-date").textContent = dateStr;
  document.getElementById("clock-time").textContent = timeStr;
}

// ── 樓層 / 病房資訊（標題列右側）──
function renderFloorInfo(evacPlan) {
  document.getElementById("ev-floor-info").textContent =
    `${evacPlan.floorNo}・${evacPlan.wardName}・上次演練 ${evacPlan.lastDrillDate}`;
}

// ── 設備清單 ──
// React 對應：<EquipmentList items={items} />
function renderEquipment(items) {
  const el = document.getElementById("equip-list");
  document.getElementById("ev-equip-count").textContent = items.length ? `${items.length} 項` : "";

  if (!items.length) {
    el.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-muted);">無設備清單</div>`;
    return;
  }

  el.innerHTML = items.map(it => `
    <div class="ev-equip-row">
      <span class="ev-equip-name">${it.equipmentName}</span>
      <span class="ev-equip-loc">${it.location}</span>
      <span class="ev-equip-qty">×${it.quantity}</span>
    </div>`
  ).join("");
}

// ── 緊急聯絡 ──
// React 對應：<EmergencyContacts items={items} />
function renderEmergencyContacts(items) {
  const el = document.getElementById("emerg-contacts");

  if (!items.length) {
    el.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-muted);">無緊急聯絡資料</div>`;
    return;
  }

  el.innerHTML = items.map(c => `
    <div class="ev-contact-row">
      <span class="ev-contact-name">${c.name}</span>
      <span class="ev-contact-ext">${c.extension}</span>
    </div>`
  ).join("");
}

// ── 入口 ──
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("ward-director").textContent = "王○明";
  document.getElementById("head-nurse").textContent    = "陳○美";

  updateClock();
  setInterval(updateClock, 1000);

  const res = await getIcuEvacuation("ICU");
  if (!res.success) {
    document.getElementById("equip-list").innerHTML =
      `<div style="padding:24px;text-align:center;color:var(--text-muted);">資料載入失敗</div>`;
    return;
  }

  renderFloorInfo(res.data.evacPlan);
  renderEquipment(res.data.equipment);
  renderEmergencyContacts(res.data.emergencyContacts);
});
