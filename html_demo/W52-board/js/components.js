// 標記樣式（10 形狀 × 實心/空心 = 20）：依固定順序循環指派，不對應註記語意
const FLAG_ORDER = ["DNR","高危跌","依賴L1","依賴L2","依賴L3","隔離","保密","禁治療",
  "禁食","過敏","RRT","化療","輪椅","推床","氧氣設備","洗腎","待轉入","待轉出","待出院"];
const STYLE_CYCLE = [
  "circle","tri-up","square","pentagon","cross","heart","teardrop","sun","star","tri-rt",
  "circle-o","tri-up-o","square-o","pentagon-o","cross-o","heart-o","teardrop-o","sun-o","star-o","tri-rt-o",
];
const FLAG_STYLE = Object.fromEntries(FLAG_ORDER.map((k, i) => [k, STYLE_CYCLE[i % STYLE_CYCLE.length]]));
const styleCls = b => FLAG_STYLE[b] || "circle";

// SVG 形狀庫（viewBox 0 0 24 24，%P% = 上色屬性；實心 fill、空心 stroke）
const SHAPE_SVG = {
  circle:   '<circle cx="12" cy="12" r="8" %P%/>',
  "tri-up": '<path d="M12 3.5 20.6 19 3.4 19Z" %P%/>',
  square:   '<rect x="4.5" y="4.5" width="15" height="15" rx="1.5" %P%/>',
  pentagon: '<path d="M12 3 20.6 9.2 17.3 19.3 6.7 19.3 3.4 9.2Z" %P%/>',
  cross:    '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" %P%/>',
  heart:    '<path d="M12 20.5C12 20.5 3.5 14.3 3.5 8.6 3.5 5.8 5.6 3.8 8.1 3.8 9.8 3.8 11.3 4.8 12 6.2 12.7 4.8 14.2 3.8 15.9 3.8 18.4 3.8 20.5 5.8 20.5 8.6 20.5 14.3 12 20.5 12 20.5Z" %P%/>',
  teardrop: '<path d="M12 2.5C12 2.5 18.5 10.5 18.5 15.5A6.5 6.5 0 1 1 5.5 15.5C5.5 10.5 12 2.5 12 2.5Z" %P%/>',
  sun:      '<circle cx="12" cy="12" r="5" %P%/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5.4" x2="12" y2="2.5"/><line x1="12" y1="18.6" x2="12" y2="21.5"/><line x1="18.6" y1="12" x2="21.5" y2="12"/><line x1="5.4" y1="12" x2="2.5" y2="12"/><line x1="16.7" y1="7.3" x2="18.7" y2="5.3"/><line x1="7.3" y1="7.3" x2="5.3" y2="5.3"/><line x1="16.7" y1="16.7" x2="18.7" y2="18.7"/><line x1="7.3" y1="16.7" x2="5.3" y2="18.7"/></g>',
  star:     '<path d="M12 2.2 14.7 9.2 22 9.5 16.3 14.1 18.2 21.2 12 17.1 5.8 21.2 7.7 14.1 2 9.5 9.3 9.2Z" %P%/>',
  "tri-rt": '<path d="M20.5 12 3.5 3.5 3.5 20.5Z" %P%/>',
};
function shapeSVG(name) {
  const outline = name.endsWith("-o");
  const base = outline ? name.slice(0, -2) : name;
  const paint = outline
    ? 'fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"'
    : 'fill="currentColor"';
  const inner = (SHAPE_SVG[base] || SHAPE_SVG.circle).replace("%P%", paint);
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
}

// 卡片用：純標記群（自動換行，全部顯示）
function dotsHTML(badges) {
  return badges
    .map(b => `<span class="flag-dot flag-dot-${b}" title="${b}">${shapeSVG(styleCls(b))}</span>`)
    .join("");
}

// Modal 用：標記 + 文字（與圖例風格一致）
function badgeHTML(badges) {
  return badges
    .map(b => `<span class="legend-item modal-flag"><span class="flag-dot flag-dot-${b}">${shapeSVG(styleCls(b))}</span><span>${b}</span></span>`)
    .join("");
}

// 圖例：把每顆按鈕內的標記注入對應 SVG（依 data-filter = 旗標名）
function renderLegendShapes() {
  document.querySelectorAll(".filter-bar .legend-item[data-filter]").forEach(btn => {
    const k = btn.dataset.filter;
    const dot = btn.querySelector(".flag-dot");
    if (dot && FLAG_STYLE[k]) dot.innerHTML = shapeSVG(styleCls(k));
  });
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
