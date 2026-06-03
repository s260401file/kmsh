/* ══════════════════════════════════════════════
   排班資訊 panel  (ER board)
   §7.1.2.1 (7.1) 護理人員排班（含負責床位、緊急應變編組、點班）
   §7.1.2.1 (7.2) 專師排班
   §7.1.2.1 (7.3) 住院醫師排班
   ══════════════════════════════════════════════ */

function _getScheduleShiftName() {
  const h = new Date().getHours();
  if (h >= 8 && h < 16) return "白班";
  if (h >= 16)          return "小夜";
  return "大夜";
}

function _emgCls(role) {
  if (role === "指揮組")       return "sc-emg-指揮組";
  if (role === "急救1組")      return "sc-emg-急救1組";
  if (role === "急救2組")      return "sc-emg-急救2組";
  if (role.startsWith("CPR")) return "sc-emg-CPR組";
  if (role === "轉送組")       return "sc-emg-轉送組";
  return "sc-emg-後援組";
}

function renderCurrentShiftSched(shift) {
  const staffRows = shift.Staff.map(s => {
    const beds = s.Beds.map(b => `<span class="sc-bed-tag">${b}</span>`).join("");
    const cin  = s.CheckedIn;
    return `
      <tr>
        <td class="sc-td">
          <div class="sc-staff-name">${s.Name}</div>
          <div class="sc-staff-role">${s.Role}</div>
        </td>
        <td class="sc-td"><div class="sc-staff-ext">${s.Ext}</div></td>
        <td class="sc-td"><div class="sc-beds-wrap">${beds}</div></td>
        <td class="sc-td">
          <span class="sc-emg-role ${_emgCls(s.EmgRole)}">${s.EmgRole}</span>
        </td>
        <td class="sc-td">
          <div class="sc-checkin ${cin ? 'yes' : 'no'}">
            <div class="sc-checkin-dot ${cin ? 'yes' : 'no'}"></div>
            ${cin ? '到班' : '未到'}
          </div>
        </td>
      </tr>`;
  }).join("");

  document.getElementById("sc-current").innerHTML = `
    <div class="sc-current-card">
      <div class="sc-current-header">
        <div class="ct-pulse-dot"></div>
        <span class="sc-current-label">當班</span>
        <span class="sc-current-shift-name">${shift.Shift}</span>
        <span class="sc-current-shift-time">${shift.ShiftTime}</span>
      </div>
      <table class="sc-staff-table">
        <thead>
          <tr>
            <th class="sc-th">姓名 / 職稱</th>
            <th class="sc-th">分機</th>
            <th class="sc-th">負責床位</th>
            <th class="sc-th">緊急應變編組</th>
            <th class="sc-th">點班</th>
          </tr>
        </thead>
        <tbody>${staffRows}</tbody>
      </table>
    </div>`;
}

function renderOtherShiftsSched(shifts) {
  if (!shifts.length) {
    document.getElementById("sc-others").innerHTML =
      `<div class="ct-empty">無其他班別資料</div>`;
    return;
  }
  const html = shifts.map(shift => {
    const rows = shift.Staff.map(s => `
      <div class="sc-shift-row">
        <div class="sc-shift-row-left">
          <div class="sc-shift-row-name">${s.Name}</div>
          <div class="sc-shift-row-role">${s.Role}</div>
        </div>
        <div class="sc-shift-row-right">
          <div class="sc-shift-row-ext">${s.Ext}</div>
          <div class="sc-shift-row-dot ${s.CheckedIn ? 'yes' : 'no'}"></div>
        </div>
      </div>`).join("");
    return `
      <div class="sc-shift-card">
        <div class="sc-shift-card-header">
          <span class="sc-shift-pill ${shift.Shift}">${shift.Shift}</span>
          <span class="sc-shift-card-time">${shift.ShiftTime}</span>
        </div>
        ${rows}
      </div>`;
  }).join("");
  document.getElementById("sc-others").innerHTML = html;
}

function renderDoctorsSched(specialists, residents) {
  const mkRow = d => `
    <div class="sc-doctor-row">
      <div class="sc-doctor-left">
        <div class="sc-doctor-name">${d.Name}</div>
        <div class="sc-doctor-title">${d.Title}・${d.Dept}</div>
      </div>
      <div class="sc-doctor-right">
        <div class="sc-doctor-ext">${d.Ext}</div>
        <div class="sc-doctor-time">${d.Time}</div>
      </div>
    </div>`;

  document.getElementById("sc-doctors").innerHTML = `
    <div class="sc-doctor-group">
      <div class="sc-doctor-group-header">專師排班</div>
      ${specialists.map(mkRow).join("")}
    </div>
    <div class="sc-doctor-group">
      <div class="sc-doctor-group-header">住院醫師排班</div>
      ${residents.map(mkRow).join("")}
    </div>`;
}

async function initSchedulePanel() {
  const result = await getSchedule("ER", "");
  if (!result || !result.Success) return;
  const data = result.Data;

  const shiftName    = _getScheduleShiftName();
  const current      = data.NursingShifts.find(s => s.Shift === shiftName) || data.NursingShifts[0];
  const others       = data.NursingShifts.filter(s => s !== current);

  renderCurrentShiftSched(current);
  renderOtherShiftsSched(others);
  renderDoctorsSched(data.Specialists, data.Residents);
}
