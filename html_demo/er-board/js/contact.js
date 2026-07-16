// 連絡電話 渲染邏輯
function updateClock() {
  const now = new Date(); const days = ["日","一","二","三","四","五","六"];
  document.getElementById("clock-date").textContent = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} (${days[now.getDay()]})`;
  document.getElementById("clock-time").textContent = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("ward-director").textContent = MOCK_DATA.HospitalInfo.WardDirector;
  document.getElementById("head-nurse").textContent    = MOCK_DATA.HospitalInfo.HeadNurse;
  updateClock(); setInterval(updateClock, 1000);

  const res = await getContacts("ER", "2026-06-03");
  const { DutyContacts, CommonContacts } = res.Data;

  // 依班別分組（白班/小夜/大夜 固定順序，其餘接在後面），每組一列班別標題＋成員列（與 React 一致）
  const order = ["白班", "小夜", "大夜"];
  const groups = {};
  DutyContacts.forEach(c => { (groups[c.Shift] = groups[c.Shift] || []).push(c); });
  const shiftGroups = order.filter(k => groups[k]).map(k => ({ shift: k, items: groups[k] }))
    .concat(Object.keys(groups).filter(k => !order.includes(k)).map(k => ({ shift: k, items: groups[k] })));

  document.getElementById("duty-list").innerHTML = shiftGroups.map(g => `
    <tr class="ct-category-header">
      <td colspan="5">${g.shift}　${g.items[0].ShiftTime || ""}</td>
    </tr>
    ${g.items.map(c => `
    <tr>
      <td>${c.Title}</td>
      <td>${c.Name}</td>
      <td class="ct-ext">${c.Extension}</td>
      <td class="ct-mobile">${c.Mobile || "—"}</td>
      <td class="ct-slot">${c.Shift}</td>
    </tr>`).join("")}`).join("");

  document.getElementById("common-list").innerHTML = CommonContacts.map(c => `
    <tr>
      <td>${c.Name}</td>
      <td class="ct-col-ext ct-ext">${c.Extension}</td>
    </tr>`).join("");
});
