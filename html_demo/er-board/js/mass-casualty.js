// 大量傷患 渲染邏輯
function updateClock() {
  const now = new Date(); const days = ["日","一","二","三","四","五","六"];
  document.getElementById("clock-date").textContent = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} (${days[now.getDay()]})`;
  document.getElementById("clock-time").textContent = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
}

// 檢傷分級：院方真實值 1/2/3 → A/B/C 三級（1→A 重症、2→B 中症、3→C 輕症）
function triageGrade(t) { return t === 1 ? "A" : (t === 2 ? "B" : "C"); }

// 病人註記旗標（死亡 / MBD / AAD / DNR / 留觀 / 住院 / 轉出入）；轉出入顯示醫院名
function buildFlags(p) {
  const flags = [];
  if (p.Deceased)    flags.push('<span class="flag-badge flag-死亡">死亡</span>');
  if (p.Mbd)         flags.push('<span class="flag-badge flag-MBD">MBD</span>');
  if (p.Aad)         flags.push('<span class="flag-badge flag-AAD">AAD</span>');
  if (p.Dnr)         flags.push('<span class="flag-badge flag-DNR">DNR</span>');
  if (p.Observation) flags.push('<span class="flag-badge flag-留觀">留觀</span>');
  if (p.Admitted)    flags.push(`<span class="flag-badge flag-住院">住院${p.AdmBedNo ? ' ' + p.AdmBedNo : ''}</span>`);
  if (p.TransferOut) flags.push(`<span class="flag-badge flag-轉出">轉出${p.TransferHospital ? `（${p.TransferHospital}）` : ''}</span>`);
  if (p.TransferIn)  flags.push(`<span class="flag-badge flag-轉入">轉入${p.TransferInHospital ? `（${p.TransferInHospital}）` : ''}</span>`);
  return flags.length ? `<div class="flag-badges">${flags.join("")}</div>` : "—";
}

// 篩選鍵 → 判定函式（'all' 顯示全部）
const MATCHERS = {
  all:         () => true,
  sevA:        p => p.Triage === 1,
  sevB:        p => p.Triage === 2,
  sevC:        p => p.Triage === 3,
  dead:        p => p.Deceased,
  transferOut: p => p.TransferOut,
  transferIn:  p => p.TransferIn,
};

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("ward-director").textContent = MOCK_DATA.HospitalInfo.WardDirector;
  document.getElementById("head-nurse").textContent    = MOCK_DATA.HospitalInfo.HeadNurse;
  updateClock(); setInterval(updateClock, 1000);

  const patients = MOCK_DATA.Beds
    .filter(b => b.Status !== "empty" && b.Patient)
    .map(b => ({ ...b.Patient, BedId: b.BedId }))
    .sort((a, b) => (a.Triage ?? 99) - (b.Triage ?? 99));

  // 各統計數：A 重症、B 中症、C 輕症、死亡、轉出、轉入
  const sevA        = patients.filter(p => p.Triage === 1).length;
  const sevB        = patients.filter(p => p.Triage === 2).length;
  const sevC        = patients.filter(p => p.Triage === 3).length;
  const dead        = patients.filter(p => p.Deceased).length;
  const transferOut = patients.filter(p => p.TransferOut).length;
  const transferIn  = patients.filter(p => p.TransferIn).length;
  document.getElementById("mc-stat-total").textContent       = patients.length;
  document.getElementById("mc-stat-sev-a").textContent       = sevA;
  document.getElementById("mc-stat-sev-b").textContent       = sevB;
  document.getElementById("mc-stat-sev-c").textContent       = sevC;
  document.getElementById("mc-stat-dead").textContent        = dead;
  document.getElementById("mc-stat-transfer").textContent    = transferOut;
  document.getElementById("mc-stat-transfer-in").textContent = transferIn;

  const tbody = document.getElementById("mc-list");

  function renderRows(filter) {
    const shown = patients.filter(MATCHERS[filter] || MATCHERS.all);
    if (!shown.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted)">${patients.length === 0 ? '目前無病患資料' : '無符合此篩選的病患'}</td></tr>`;
      return;
    }
    tbody.innerHTML = shown.map(p => `
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
        <td>${(p.ArrivalDate || p.ArrivalTime) ? `${p.ArrivalDate || ""} ${p.ArrivalTime || ""}`.trim() : "—"}</td>
        <td>${buildFlags(p)}</td>
      </tr>`).join("");
  }

  // 點統計卡切換篩選（再點同卡回全部）
  let currentFilter = "all";
  const cards = document.querySelectorAll(".mc-stat-card");
  cards.forEach(card => card.addEventListener("click", () => {
    const f = card.dataset.filter;
    currentFilter = (currentFilter === f && f !== "all") ? "all" : f;
    cards.forEach(c => c.classList.toggle("active", c.dataset.filter === currentFilter));
    renderRows(currentFilter);
  }));

  renderRows("all");
});
