// wardApi.js — 病室動態 API 客戶端
// 角色：取各站病室動態看板（後端聚合 Board_bed 真實在床 ＋ 自建臨床補充層）；
//       另含臨床補充層(WardPatientExt)的後台 CRUD。後端端點前綴 /api/Board。
const BASE = '/api/Board'
const headers = { 'Content-Type': 'application/json' }

async function handle(res) {
  if (res.status === 204) return null
  if (!res.ok) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`) }
  return res.json()
}

// GET /api/Board/w52 → 病室動態看板（{ HospitalInfo, Version, Beds[] }，PascalCase 貼合 WardTab）
export async function getBoard(unitCode) {
  return handle(await fetch(`${BASE}/${unitCode.toLowerCase()}`))
}

// ── 臨床補充層 CRUD（後台用）──────────────────────────────────────
// GET /api/Board/{unitCode}/ext?includeAll= → 該單位臨床補充列
export async function getExt(unitCode, includeAll = true) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' })
  return handle(await fetch(`${BASE}/${unitCode}/ext?${p}`))
}
// GET /api/Board/{unitCode}/occupancy → 目前在床對照 [{hhisnum, bed}]（標示在床/已離床）
export async function getOccupancy(unitCode) {
  return handle(await fetch(`${BASE}/${unitCode}/occupancy`))
}

// ── 各科值班醫師（ER 面板 + 後台 CRUD）──────────────────────────────
export async function getOnCall(unitCode, includeAll = false) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' })
  return handle(await fetch(`${BASE}/${unitCode}/oncall?${p}`))
}
export async function createOnCall(data) {
  return handle(await fetch(`${BASE}/oncall`, { method: 'POST', headers, body: JSON.stringify(data) }))
}
export async function updateOnCall(id, data) {
  return handle(await fetch(`${BASE}/oncall/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) }))
}
export async function removeOnCall(id) {
  return handle(await fetch(`${BASE}/oncall/${id}`, { method: 'DELETE' }))
}
// ── ER 床位主檔（病室動態平面圖 + 後台 CRUD）──────────────────────
// GET /api/Board/{unitCode}/bed?includeAll= → 該單位 ER 床位主檔（含座標/分區）
export async function getErBeds(unitCode, includeAll = false) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' })
  return handle(await fetch(`${BASE}/${unitCode}/bed?${p}`))
}
export async function createErBed(data) {
  return handle(await fetch(`${BASE}/bed`, { method: 'POST', headers, body: JSON.stringify(data) }))
}
export async function updateErBed(id, data) {
  return handle(await fetch(`${BASE}/bed/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) }))
}
export async function removeErBed(id) {
  return handle(await fetch(`${BASE}/bed/${id}`, { method: 'DELETE' }))
}
// ── OR 刀房主檔（手術動態房卡 + 後台 CRUD）──────────────────────────
// GET /api/Board/{unitCode}/room?includeAll= → 該單位 OR 刀房主檔（RoomId↔ApiRoom 對應）
export async function getOrRooms(unitCode, includeAll = false) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' })
  return handle(await fetch(`${BASE}/${unitCode}/room?${p}`))
}
export async function createOrRoom(data) {
  return handle(await fetch(`${BASE}/room`, { method: 'POST', headers, body: JSON.stringify(data) }))
}
export async function updateOrRoom(id, data) {
  return handle(await fetch(`${BASE}/room/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) }))
}
export async function removeOrRoom(id) {
  return handle(await fetch(`${BASE}/room/${id}`, { method: 'DELETE' }))
}
// ── 檢查/會診（自建；W52/ICU/ER）──────────────────────────────────
export async function getExamConsult(unitCode) { return handle(await fetch(`${BASE}/${unitCode}/exam`)) }
export async function getExamConsultList(unitCode, includeAll = true) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' })
  return handle(await fetch(`${BASE}/${unitCode}/examconsult?${p}`))
}
export async function createExamConsult(data) { return handle(await fetch(`${BASE}/examconsult`, { method: 'POST', headers, body: JSON.stringify(data) })) }
export async function updateExamConsult(id, data) { return handle(await fetch(`${BASE}/examconsult/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) })) }
export async function removeExamConsult(id) { return handle(await fetch(`${BASE}/examconsult/${id}`, { method: 'DELETE' })) }

// ── ICU 抗生素（自建；看板＋後台共用，以病歷號掛載）──────────────────
// GET /api/Board/{unitCode}/antibiotic?includeAll= → 抗生素列（看板用 includeAll=false 僅啟用）
export async function getAntibiotic(unitCode = 'ICU', includeAll = false) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' })
  return handle(await fetch(`${BASE}/${unitCode}/antibiotic?${p}`))
}
export async function createAntibiotic(data) { return handle(await fetch(`${BASE}/antibiotic`, { method: 'POST', headers, body: JSON.stringify(data) })) }
export async function updateAntibiotic(id, data) { return handle(await fetch(`${BASE}/antibiotic/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) })) }
export async function removeAntibiotic(id) { return handle(await fetch(`${BASE}/antibiotic/${id}`, { method: 'DELETE' })) }

// ══ 人員管理（自建；人員主檔＋多單位多角色＋排班＋床位指派＋查房＋交班）══
// 看板組裝（各站頁籤）
export async function getSchedule(unit, date) {
  const p = date ? `?date=${date}` : ''
  return handle(await fetch(`${BASE}/${unit}/schedule${p}`))
}
export async function getDoctorInfo(unit, date) {
  const p = date ? `?date=${date}` : ''
  return handle(await fetch(`${BASE}/${unit}/doctor${p}`))
}
export async function getHandover(unit, date, shift) {
  const p = new URLSearchParams(); if (date) p.set('date', date); if (shift) p.set('shift', shift)
  const qs = p.toString() ? `?${p}` : ''
  return handle(await fetch(`${BASE}/${unit}/handover${qs}`))
}
export async function getTeam(unit) { return handle(await fetch(`${BASE}/${unit}/team`)) }
// 員編登入（免密碼，回可管理單位）
export async function authStaff(empNo) { return handle(await fetch(`${BASE}/personnel/auth/${encodeURIComponent(empNo)}`)) }
// 人員主檔 CRUD
export async function getStaff(includeAll = true) {
  return handle(await fetch(`${BASE}/personnel?includeAll=${includeAll ? 'true' : 'false'}`))
}
export async function createStaff(d) { return handle(await fetch(`${BASE}/personnel`, { method: 'POST', headers, body: JSON.stringify(d) })) }
export async function updateStaff(id, d) { return handle(await fetch(`${BASE}/personnel/${id}`, { method: 'PUT', headers, body: JSON.stringify(d) })) }
export async function removeStaff(id) { return handle(await fetch(`${BASE}/personnel/${id}`, { method: 'DELETE' })) }
// 單位×角色 CRUD
export async function getUnitRoles(staffId, unit, includeAll = true) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' })
  if (staffId != null) p.set('staffId', staffId); if (unit) p.set('unit', unit)
  return handle(await fetch(`${BASE}/unitrole?${p}`))
}
export async function createUnitRole(d) { return handle(await fetch(`${BASE}/unitrole`, { method: 'POST', headers, body: JSON.stringify(d) })) }
export async function updateUnitRole(id, d) { return handle(await fetch(`${BASE}/unitrole/${id}`, { method: 'PUT', headers, body: JSON.stringify(d) })) }
export async function removeUnitRole(id) { return handle(await fetch(`${BASE}/unitrole/${id}`, { method: 'DELETE' })) }
// 排班 CRUD
export async function getScheduleList(unit, date, includeAll = true) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' }); if (date) p.set('date', date)
  return handle(await fetch(`${BASE}/${unit}/schedule-list?${p}`))
}
export async function createSchedule(d) { return handle(await fetch(`${BASE}/schedule`, { method: 'POST', headers, body: JSON.stringify(d) })) }
export async function updateSchedule(id, d) { return handle(await fetch(`${BASE}/schedule/${id}`, { method: 'PUT', headers, body: JSON.stringify(d) })) }
export async function removeSchedule(id) { return handle(await fetch(`${BASE}/schedule/${id}`, { method: 'DELETE' })) }
// 床位指派 CRUD
export async function getBedAssign(unit, date, type, includeAll = true) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' }); if (date) p.set('date', date); if (type) p.set('type', type)
  return handle(await fetch(`${BASE}/${unit}/bedassign?${p}`))
}
export async function createBedAssign(d) { return handle(await fetch(`${BASE}/bedassign`, { method: 'POST', headers, body: JSON.stringify(d) })) }
export async function updateBedAssign(id, d) { return handle(await fetch(`${BASE}/bedassign/${id}`, { method: 'PUT', headers, body: JSON.stringify(d) })) }
export async function removeBedAssign(id) { return handle(await fetch(`${BASE}/bedassign/${id}`, { method: 'DELETE' })) }
// 勾床配對：設定某護理師當日主護床位為恰好 bedIds（一床一主護）
export async function setBedNurse(unit, data) { return handle(await fetch(`${BASE}/${unit}/bed-nurse`, { method: 'POST', headers, body: JSON.stringify(data) })) }
// 查房表 CRUD
export async function getRoundList(unit, date, includeAll = true) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' }); if (date) p.set('date', date)
  return handle(await fetch(`${BASE}/${unit}/round-list?${p}`))
}
export async function createRound(d) { return handle(await fetch(`${BASE}/round`, { method: 'POST', headers, body: JSON.stringify(d) })) }
export async function updateRound(id, d) { return handle(await fetch(`${BASE}/round/${id}`, { method: 'PUT', headers, body: JSON.stringify(d) })) }
export async function removeRound(id) { return handle(await fetch(`${BASE}/round/${id}`, { method: 'DELETE' })) }
// 護理交班 header / 病人卡 / 事項 CRUD
export async function getHandoverShifts(unit, date, includeAll = true) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' }); if (date) p.set('date', date)
  return handle(await fetch(`${BASE}/${unit}/handover-shifts?${p}`))
}
export async function createHandoverShift(d) { return handle(await fetch(`${BASE}/handover-shift`, { method: 'POST', headers, body: JSON.stringify(d) })) }
export async function updateHandoverShift(id, d) { return handle(await fetch(`${BASE}/handover-shift/${id}`, { method: 'PUT', headers, body: JSON.stringify(d) })) }
export async function removeHandoverShift(id) { return handle(await fetch(`${BASE}/handover-shift/${id}`, { method: 'DELETE' })) }
export async function getHandoverPatients(shiftId) { return handle(await fetch(`${BASE}/handover-shift/${shiftId}/patients`)) }
export async function createHandoverPatient(d) { return handle(await fetch(`${BASE}/handover-patient`, { method: 'POST', headers, body: JSON.stringify(d) })) }
export async function updateHandoverPatient(id, d) { return handle(await fetch(`${BASE}/handover-patient/${id}`, { method: 'PUT', headers, body: JSON.stringify(d) })) }
export async function removeHandoverPatient(id) { return handle(await fetch(`${BASE}/handover-patient/${id}`, { method: 'DELETE' })) }
export async function getHandoverNotes(patientId) { return handle(await fetch(`${BASE}/handover-patient/${patientId}/notes`)) }
export async function createHandoverNote(d) { return handle(await fetch(`${BASE}/handover-note`, { method: 'POST', headers, body: JSON.stringify(d) })) }
export async function updateHandoverNote(id, d) { return handle(await fetch(`${BASE}/handover-note/${id}`, { method: 'PUT', headers, body: JSON.stringify(d) })) }
export async function removeHandoverNote(id) { return handle(await fetch(`${BASE}/handover-note/${id}`, { method: 'DELETE' })) }

// ── ER 三班醫護人員面板（自建；護理師掛人員管理）────────────────────
export async function getErShiftPanel(unit = 'ER') { return handle(await fetch(`${BASE}/${unit}/shiftpanel`)) }       // 看板（護理師已解析姓名）
export async function getErShiftPanelList(unit = 'ER') { return handle(await fetch(`${BASE}/${unit}/shiftpanel-list?includeAll=true`)) }  // 後台原始列
export async function updateErShiftPanel(id, d) { return handle(await fetch(`${BASE}/shiftpanel/${id}`, { method: 'PUT', headers, body: JSON.stringify(d) })) }

// ── 照護提醒（自建；W52）──────────────────────────────────────────
export async function getCareReminder(unit = 'W52', includeAll = false) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' })
  return handle(await fetch(`${BASE}/${unit}/care-reminder?${p}`))
}
export async function createCareReminder(d) { return handle(await fetch(`${BASE}/care-reminder`, { method: 'POST', headers, body: JSON.stringify(d) })) }
export async function updateCareReminder(id, d) { return handle(await fetch(`${BASE}/care-reminder/${id}`, { method: 'PUT', headers, body: JSON.stringify(d) })) }
export async function removeCareReminder(id) { return handle(await fetch(`${BASE}/care-reminder/${id}`, { method: 'DELETE' })) }

// ── 各站頁首單位資訊（主任/護理；自建可編輯）────────────────────────
export async function getUnitInfo(unitCode) { return handle(await fetch(`${BASE}/${unitCode}/info`)) }
export async function saveUnitInfo(data) { return handle(await fetch(`${BASE}/info`, { method: 'PUT', headers, body: JSON.stringify(data) })) }

// ── OR 手術派班 / 特殊交班（自建）──────────────────────────────────
// 看板：組裝三班 / 交班清單
export async function getOrSchedule() { return handle(await fetch(`${BASE}/or/schedule`)) }
export async function getOrHandover() { return handle(await fetch(`${BASE}/or/handover`)) }
export async function getOrSurgeries() { return handle(await fetch(`${BASE}/or/surgeries`)) }  // 全部 OR 手術清單（ICU/W52 手術資訊）
// 後台 CRUD：班級人員 OrShiftStaff
export async function getShiftStaff(unitCode = 'OR', includeAll = true) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' })
  return handle(await fetch(`${BASE}/${unitCode}/shiftstaff?${p}`))
}
export async function createShiftStaff(data) { return handle(await fetch(`${BASE}/shiftstaff`, { method: 'POST', headers, body: JSON.stringify(data) })) }
export async function updateShiftStaff(id, data) { return handle(await fetch(`${BASE}/shiftstaff/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) })) }
export async function removeShiftStaff(id) { return handle(await fetch(`${BASE}/shiftstaff/${id}`, { method: 'DELETE' })) }
// 後台 CRUD：房×班 刷手/流動 OrShiftRoom
export async function getShiftRoom(unitCode = 'OR', includeAll = true) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' })
  return handle(await fetch(`${BASE}/${unitCode}/shiftroom?${p}`))
}
export async function createShiftRoom(data) { return handle(await fetch(`${BASE}/shiftroom`, { method: 'POST', headers, body: JSON.stringify(data) })) }
export async function updateShiftRoom(id, data) { return handle(await fetch(`${BASE}/shiftroom/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) })) }
export async function removeShiftRoom(id) { return handle(await fetch(`${BASE}/shiftroom/${id}`, { method: 'DELETE' })) }
// 後台 CRUD：特殊交班 OrHandover
export async function getHandoverList(unitCode = 'OR', includeAll = true) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' })
  return handle(await fetch(`${BASE}/${unitCode}/handover-list?${p}`))
}
export async function createHandover(data) { return handle(await fetch(`${BASE}/handover`, { method: 'POST', headers, body: JSON.stringify(data) })) }
export async function updateHandover(id, data) { return handle(await fetch(`${BASE}/handover/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) })) }
export async function removeHandover(id) { return handle(await fetch(`${BASE}/handover/${id}`, { method: 'DELETE' })) }
export async function createExt(data) {
  return handle(await fetch(`${BASE}/ext`, { method: 'POST', headers, body: JSON.stringify(data) }))
}
export async function updateExt(id, data) {
  return handle(await fetch(`${BASE}/ext/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) }))
}
export async function removeExt(id) {
  return handle(await fetch(`${BASE}/ext/${id}`, { method: 'DELETE' }))
}
