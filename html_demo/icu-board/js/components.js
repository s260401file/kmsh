// 標記樣式（10 形狀 × 實心/空心 = 20）：依固定順序循環指派，不對應註記語意（與 W52 同一套）
const FLAG_ORDER = ["DNR","高危跌","依賴L1","依賴L2","依賴L3","隔離","保密","禁治療",
  "禁食","過敏","RRT","化療","輪椅","推床","氧氣設備","洗腎"];
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

// AICU 值班表（原型；資料為 mock，對照實體白板 aicu.jpg 左半，右半病床資訊不納入）
// 顯示於 4F 平面 4F-01 下方 4×3 空區。部分手寫姓名為最佳判讀、待院方核對。
function dutyRosterPanelHTML() {
  return `<div class="icu-duty-panel">
      <div class="icu-duty-head"><span class="icu-duty-title">AICU 值班表</span><span class="icu-duty-date">115/07/02（四）</span></div>
      <div class="icu-duty-body">
        <div class="icu-duty-col">
          <div class="icu-duty-sec-t">醫療團隊</div>
          <div class="icu-duty-r"><span class="icu-duty-role">主任</span><span class="icu-duty-name">張雅淳</span><span class="icu-duty-ext">0266027</span></div>
          <div class="icu-duty-r"><span class="icu-duty-role">內科</span><span class="icu-duty-name">林芸仟</span><span class="icu-duty-ext">0264638</span></div>
          <div class="icu-duty-r"><span class="icu-duty-role">外科</span><span class="icu-duty-name">林士助</span><span class="icu-duty-ext">0261594</span></div>
          <div class="icu-duty-r"><span class="icu-duty-role">值班</span><span class="icu-duty-name">陳蕙君</span><span class="icu-duty-ext">0264632</span></div>
          <div class="icu-duty-r"><span class="icu-duty-role">護理長</span><span class="icu-duty-name">吳美瑞</span></div>
          <div class="icu-duty-r"><span class="icu-duty-role">行政總值</span><span class="icu-duty-ext">0262207</span></div>
          <div class="icu-duty-r"><span class="icu-duty-role">專科師</span><span class="icu-duty-name">楊鈞漢</span><span class="icu-duty-ext">0267595</span></div>
          <div class="icu-duty-r"><span class="icu-duty-role">透析師</span><span class="icu-duty-name">江雅惠</span><span class="icu-duty-ext">0269325</span></div>
        </div>
        <div class="icu-duty-col">
          <div class="icu-duty-sec-t">三班護理師</div>
          <div class="icu-duty-shift">
            <div class="icu-sh"><span class="icu-sh-k n">大夜</span><span class="icu-sh-n">葉怡廷</span></div>
            <div class="icu-sh"><span class="icu-sh-k d">白班</span><span class="icu-sh-n">—</span></div>
            <div class="icu-sh"><span class="icu-sh-k e">小夜</span><span class="icu-sh-n">劉妍伶</span></div>
          </div>
          <div class="icu-duty-sec-t">緊急應變編組</div>
          <div class="icu-resp"><span>滅火班</span><span>避難引導</span><span>安全防護</span><span>通報班</span><span>救護班</span></div>
          <div class="icu-duty-sec-t">書記 / 傳送</div>
          <div class="icu-duty-r"><span class="icu-duty-role">書記</span><span class="icu-duty-name">田雅芬</span></div>
          <div class="icu-duty-r"><span class="icu-duty-role">傳送</span><span class="icu-duty-ext">0262577</span></div>
        </div>
        <div class="icu-duty-col">
          <div class="icu-duty-sec-t">值班專科護理師</div>
          <div class="icu-np-r"><span class="icu-np-k n">N</span><span class="icu-np-n">蘇紋如、陳月惠</span></div>
          <div class="icu-np-r"><span class="icu-np-k d">D</span><span class="icu-np-n">鄭婷、高佩君、李妍萱</span></div>
          <div class="icu-np-r"><span class="icu-np-k e">E</span><span class="icu-np-n">江延衛、林玉筠、張惠雯</span></div>
          <div class="icu-duty-sec-t">聯絡電話</div>
          <div class="icu-tel"><b>警衛</b> <span>0262016</span>　<b>救護車</b> <span>0918527590</span></div>
          <div class="icu-tel"><b>訂床</b> <span>5216、2134</span>　<b>轉診</b> <span>6710</span></div>
          <div class="icu-tel"><b>超音波管理</b> <span>4090-4091</span></div>
        </div>
      </div>
    </div>`;
}

// 單樓層渲染（對齊 React）：只畫目前樓層的床位＋該樓層統計，並更新標題與切換鈕
function renderFloor(floor) {
  const floorBeds = MOCK_DATA.beds.filter(b => b.floor === floor);

  const grid = document.getElementById("bed-grid");
  grid.className = floor === 4 ? "grid-4f" : "grid-3f";
  grid.innerHTML = floorBeds.map(renderBedCard).join("");

  // attach click handlers
  grid.querySelectorAll(".bed-card:not(.empty)").forEach(card => {
    card.addEventListener("click", () => {
      const bed = floorBeds.find(b => b.id === card.dataset.id);
      if (bed) openModal(bed);
    });
  });

  // 4F 平面 4F-01 下方 4×3 空區放 AICU 值班表面板（3F 版面不同，不顯示）
  if (floor === 4) grid.insertAdjacentHTML("beforeend", dutyRosterPanelHTML());

  // 標題、切換鈕、統計
  document.getElementById("floor-label").textContent = `▌ ${floor}F　共 ${floorBeds.length} 床`;
  document.getElementById("stats-title").textContent = `▌ ${floor}F 統計`;
  document.getElementById("floor-toggle").textContent = floor === 4 ? "切換 3F ▸" : "◂ 切回 4F";
  renderStats(floorBeds);
}

function openModal(bed) {
  const p = bed.patient;
  const bedLabel = `${bed.floor}F-${String(bed.num).padStart(2,"0")}`;
  const daysSince = Math.floor((new Date() - new Date("2026/" + p.admission)) / 86400000);

  document.getElementById("m-bedid").textContent   = bedLabel;
  document.getElementById("m-name").textContent    = p.name;
  document.getElementById("m-basic").textContent   = `${p.gender === "M" ? "男" : "女"} / ${p.age}歲`;
  document.getElementById("m-medrec").textContent  = p.medRecord || "—";
  document.getElementById("m-idno").textContent    = p.idNo || "—";
  document.getElementById("m-birth").textContent   = p.birthDate  || "—";
  document.getElementById("m-dept").textContent    = p.department || "—";
  document.getElementById("m-diag").textContent    = p.diagnosis;
  document.getElementById("m-doctor").textContent  = p.doctor;
  document.getElementById("m-nurse").textContent   = p.nurse;
  document.getElementById("m-admit").textContent   = "2026/" + p.admission;
  document.getElementById("m-days").textContent    = daysSince >= 0 ? daysSince + " 天" : "—";
  document.getElementById("m-cond").textContent    = ({ "穩定":"C級", "重症":"B級", "危急":"A級" })[p.condition] || p.condition;
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
