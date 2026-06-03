function badgeHTML(badges) {
  return badges.map(b => `<span class="badge badge-${b}">${b}</span>`).join("");
}

/* BedId → 合法 CSS class 名稱（轉換「負」字） */
function bedClass(bedId) {
  return bedId.replace("負", "neg");
}

const ISO_MAP = { "接觸隔離":"接觸", "飛沫隔離":"飛沫", "空氣隔離":"空氣", "負壓隔離":"負壓" };

function buildBadges(patient) {
  if (!patient) return [];
  const b = [];
  if (patient.Deceased)     b.push("死亡");
  if (patient.Mbd)          b.push("MBD");
  if (patient.Aad)          b.push("AAD");
  if (patient.TransferOut)  b.push("轉出");
  if (patient.TransferIn)   b.push("轉入");
  if (patient.Dnr)          b.push("DNR");
  if (patient.Observation)  b.push("留觀");
  if (patient.Admitted)     b.push("住院");
  return b;
}

function renderBedCard(bed) {
  const cls = bedClass(bed.BedId);

  if (bed.Status === "empty") {
    return `
      <div class="bed-card empty bed-${cls}" data-id="${bed.BedId}" data-status="empty">
        <div class="empty-bed-num">${bed.BedId}</div>
        <div class="empty-label">空床</div>
      </div>`;
  }

  const p = bed.Patient;
  const genderCls = p.Gender === "M" ? "gender-m" : "gender-f";
  const triageCls = `triage-${p.Triage}`;
  const negIsoCls = (p.Isolation === "負壓隔離") ? "neg-iso" : "";
  const deceasedCls = p.Deceased ? "deceased" : "";
  const allBadges = buildBadges(p);
  const cardBadges = allBadges.slice(0, 3);
  const extra = allBadges.length - cardBadges.length;
  const moreHtml = extra > 0 ? `<span class="badge-more">+${extra}</span>` : "";

  return `
    <div class="bed-card ${bed.Status} ${triageCls} ${negIsoCls} ${deceasedCls} bed-${cls}"
         data-id="${bed.BedId}"
         data-status="${bed.Status}"
         data-triage="${p.Triage}"
         data-observation="${p.Observation ? '1' : '0'}"
         data-awaiting="${p.Awaiting ? '1' : '0'}"
         data-awaiting-type="${p.AwaitingType || ''}"
         data-transfer="${(p.TransferOut || p.TransferIn) ? '1' : '0'}"
         data-exam="${p.Exam ? '1' : '0'}"
         data-consult="${p.Consult ? '1' : '0'}"
         data-badges='${JSON.stringify(allBadges)}'>
      <div class="card-row1">
        <span class="triage-badge t${p.Triage}">${["","一級","二級","三級","四級","五級"][p.Triage]||p.Triage+"級"}</span>
        <span class="bed-num">${bed.BedId}</span>
      </div>
      <div class="card-row2">
        <span class="patient-name ${genderCls}">${p.PatientName}</span>
        <span class="patient-basic">${p.Gender}/${p.Age}</span>
      </div>
      <div class="card-row3">${badgeHTML(cardBadges)}${moreHtml}</div>
    </div>`;
}

function renderStats(beds) {
  const s = getStats(beds);
  document.getElementById("stat-total").textContent      = s.total;
  document.getElementById("stat-attending").textContent  = s.attending;
  document.getElementById("stat-observation").textContent  = s.observation;
  document.getElementById("stat-transfer-in").textContent  = s.transferIn;
  document.getElementById("stat-transfer-out").textContent = s.transferOut;
  document.getElementById("stat-critical").textContent     = s.critical;
  document.getElementById("stat-moderate").textContent     = s.moderate;
  document.getElementById("stat-dnr").textContent          = s.dnr;
  document.getElementById("stat-admitted").textContent     = s.admitted;
  document.getElementById("stat-await-gen").textContent    = s.awaitGen;
  document.getElementById("stat-await-icu").textContent    = s.awaitIcu;
  document.getElementById("stat-await-iso").textContent    = s.awaitIso;
}

function renderAllBeds(beds) {
  const grid = document.getElementById("ward-grid");
  grid.querySelectorAll(".bed-card").forEach(el => el.remove());
  beds.forEach(bed => grid.insertAdjacentHTML("beforeend", renderBedCard(bed)));
  grid.querySelectorAll(".bed-card:not(.empty)").forEach(card => {
    card.addEventListener("click", () => {
      const id  = card.dataset.id;
      const bed = MOCK_DATA.Beds.find(b => b.BedId === id);
      if (bed) openModal(bed);
    });
  });
}

const TRIAGE_LABELS = {
  1: "一級 復甦急救",
  2: "二級 危急",
  3: "三級 緊急",
  4: "四級 次緊急",
  5: "五級 非緊急"
};

function openModal(bed) {
  const p = bed.Patient;

  // 計算滯留時間
  const arrStr = `2026-${p.ArrivalDate.replace("/","-")}T${p.ArrivalTime}:00`;
  const arrival = new Date(arrStr);
  const now = new Date();
  const diff = now - arrival;
  const stayH = Math.floor(diff / 3600000);
  const stayM = Math.floor((diff % 3600000) / 60000);
  const stayStr = diff > 0 ? (stayH > 0 ? `${stayH}h ${stayM}m` : `${stayM}m`) : "—";

  // 急診狀態
  const erStatuses = [];
  if (p.Deceased)    erStatuses.push("死亡");
  if (p.Observation) erStatuses.push("留觀");
  if (p.Awaiting) erStatuses.push(`待床${p.AwaitingType ? "（"+p.AwaitingType+"）" : ""}`);
  if (p.TransferOut) erStatuses.push(p.TransferHospital ? `轉出（${p.TransferHospital}）` : "轉出");
  if (p.TransferIn)  erStatuses.push(p.TransferHospital ? `轉入（${p.TransferHospital}）` : "轉入");
  if (p.Aad) erStatuses.push("AAD");
  if (p.Mbd) erStatuses.push("MBD");
  if (p.Admitted) erStatuses.push(p.AdmBedNo ? `住院（${p.AdmBedNo}）` : "住院");

  document.getElementById("m-bedid").textContent   = bed.BedId;
  document.getElementById("m-name").textContent    = p.PatientName;
  document.getElementById("m-basic").textContent   = `${p.Gender === "M" ? "男" : "女"} / ${p.Age}歲`;
  document.getElementById("m-medrec").textContent  = p.MedRecord || "—";
  document.getElementById("m-birth").textContent   = p.BirthDate || "—";
  document.getElementById("m-dept").textContent    = p.Department || "—";
  document.getElementById("m-diag").textContent    = p.Diagnosis;
  document.getElementById("m-doctor").textContent  = p.Doctor;
  document.getElementById("m-nurse").textContent   = p.Nurse;
  document.getElementById("m-arrival").textContent = `2026/${p.ArrivalDate} ${p.ArrivalTime}`;
  document.getElementById("m-stay").textContent    = stayStr;

  const triageEl = document.getElementById("m-triage");
  triageEl.textContent  = TRIAGE_LABELS[p.Triage] || "—";
  triageEl.className = `field-value triage-val t${p.Triage}`;

  document.getElementById("m-iso").textContent      = p.Isolation || "無";
  document.getElementById("m-dnr").textContent      = p.Dnr ? "是 ✓" : "否";
  document.getElementById("m-er-status").textContent= erStatuses.length > 0 ? erStatuses.join("、") : "看診中";
  document.getElementById("m-notes").textContent    = p.Notes || "無";
  document.getElementById("m-badges").innerHTML     = badgeHTML(buildBadges(p));

  document.getElementById("bedModal").classList.add("show");
}

function closeModal() {
  document.getElementById("bedModal").classList.remove("show");
}

