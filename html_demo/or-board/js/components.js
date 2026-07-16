function sourceClass(source) {
  if (source === "急診刀") return "src-er";
  if (source === "門診刀") return "src-op";
  if (source === "住院刀") return "src-inp";
  return "";
}

function renderRoomCard(room) {
  if (room.Status === "empty") {
    return `
      <div class="or-card empty" data-id="${room.RoomId}" data-status="empty">
        <div class="empty-room-num">${room.RoomId}</div>
        <div class="empty-label">空房</div>
      </div>`;
  }

  const p = room.Patient;
  const srcCls  = sourceClass(p.SurgerySource);
  const genderCls = p.Gender === "M" ? "gender-m" : "gender-f";
  const todayCount = room.TodayCount || roomSurgeries(room).length;

  return `
    <div class="or-card ${room.Status} ${srcCls}"
         data-id="${room.RoomId}"
         data-status="${room.Status}"
         data-source="${p.SurgerySource}">
      <div class="card-row1">
        <span class="room-num">${room.RoomId}</span>
        <span class="badge badge-${p.SurgerySource}">${p.SurgerySource}</span>
        <span class="badge badge-${p.SurgeryStatus}">${p.SurgeryStatus}</span>
        ${todayCount > 1 ? `<span class="badge badge-count">今日 ${todayCount} 台</span>` : ""}
      </div>
      <div class="card-row2">
        <span class="patient-name ${genderCls}">${p.PatientName}</span>
        <span class="patient-basic">${p.Gender}/${p.Age}　${p.ScheduledTime || ""}</span>
      </div>
      <div class="card-row3">${p.SurgeryName}</div>
      <div class="card-row4">術：${p.Doctor || "—"}${p.AnesType ? `　麻：${p.AnesType}` : ""}</div>
    </div>`;
}

// 第 8 格：今日各刀房溫溼度摘要卡（後台「溫溼度記錄」填入；缺值顯示「—」）
function renderEnvCard(rooms) {
  const env = MOCK_DATA.RoomEnv || {};
  const now = new Date();
  const dateStr = `${now.getMonth() + 1}/${now.getDate()}`;
  const fmt = v => (v == null ? "—" : String(v));
  const rows = rooms.map(r => {
    const e = env[r.RoomId] || {};
    return `
      <div class="or-env-row">
        <span class="or-env-room">${r.RoomId}</span>
        <span class="or-env-val">${fmt(e.temperature)}<i>°C</i></span>
        <span class="or-env-val">${fmt(e.humidity)}<i>%</i></span>
      </div>`;
  }).join("");
  return `
    <div class="or-env-card">
      <div class="or-env-title">溫溼度<span class="or-env-date">${dateStr}</span></div>
      <div class="or-env-body">${rows}</div>
    </div>`;
}

function renderAllRooms(rooms) {
  const grid = document.getElementById("or-grid");
  grid.innerHTML = rooms.map(renderRoomCard).join("") + renderEnvCard(rooms);
  document.querySelectorAll(".or-card:not(.empty)").forEach(card => {
    card.addEventListener("click", () => {
      const id   = card.dataset.id;
      const room = MOCK_DATA.Rooms.find(r => r.RoomId === id);
      if (room) openModal(room);
    });
  });
}

function renderStats(rooms) {
  const s = getStats(rooms);
  document.getElementById("stat-total").textContent    = s.count;          // 今日總刀
  document.getElementById("stat-inSurgery").textContent = s.inSurgery;
  document.getElementById("stat-erKnife").textContent  = s.erKnife;
  document.getElementById("stat-opKnife").textContent  = s.opKnife;
  document.getElementById("stat-inpKnife").textContent = s.inpKnife;
  document.getElementById("stat-prep").textContent     = s.prep;
  document.getElementById("stat-completed").textContent = s.completed;
  document.getElementById("stat-empty").textContent    = s.empty;
}

// 填入指定台次（idx）的病患詳情；多台時於標題下方顯示可切換的今日台次清單
function fillRoomModal(room, idx) {
  const list = roomSurgeries(room);
  const p = list[idx] || room.Patient;
  const status = p.SurgeryStatus || "排程";

  // 手術時長
  let durationStr = "—";
  if (p.StartTime) {
    const [sh, sm] = p.StartTime.split(":").map(Number);
    const startMins = sh * 60 + sm;
    if (p.EndTime) {
      const [eh, em] = p.EndTime.split(":").map(Number);
      const dur = (eh * 60 + em) - startMins;
      durationStr = `${Math.floor(dur / 60)}h ${dur % 60}m`;
    } else {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const elapsed = nowMins - startMins;
      durationStr = elapsed > 0 ? `${Math.floor(elapsed / 60)}h ${elapsed % 60}m（進行中）` : "—";
    }
  }

  document.getElementById("m-roomid").textContent    = room.RoomId;
  document.getElementById("m-name").textContent      = p.PatientName;
  document.getElementById("m-basic").textContent     = `${p.Gender === "M" ? "男" : "女"} / ${p.Age}歲`;
  document.getElementById("m-medrec").textContent    = p.MedRecord || "—";
  document.getElementById("m-birth").textContent     = p.BirthDate || "—";
  document.getElementById("m-dept").textContent      = p.Department || "—";
  document.getElementById("m-diag").textContent      = p.Diagnosis;
  document.getElementById("m-surgery").textContent   = p.SurgeryName;
  document.getElementById("m-doctor").textContent    = p.Doctor;
  document.getElementById("m-scrub").textContent     = p.ScrubNurse;
  document.getElementById("m-circ").textContent      = p.CircNurse;
  document.getElementById("m-anes").textContent      = p.AnesType;
  document.getElementById("m-source").textContent    = p.SurgerySource;
  document.getElementById("m-surg-status").textContent = status;
  document.getElementById("m-sched").textContent     = p.ScheduledTime || "—";
  document.getElementById("m-start").textContent     = (status === "手術中" || status === "已完成") ? (p.StartTime || "—") : "—";
  document.getElementById("m-end").textContent       = p.EndTime || (status === "手術中" ? "進行中" : "—");
  document.getElementById("m-duration").textContent  = durationStr;
  document.getElementById("m-notes").textContent     = p.Notes || "無";

  document.getElementById("m-badges").innerHTML =
    `<span class="badge badge-${p.SurgerySource}">${p.SurgerySource}</span>` +
    `<span class="badge badge-${status}">${status}</span>`;

  // 今日台次清單（多台時可切換）
  const tl = document.getElementById("m-todaylist");
  if (list.length > 1) {
    tl.style.display = "";
    document.getElementById("m-todaylabel").textContent = `今日 ${list.length} 台：`;
    document.getElementById("m-todayitems").innerHTML = list.map((s, i) =>
      `<button class="or-today-item${i === idx ? " active" : ""}" data-idx="${i}">${s.ScheduledTime || "—"} ${s.PatientName}</button>`
    ).join("");
    document.querySelectorAll("#m-todayitems .or-today-item").forEach(b => {
      b.addEventListener("click", () => fillRoomModal(room, parseInt(b.dataset.idx, 10)));
    });
  } else {
    tl.style.display = "none";
  }
}

function openModal(room) {
  const list = roomSurgeries(room);
  let initIdx = list.findIndex(s => s.SurgeryStatus === "手術中");
  if (initIdx < 0) initIdx = 0;
  fillRoomModal(room, initIdx);
  document.getElementById("roomModal").classList.add("show");
}

function closeModal() {
  document.getElementById("roomModal").classList.remove("show");
}

// 今日已完成手術清單 Modal（點統計面板/篩選列「已完成 ▸」開啟）
function openCompleted() {
  const items = completedSurgeries(MOCK_DATA.Rooms);
  document.getElementById("comp-count").textContent = `${items.length} 台`;
  document.getElementById("comp-tbody").innerHTML = items.length
    ? items.map(s => `
      <tr>
        <td><span class="surg-td-or">${s.roomId}</span></td>
        <td>${s.ScheduledTime || "—"}</td>
        <td><span class="${s.Gender === "M" ? "gender-m" : "gender-f"}">${s.PatientName}</span> ${s.Gender}/${s.Age ?? "—"}</td>
        <td>${s.SurgeryName || "—"}</td>
        <td>${s.Doctor || "—"}</td>
      </tr>`).join("")
    : `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted)">今日尚無已完成手術</td></tr>`;
  document.getElementById("completedModal").classList.add("show");
}

function closeCompleted() {
  document.getElementById("completedModal").classList.remove("show");
}
