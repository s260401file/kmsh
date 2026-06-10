// 大量傷患 渲染邏輯
function updateClock() {
  const now = new Date(); const days = ["日","一","二","三","四","五","六"];
  document.getElementById("clock-date").textContent = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} (${days[now.getDay()]})`;
  document.getElementById("clock-time").textContent = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
}

// 檢傷分級：Triage 1-5 → A/B/C 三級（A 重症 1-2、B 中症 3、C 輕症 4-5）
function triageGrade(t) { return t <= 2 ? "A" : (t === 3 ? "B" : "C"); }

function buildFlags(p) {
  const flags = [];
  if (p.Deceased)    flags.push('<span class="flag-badge flag-死亡">死亡</span>');
  if (p.Mbd)         flags.push('<span class="flag-badge flag-MBD">MBD</span>');
  if (p.Aad)         flags.push('<span class="flag-badge flag-AAD">AAD</span>');
  if (p.Dnr)         flags.push('<span class="flag-badge flag-DNR">DNR</span>');
  if (p.Observation) flags.push('<span class="flag-badge flag-留觀">留觀</span>');
  if (p.Admitted)    flags.push(`<span class="flag-badge flag-住院">住院${p.AdmBedNo ? ' ' + p.AdmBedNo : ''}</span>`);
  if (p.TransferOut) flags.push('<span class="flag-badge flag-轉出">轉出</span>');
  if (p.TransferIn)  flags.push('<span class="flag-badge flag-轉入">轉入</span>');
  return flags.length ? `<div class="flag-badges">${flags.join("")}</div>` : "—";
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("ward-director").textContent = MOCK_DATA.HospitalInfo.WardDirector;
  document.getElementById("head-nurse").textContent    = MOCK_DATA.HospitalInfo.HeadNurse;
  updateClock(); setInterval(updateClock, 1000);

  const patients = MOCK_DATA.Beds
    .filter(b => b.Status !== "empty" && b.Patient)
    .map(b => ({ ...b.Patient, BedId: b.BedId }))
    .sort((a, b) => a.Triage - b.Triage);

  const sevA      = patients.filter(p => p.Triage <= 2).length;
  const sevB      = patients.filter(p => p.Triage === 3).length;
  const sevC      = patients.filter(p => p.Triage >= 4).length;
  const dead      = patients.filter(p => p.Deceased).length;
  const transfer  = patients.filter(p => p.TransferOut).length;
  document.getElementById("mc-stat-total").textContent    = patients.length;
  document.getElementById("mc-stat-sev-a").textContent  = sevA;
  document.getElementById("mc-stat-sev-b").textContent  = sevB;
  document.getElementById("mc-stat-sev-c").textContent  = sevC;
  document.getElementById("mc-stat-dead").textContent      = dead;
  document.getElementById("mc-stat-transfer").textContent  = transfer;

  const tbody = document.getElementById("mc-list");
  if (!patients.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted)">目前無病患資料</td></tr>`;
    return;
  }
  tbody.innerHTML = patients.map(p => `
    <tr>
      <td class="mc-bed">${p.BedId}</td>
      <td class="mc-patient">
        <span class="${p.Gender==='M'?'gender-m':'gender-f'}">${p.PatientName}</span>
        <div class="mc-basic">${p.Gender}/${p.Age}</div>
      </td>
      <td style="font-family:var(--font-num);font-size:14px;color:var(--text-muted)">${p.MedRecord || "—"}</td>
      <td><span class="triage-badge tg-${triageGrade(p.Triage).toLowerCase()}">${triageGrade(p.Triage)}</span></td>
      <td>${p.Department || "—"}</td>
      <td>${p.Diagnosis  || "—"}</td>
      <td>${p.ArrivalTime || "—"}</td>
      <td>${buildFlags(p)}</td>
    </tr>`).join("");
});
