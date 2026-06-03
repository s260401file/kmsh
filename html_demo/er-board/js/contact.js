// ──────────────────────────────────────────────────────────────
// 連絡電話 渲染邏輯  (ER board panel 版)
// §7.1.2.1 (6.1) 當班大卡  (6.2) 常用連絡電話
// ──────────────────────────────────────────────────────────────

function getCurrentShift() {
  const h = new Date().getHours();
  if (h >= 8  && h < 16) return "白班";
  if (h >= 16 && h < 24) return "小夜";
  return "大夜";
}

function renderCurrentShift(people, shiftName, shiftTime) {
  const personCards = people.map(p => {
    const mobile = p.Mobile
      ? `<div class="ct-person-mobile">${p.Mobile}</div>`
      : "";
    return `
      <div class="ct-person-card">
        <div class="ct-person-name">${p.Name}</div>
        <div class="ct-person-title">${p.Title}</div>
        <div class="ct-person-ext">
          <span class="ct-ext-label">分機</span>
          <span class="ct-ext-number">${p.Extension}</span>
        </div>
        ${mobile}
      </div>`;
  }).join("");

  document.getElementById("duty-current").innerHTML = `
    <div class="ct-current-card">
      <div class="ct-current-header">
        <div class="ct-pulse-dot"></div>
        <span class="ct-current-label">當班</span>
        <span class="ct-current-shift-name">${shiftName}</span>
        <span class="ct-current-shift-time">${shiftTime}</span>
      </div>
      <div class="ct-current-people">${personCards}</div>
    </div>`;
}

function renderOtherShifts(groups) {
  if (Object.keys(groups).length === 0) {
    document.getElementById("duty-others").innerHTML =
      `<div class="ct-empty">無其他班別資料</div>`;
    return;
  }
  let html = "";
  Object.entries(groups).forEach(([shift, people]) => {
    const rows = people.map(p => {
      const mobile = p.Mobile
        ? `<span class="ct-shift-mobile">${p.Mobile}</span>`
        : "";
      return `
        <div class="ct-shift-row">
          <div class="ct-shift-row-info">
            <span class="ct-shift-row-name">${p.Name}</span>
            <span class="ct-shift-row-title">${p.Title}</span>
          </div>
          <div class="ct-shift-row-phones">
            <span class="ct-shift-ext">${p.Extension}</span>
            ${mobile}
          </div>
        </div>`;
    }).join("");
    html += `
      <div class="ct-shift-card">
        <div class="ct-shift-card-header">
          <span class="ct-shift-pill ${shift}">${shift}</span>
          <span class="ct-shift-card-time">${people[0].ShiftTime}</span>
        </div>
        ${rows}
      </div>`;
  });
  document.getElementById("duty-others").innerHTML = html;
}

function renderCommonContacts(items) {
  const EMERGENCY = new Set(["急救"]);
  const groups = {};
  items.forEach(item => {
    if (!groups[item.Category]) groups[item.Category] = [];
    groups[item.Category].push(item);
  });
  let html = "";
  Object.entries(groups).forEach(([category, entries]) => {
    const rows = entries.map(e =>
      `<div class="ct-common-row">
        <span class="ct-common-name">${e.Name}</span>
        <span class="ct-common-ext">${e.Extension}</span>
      </div>`
    ).join("");
    html += `
      <div class="ct-common-group${EMERGENCY.has(category) ? " is-emergency" : ""}">
        <div class="ct-common-group-header">${category}</div>
        ${rows}
      </div>`;
  });
  document.getElementById("common-list").innerHTML = html;
}

async function initContactPanel() {
  const res = await getContacts("ER", "2026-06-02");
  if (!res.Success) {
    ["duty-current", "duty-others", "common-list"].forEach(id => {
      document.getElementById(id).innerHTML = `<div class="ct-empty">資料載入失敗</div>`;
    });
    return;
  }

  const currentShift = getCurrentShift();
  const shiftOrder   = { "白班":0, "小夜":1, "大夜":2 };

  const allGroups = {};
  res.Data.DutyContacts.forEach(item => {
    if (!allGroups[item.Shift]) allGroups[item.Shift] = [];
    allGroups[item.Shift].push(item);
  });

  const currentPeople = allGroups[currentShift] || [];
  const currentTime   = currentPeople.length ? currentPeople[0].ShiftTime : "";

  const otherGroups = {};
  Object.entries(allGroups)
    .filter(([shift]) => shift !== currentShift)
    .sort(([a], [b]) => shiftOrder[a] - shiftOrder[b])
    .forEach(([shift, people]) => { otherGroups[shift] = people; });

  renderCurrentShift(currentPeople, currentShift, currentTime);
  renderOtherShifts(otherGroups);
  renderCommonContacts(res.Data.CommonContacts);
}
