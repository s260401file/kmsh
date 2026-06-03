// 手術派班 渲染邏輯
function updateClock() {
  const now = new Date(); const days = ["日","一","二","三","四","五","六"];
  document.getElementById("clock-date").textContent = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} (${days[now.getDay()]})`;
  document.getElementById("clock-time").textContent = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
}

let currentShiftIdx = 0;

function renderShift(shifts, idx) {
  const shift = shifts[idx];
  // 更新班別按鈕
  document.querySelectorAll(".sc-shift-btn").forEach((btn, i) => {
    btn.classList.toggle("active", i === idx);
    btn.classList.toggle("is-current", i === 0);
  });

  // 護理長 & 麻醉科
  document.getElementById("sc-charge").textContent = shift.Charge.Name + "（分機 " + shift.Charge.Extension + "）";

  const anesEl = document.getElementById("sc-anesthesia-list");
  anesEl.innerHTML = shift.Anesthesia.map(a => `
    <tr>
      <td class="sc-td-role">${a.Role}</td>
      <td>${a.Name}</td>
      <td class="sc-td-ext">${a.Extension}</td>
    </tr>`).join("");

  const circEl = document.getElementById("sc-circtech");
  circEl.textContent = shift.CircTech ? `${shift.CircTech.Name}（分機 ${shift.CircTech.Extension}）` : "本班無";

  // 刀房派班表
  const tbody = document.getElementById("sc-room-list");
  tbody.innerHTML = shift.Rooms.map(r => {
    const scrub = r.ScrubNurse || '<span style="color:var(--text-muted)">—</span>';
    const circ  = r.CircNurse  || '<span style="color:var(--text-muted)">—</span>';
    return `<tr>
      <td class="sc-td-room">${r.RoomId}</td>
      <td class="sc-td-ext" style="font-family:var(--font-num)">${r.Extension}</td>
      <td>${scrub}</td>
      <td>${circ}</td>
    </tr>`;
  }).join("");

  // 統計
  const nurses = new Set();
  shift.Rooms.forEach(r => { if (r.ScrubNurse) nurses.add(r.ScrubNurse); if (r.CircNurse) nurses.add(r.CircNurse); });
  document.getElementById("sc-stat-nurse").textContent  = nurses.size;
  document.getElementById("sc-stat-anes").textContent   = shift.Anesthesia.length;
  document.getElementById("sc-stat-rooms").textContent  = shift.Rooms.filter(r => r.ScrubNurse).length;
}

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("ward-director").textContent = MOCK_DATA.HospitalInfo.WardDirector;
  document.getElementById("head-nurse").textContent    = MOCK_DATA.HospitalInfo.HeadNurse;
  updateClock(); setInterval(updateClock, 1000);

  const res = await getSchedule("OR", "2026-06-03");
  const shifts = res.Data.Shifts;

  // 渲染班別切換列
  const bar = document.getElementById("sc-shift-bar");
  bar.innerHTML = shifts.map((s, i) => `
    <button class="sc-shift-btn${i===0?' active is-current':''}" data-idx="${i}">
      ${s.ShiftType}<span class="sc-shift-time">${s.ShiftTime}</span>
    </button>`).join("");
  bar.querySelectorAll(".sc-shift-btn").forEach(btn => {
    btn.addEventListener("click", () => { currentShiftIdx = +btn.dataset.idx; renderShift(shifts, currentShiftIdx); });
  });

  renderShift(shifts, 0);
});
