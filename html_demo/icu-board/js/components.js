function badgeHTML(badges) {
  return badges.map(b => `<span class="badge badge-${b}">${b}</span>`).join("");
}

function buildBadges(patient) {
  if (!patient) return [];
  const b = [];
  if (patient.dnr)                                    b.push("DNR");
  if (patient.fallRisk)                               b.push("高危跌");
  if (patient.dependency)                             b.push("依賴" + patient.dependency);
  if (patient.isolation && patient.isolation !== "無") b.push("隔離");
  if (patient.confidential)                           b.push("保密");
  if (patient.noTreatment)                            b.push("禁治療");
  if (patient.npo)                                    b.push("禁食");
  if (patient.allergy)                                b.push("過敏");
  if (patient.rrt)                                    b.push("RRT");
  if (patient.chemo)                                  b.push("化療");
  if (patient.transport === "輪椅")                   b.push("輪椅");
  else if (patient.transport === "推床")              b.push("推床");
  if (patient.oxygen)                                 b.push("氧氣設備");
  if (patient.crrt)                                   b.push("洗腎");
  return b;
}

function renderBedCard(bed) {
  if (bed.status === "empty") {
    return `
      <div class="bed-card empty bed-${bed.id}" data-id="${bed.id}" data-status="empty">
        <div class="empty-bed-num">${bed.floor}F-${String(bed.num).padStart(2,"0")}</div>
        <div class="empty-label">空床</div>
      </div>`;
  }
  const p = bed.patient;
  const bedLabel   = `${bed.floor}F-${String(bed.num).padStart(2,"0")}`;
  const genderAge  = `${p.gender}/${p.age}`;
  const genderCls  = p.gender === "M" ? "gender-m" : "gender-f";
  const allBadges  = buildBadges(p);
  const cardBadges = allBadges.slice(0, 3);
  const extra      = allBadges.length - cardBadges.length;
  const moreHtml   = extra > 0 ? `<span class="badge-more">+${extra}</span>` : "";
  return `
    <div class="bed-card ${bed.status} bed-${bed.id}"
         data-id="${bed.id}" data-status="${bed.status}"
         data-badges='${JSON.stringify(allBadges)}'
         data-surgery="${p.surgery  ? '1' : '0'}"
         data-exam="${p.exam     ? '1' : '0'}"
         data-consult="${p.consult  ? '1' : '0'}"
         data-cond="${p.condition || ''}"
         data-tube-ett="${p.ventilator ? '1' : '0'}"
         data-tube-ng="${p.ng        ? '1' : '0'}"
         data-tube-foley="${p.foley     ? '1' : '0'}"
         data-tube-cvc="${p.cvc       ? '1' : '0'}">
      <div class="card-row1">
        <span class="bed-num">${bedLabel}</span>
      </div>
      <div class="card-row2">
        <span class="patient-name ${genderCls}">${p.name}</span>
        <span class="patient-basic">${genderAge}</span>
      </div>
      <div class="card-row3">${badgeHTML(cardBadges)}${moreHtml}</div>
    </div>`;
}

function renderStats(beds) {
  const s = getStats(beds);
  document.getElementById("stat-total").textContent    = s.total;
  document.getElementById("stat-occupied").textContent = s.occupied;
  document.getElementById("stat-surgery").textContent  = s.surgery;
  document.getElementById("stat-exam").textContent     = s.exam;
  document.getElementById("stat-consult").textContent  = s.consult;
  document.getElementById("stat-sev-a").textContent    = s.sevA;
  document.getElementById("stat-sev-b").textContent    = s.sevB;
  document.getElementById("stat-sev-c").textContent    = s.sevC;
  document.getElementById("stat-iso").textContent      = s.isolation;
  document.getElementById("stat-dnr").textContent      = s.dnr;
  document.getElementById("stat-rrt").textContent      = s.rrt;
  document.getElementById("stat-ett").textContent      = s.ett;
  document.getElementById("stat-ng").textContent       = s.ng;
  document.getElementById("stat-foley").textContent    = s.foley;
  document.getElementById("stat-cvc").textContent      = s.cvc;
}

function renderAllBeds(beds) {
  const f4 = beds.filter(b => b.floor === 4);
  const f3 = beds.filter(b => b.floor === 3);

  const grid4 = document.getElementById("grid-4f");
  const grid3 = document.getElementById("grid-3f");

  grid4.innerHTML = f4.map(renderBedCard).join("");
  grid3.innerHTML = f3.map(renderBedCard).join("");

  // attach click handlers
  document.querySelectorAll(".bed-card:not(.empty)").forEach(card => {
    card.addEventListener("click", () => {
      const id = card.dataset.id;
      const bed = beds.find(b => b.id === id);
      if (bed) openModal(bed);
    });
  });
}

function openModal(bed) {
  const p = bed.patient;
  const bedLabel = `${bed.floor}F-${String(bed.num).padStart(2,"0")}`;
  const daysSince = Math.floor((new Date() - new Date("2026/" + p.admission)) / 86400000);

  document.getElementById("m-bedid").textContent   = bedLabel;
  document.getElementById("m-name").textContent    = p.name;
  document.getElementById("m-basic").textContent   = `${p.gender === "M" ? "男" : "女"} / ${p.age}歲`;
  document.getElementById("m-medrec").textContent  = p.medRecord || "—";
  document.getElementById("m-birth").textContent   = p.birthDate  || "—";
  document.getElementById("m-dept").textContent    = p.department || "—";
  document.getElementById("m-diag").textContent    = p.diagnosis;
  document.getElementById("m-doctor").textContent  = p.doctor;
  document.getElementById("m-nurse").textContent   = p.nurse;
  document.getElementById("m-admit").textContent   = "2026/" + p.admission;
  document.getElementById("m-days").textContent    = daysSince >= 0 ? daysSince + " 天" : "—";
  document.getElementById("m-cond").textContent    = p.condition;
  document.getElementById("m-iso").textContent     = p.isolation || "無";
  document.getElementById("m-dnr").textContent     = p.dnr ? "是 ✓" : "否";
  document.getElementById("m-vent").textContent    = p.ventilator ? "使用中 ✓" : "無";
  document.getElementById("m-crrt").textContent    = p.crrt ? "使用中 ✓" : "無";
  const tubeMap = [
    ["ventilator", "氣管內管"],
    ["ng",         "鼻胃管"],
    ["foley",      "導尿管"],
    ["cvc",        "中心靜脈導管"],
  ];
  const tubes = tubeMap.filter(([key]) => p[key]).map(([, label]) => label);
  document.getElementById("m-tubes").textContent   = tubes.length ? tubes.join("、") : "無";
  document.getElementById("m-notes").textContent   = p.notes || "無";
  document.getElementById("m-badges").innerHTML    = badgeHTML(buildBadges(p));

  document.getElementById("bedModal").classList.add("show");
}

function closeModal() {
  document.getElementById("bedModal").classList.remove("show");
}
