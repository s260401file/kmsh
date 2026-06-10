// 標記樣式（10 形狀 × 實心/空心 = 20）：依固定順序循環指派，不對應註記語意（與 W52 同一套）
const FLAG_ORDER = ["死亡","MBD","AAD","轉出","轉入","DNR","留觀","住院"];
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

// 卡片用：純標記群（全部顯示，自動換行）
function dotsHTML(badges) {
  return badges.map(b => `<span class="flag-dot flag-dot-${b}" title="${b}">${shapeSVG(styleCls(b))}</span>`).join("");
}

// 圖例/彈窗用：標記 + 文字
function badgeHTML(badges) {
  return badges.map(b => `<span class="badge"><span class="flag-dot flag-dot-${b}">${shapeSVG(styleCls(b))}</span>${b}</span>`).join("");
}

// 圖例：把每顆按鈕內的標記注入對應 SVG（依 flag-dot-KEY class 取旗標名）
function renderLegendShapes() {
  document.querySelectorAll(".filter-bar .flag-dot").forEach(dot => {
    const cls = [...dot.classList].find(c => c.startsWith("flag-dot-"));
    if (!cls) return;
    const k = cls.slice("flag-dot-".length);
    if (FLAG_STYLE[k]) dot.innerHTML = shapeSVG(styleCls(k));
  });
}

// 三班醫護人員（資料來自 MOCK_DATA.ShiftStaff，屆時改 API）
function renderStaffShifts(shifts) {
  const body = document.getElementById("ss-body");
  if (!body || !shifts) return;
  body.innerHTML = shifts.map(s => `
    <div class="ss-col">
      <div class="ss-shift">${s.Shift} <span class="ss-time">${s.Time}</span></div>
      <div class="ss-doctor">醫師　${s.Doctor || "—"}</div>
      <div class="ss-charge">護理　${s.ChargeNurse || "—"}</div>
      <div class="ss-count">在班 <b>${s.NurseCount ?? "—"}</b> 人</div>
    </div>`).join("");
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
    const isTemp = !!bed.NoCount;
    return `
      <div class="bed-card empty${isTemp ? ' temp-bed' : ''} bed-${cls}" data-id="${bed.BedId}" data-status="empty">
        <div class="empty-bed-num">${bed.BedId}</div>
        <div class="empty-label">${isTemp ? '暫用' : '空床'}</div>
      </div>`;
  }

  const p = bed.Patient;
  const genderCls = p.Gender === "M" ? "gender-m" : "gender-f";
  const triageCls = `triage-${p.Triage}`;
  const tg = triageGrade(p.Triage);
  const negIsoCls = (p.Isolation === "負壓隔離") ? "neg-iso" : "";
  const deceasedCls = p.Deceased ? "deceased" : "";
  const allBadges = buildBadges(p);

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
        <span class="triage-badge tg-${tg.toLowerCase()}">${tg}級</span>
        <span class="bed-num">${bed.BedId}</span>
      </div>
      <div class="card-row2">
        <span class="patient-name ${genderCls}">${p.PatientName}</span>
        <span class="patient-basic">${p.Gender}/${p.Age}</span>
      </div>
      <div class="dots-row">${dotsHTML(allBadges)}</div>
    </div>`;
}

function renderStats(beds) {
  const s = getStats(beds);
  document.getElementById("stat-total").textContent      = s.total;
  document.getElementById("stat-attending").textContent  = s.attending;
  document.getElementById("stat-observation").textContent  = s.observation;
  document.getElementById("stat-transfer-in").textContent  = s.transferIn;
  document.getElementById("stat-transfer-out").textContent = s.transferOut;
  document.getElementById("stat-sev-a").textContent        = s.sevA;
  document.getElementById("stat-sev-b").textContent        = s.sevB;
  document.getElementById("stat-sev-c").textContent        = s.sevC;
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

// 檢傷分級：Triage 1-5 → A/B/C 三級（A 重症 1-2、B 中症 3、C 輕症 4-5）
function triageGrade(t) { return t <= 2 ? "A" : (t === 3 ? "B" : "C"); }
const GRADE_LABEL = { A: "A級 重症", B: "B級 中症", C: "C級 輕症" };

function openModal(bed) {
  const p = bed.Patient;

  // 計算留觀時間
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
  const tg = triageGrade(p.Triage);
  triageEl.textContent  = GRADE_LABEL[tg] || "—";
  triageEl.className = `field-value triage-val tg-${tg.toLowerCase()}`;

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
