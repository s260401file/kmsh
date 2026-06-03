// 卡片用：純圓點群（自動換行，全部顯示）
function dotsHTML(badges) {
  return badges
    .map(b => `<span class="flag-dot flag-dot-${b}" title="${b}"></span>`)
    .join("");
}

// Modal 用：圓點 + 文字（與圖例風格一致）
function badgeHTML(badges) {
  return badges
    .map(b => `<span class="legend-item modal-flag"><span class="flag-dot flag-dot-${b}"></span><span>${b}</span></span>`)
    .join("");
}

function buildBadges(patient, bedStatus = "") {
  if (!patient) return [];
  const b = [];
  if (patient.Dnr)                                      b.push("DNR");
  if (patient.FallRisk)                                 b.push("高危跌");
  if (patient.Dependency)                               b.push("依賴" + patient.Dependency);
  if (patient.Isolation && patient.Isolation !== "無")  b.push("隔離");
  if (patient.Confidential)                             b.push("保密");
  if (patient.NoTreatment)                              b.push("禁治療");
  if (patient.Npo)                                      b.push("禁食");
  if (patient.Allergy)                                  b.push("過敏");
  if (patient.Rrt)                                      b.push("RRT");
  if (patient.Chemo)                                    b.push("化療");
  if (patient.Transport)                                b.push(patient.Transport);
  if (patient.Oxygen)                                   b.push("氧氣設備");
  if (patient.Renal)                                    b.push("洗腎");
  if (bedStatus === "transfer-in")                      b.push("待轉入");
  if (bedStatus === "transfer")                         b.push("待轉出");
  if (bedStatus === "discharge")                        b.push("待出院");
  return b;
}

function renderBedCard(bed) {
  // 顯示三位數床號（W52-001 → 001）
  const bedLabel = bed.BedId.replace("W52-", "");

  if (bed.Status === "empty") {
    return `
      <div class="bed-card empty bed-${bed.BedId}" data-id="${bed.BedId}" data-status="empty">
        <div class="empty-bed-num">${bedLabel}</div>
        <div class="empty-label">空床</div>
      </div>`;
  }
  const p          = bed.Patient;
  const genderAge  = `${p.Gender}/${p.Age}`;
  const genderCls  = p.Gender === "M" ? "gender-m" : "gender-f";
  const allBadges  = buildBadges(p, bed.Status);
  return `
    <div class="bed-card ${bed.Status} bed-${bed.BedId}"
         data-id="${bed.BedId}" data-status="${bed.Status}"
         data-badges='${JSON.stringify(allBadges)}'
         data-surgery="${p.Surgery  ? '1' : '0'}"
         data-exam="${p.Exam     ? '1' : '0'}"
         data-consult="${p.Consult  ? '1' : '0'}"
         data-tube-port="${p.PortCath    ? '1' : '0'}"
         data-tube-dlvc="${p.DLVC       ? '1' : '0'}"
         data-tube-foley="${p.Foley     ? '1' : '0'}"
         data-tube-cvc="${p.CVC        ? '1' : '0'}"
         data-tube-cardiac="${p.CardiacCath ? '1' : '0'}">
      <div class="card-row1">
        <span class="bed-num">${bedLabel}</span>
      </div>
      <div class="card-row2">
        <span class="patient-name ${genderCls}">${p.PatientName}</span>
        <span class="patient-basic">${genderAge}</span>
      </div>
      <div class="dots-row">${dotsHTML(allBadges)}</div>
    </div>`;
}

function renderStats(beds) {
  const s = getStats(beds);
  document.getElementById("stat-total").textContent    = s.total;
  document.getElementById("stat-occupied").textContent = s.occupied;
  document.getElementById("stat-surgery").textContent  = s.surgery;
  document.getElementById("stat-exam").textContent     = s.exam;
  document.getElementById("stat-consult").textContent  = s.consult;
  document.getElementById("stat-iso").textContent      = s.isolation;
  document.getElementById("stat-dnr").textContent      = s.dnr;
  document.getElementById("stat-rrt").textContent      = s.rrt;
  document.getElementById("stat-port").textContent     = s.port;
  document.getElementById("stat-dlvc").textContent     = s.dlvc;
  document.getElementById("stat-foley").textContent    = s.foley;
  document.getElementById("stat-cvc").textContent      = s.cvc;
  document.getElementById("stat-cardiac").textContent  = s.cardiac;
}

// 渲染所有床位到單一 CSS Grid（不再分房間）
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

function openModal(bed) {
  const p        = bed.Patient;
  const bedLabel = bed.BedId.replace("W52-", "");
  const daysSince = Math.floor((new Date() - new Date("2026/" + p.AdmissionDate)) / 86400000);
  const genderTxt = p.Gender === "M" ? "男" : "女";

  document.getElementById("m-bedid").textContent   = "W52-" + bedLabel;
  document.getElementById("m-name").textContent    = p.PatientName;
  document.getElementById("m-basic").textContent   = `${genderTxt} / ${p.Age}歲`;
  document.getElementById("m-medrec").textContent  = p.MedicalRecordNo || "—";
  document.getElementById("m-birth").textContent   = p.BirthDate || "—";
  document.getElementById("m-dept").textContent    = p.Department || "—";
  document.getElementById("m-diag").textContent    = p.Diagnosis;
  document.getElementById("m-doctor").textContent  = p.AttendingDoctor;
  document.getElementById("m-nurse").textContent   = p.PrimaryNurse;
  document.getElementById("m-admit").textContent   = "2026/" + p.AdmissionDate;
  document.getElementById("m-days").textContent    = daysSince >= 0 ? daysSince + " 天" : "—";
  document.getElementById("m-cond").textContent    = p.Condition || "—";
  document.getElementById("m-iso").textContent     = p.Isolation || "無";
  document.getElementById("m-dnr").textContent     = p.Dnr ? "是 ✓" : "否";
  const tubeMap = [
    ["PortCath",    "人工血管"],
    ["DLVC",        "雙腔靜脈導管"],
    ["Foley",       "導尿管"],
    ["CVC",         "中心靜脈導管"],
    ["CardiacCath", "心導管"],
  ];
  const tubes = tubeMap.filter(([key]) => p[key]).map(([, label]) => label);
  document.getElementById("m-tubes").textContent   = tubes.length ? tubes.join("、") : "無";
  document.getElementById("m-notes").textContent   = p.Notes || "無";
  document.getElementById("m-badges").innerHTML    = badgeHTML(buildBadges(p, bed.Status));

  document.getElementById("bedModal").classList.add("show");
}

function closeModal() {
  document.getElementById("bedModal").classList.remove("show");
}
