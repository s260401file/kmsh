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

  return `
    <div class="or-card ${room.Status} ${srcCls}"
         data-id="${room.RoomId}"
         data-status="${room.Status}"
         data-source="${p.SurgerySource}">
      <div class="card-row1">
        <span class="room-num">${room.RoomId}</span>
        <span class="badge badge-${p.SurgerySource}">${p.SurgerySource}</span>
        <span class="badge badge-${p.SurgeryStatus}">${p.SurgeryStatus}</span>
      </div>
      <div class="card-row2">
        <span class="patient-name ${genderCls}">${p.PatientName}</span>
        <span class="patient-basic">${p.Gender}/${p.Age}</span>
      </div>
      <div class="card-row3">${p.SurgeryName}</div>
      <div class="card-row4">術：${p.Doctor}</div>
    </div>`;
}

function renderAllRooms(rooms) {
  const grid = document.getElementById("or-grid");
  grid.innerHTML = rooms.map(renderRoomCard).join("");
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
  document.getElementById("stat-total").textContent    = s.total;
  document.getElementById("stat-inSurgery").textContent = s.inSurgery;
  document.getElementById("stat-erKnife").textContent  = s.erKnife;
  document.getElementById("stat-opKnife").textContent  = s.opKnife;
  document.getElementById("stat-inpKnife").textContent = s.inpKnife;
  document.getElementById("stat-prep").textContent     = s.prep;
  document.getElementById("stat-completed").textContent = s.completed;
  document.getElementById("stat-empty").textContent    = s.empty;
}

function openModal(room) {
  const p = room.Patient;

  // Calculate elapsed / surgery duration
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
  document.getElementById("m-surg-status").textContent = p.SurgeryStatus;
  document.getElementById("m-sched").textContent     = p.ScheduledTime || "—";
  document.getElementById("m-start").textContent     = p.StartTime || "—";
  document.getElementById("m-end").textContent       = p.EndTime || (p.StartTime ? "進行中" : "—");
  document.getElementById("m-duration").textContent  = durationStr;
  document.getElementById("m-notes").textContent     = p.Notes || "無";

  document.getElementById("m-badges").innerHTML =
    `<span class="badge badge-${p.SurgerySource}">${p.SurgerySource}</span>` +
    `<span class="badge badge-${p.SurgeryStatus}">${p.SurgeryStatus}</span>`;

  document.getElementById("roomModal").classList.add("show");
}

function closeModal() {
  document.getElementById("roomModal").classList.remove("show");
}
