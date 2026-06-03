// 避難圖 渲染邏輯
function updateClock() {
  const now = new Date(); const days = ["日","一","二","三","四","五","六"];
  document.getElementById("clock-date").textContent = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} (${days[now.getDay()]})`;
  document.getElementById("clock-time").textContent = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("ward-director").textContent = MOCK_DATA.HospitalInfo.WardDirector;
  document.getElementById("head-nurse").textContent    = MOCK_DATA.HospitalInfo.HeadNurse;
  updateClock(); setInterval(updateClock, 1000);
  const res = await getEvacuation("ER");
  const { EvacPlan, Equipment, EmergencyContacts } = res.Data;
  document.getElementById("ev-floor-info").textContent = `${EvacPlan.FloorNo} — ${EvacPlan.WardName}`;
  document.getElementById("ev-equip-count").textContent = Equipment.length + " 項";
  document.getElementById("equip-list").innerHTML = Equipment.map(e => `
    <div class="ev-equip-row">
      <span class="ev-equip-name">${e.EquipmentName}</span>
      <span class="ev-equip-loc">${e.Location}</span>
      ${e.Quantity > 1 ? `<span class="ev-equip-qty">×${e.Quantity}</span>` : ""}
    </div>`).join("");
  document.getElementById("emerg-contacts").innerHTML = EmergencyContacts.map(c => `
    <div class="ev-contact-row">
      <span class="ev-contact-name">${c.Name}</span>
      <span class="ev-contact-ext">${c.Extension}</span>
    </div>`).join("");
});
