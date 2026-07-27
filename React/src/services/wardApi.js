// wardApi.js — 病室動態 API 客戶端
// 角色：取各站病室動態看板（後端聚合 Board_bed 真實在床 ＋ 自建臨床補充層）；
//       另含臨床補充層(WardPatientExt)的後台 CRUD。後端端點前綴 /api/Board。
import { apiFetch } from './http'

const BASE = '/api/Board'
const headers = { 'Content-Type': 'application/json' }

async function handle(res) {
  if (res.status === 204) return null
  if (!res.ok) {
    const t = await res.text()
    let msg = t
    try { const j = JSON.parse(t); if (j && j.message) msg = j.message } catch { /* 非 JSON，用原文 */ }
    throw new Error(msg || `HTTP ${res.status}`)
  }
  return res.json()
}

// GET /api/Board/w52 → 病室動態看板（{ HospitalInfo, Version, Beds[] }，PascalCase 貼合 WardTab）
export async function getBoard(unitCode) {
  return handle(await apiFetch(`${BASE}/${unitCode.toLowerCase()}`))
}

// ── 臨床補充層 CRUD（後台用）──────────────────────────────────────
// GET /api/Board/{unitCode}/ext?includeAll= → 該單位臨床補充列
export async function getExt(unitCode, includeAll = true) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' })
  return handle(await apiFetch(`${BASE}/${unitCode}/ext?${p}`))
}
// GET /api/Board/{unitCode}/occupancy → 目前在床對照 [{hhisnum, bed}]（標示在床/已離床）
export async function getOccupancy(unitCode) {
  return handle(await apiFetch(`${BASE}/${unitCode}/occupancy`))
}
// GET /api/Board/{unitCode}/roster → 當前在床病人（真實姓名，後台臨床補充用；需登入）
export async function getRoster(unitCode) {
  return handle(await apiFetch(`${BASE}/${unitCode}/roster`))
}

// ── 各科值班醫師（ER 面板 + 後台 CRUD）──────────────────────────────
export async function getOnCall(unitCode, includeAll = false) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' })
  return handle(await apiFetch(`${BASE}/${unitCode}/oncall?${p}`))
}
export async function createOnCall(data) {
  return handle(await apiFetch(`${BASE}/oncall`, { method: 'POST', headers, body: JSON.stringify(data) }))
}
export async function updateOnCall(id, data) {
  return handle(await apiFetch(`${BASE}/oncall/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) }))
}
export async function removeOnCall(id) {
  return handle(await apiFetch(`${BASE}/oncall/${id}`, { method: 'DELETE' }))
}
// ── 各科值班醫師「每日輪值排程」（OnCallDept 科別設定 + OnCallRoster 每日輪值）──
export async function getOnCallDepts(includeAll = true) {
  return handle(await apiFetch(`${BASE}/oncall-dept?includeAll=${includeAll ? 'true' : 'false'}`))
}
export async function createOnCallDept(d) { return handle(await apiFetch(`${BASE}/oncall-dept`, { method: 'POST', headers, body: JSON.stringify(d) })) }
export async function updateOnCallDept(id, d) { return handle(await apiFetch(`${BASE}/oncall-dept/${id}`, { method: 'PUT', headers, body: JSON.stringify(d) })) }
export async function removeOnCallDept(id) { return handle(await apiFetch(`${BASE}/oncall-dept/${id}`, { method: 'DELETE' })) }
export async function getOnCallRoster(deptCode, from, to) {
  const p = new URLSearchParams(); if (deptCode) p.set('deptCode', deptCode); if (from) p.set('from', from); if (to) p.set('to', to)
  return handle(await apiFetch(`${BASE}/oncall-roster?${p}`))
}
export async function getOnCallDay(date) {
  const p = date ? `?date=${date}` : ''
  return handle(await apiFetch(`${BASE}/oncall-roster/day${p}`))
}
// 看板「各科值班醫師」面板：每科一位（內科依當下時間帶當前時段醫師）
export async function getOnCallBoard(date) {
  const p = date ? `?date=${date}` : ''
  return handle(await apiFetch(`${BASE}/oncall-board${p}`))
}
export async function saveOnCallMonth(body) {
  return handle(await apiFetch(`${BASE}/oncall-roster/month`, { method: 'POST', headers, body: JSON.stringify(body) }))
}
// ── 夜/假護理師值班表（NightNurseRoster；無科別、每日小夜/小夜貳組）──
export async function getNightNurse(from, to) {
  const p = new URLSearchParams(); if (from) p.set('from', from); if (to) p.set('to', to)
  return handle(await apiFetch(`${BASE}/night-nurse?${p}`))
}
export async function saveNightNurseMonth(body) {
  return handle(await apiFetch(`${BASE}/night-nurse/month`, { method: 'POST', headers, body: JSON.stringify(body) }))
}
// ── 護理行政值班表（AdminDutyRoster；無科別、每日大夜/白班/小夜）──
export async function getAdminDuty(from, to) {
  const p = new URLSearchParams(); if (from) p.set('from', from); if (to) p.set('to', to)
  return handle(await apiFetch(`${BASE}/admin-duty?${p}`))
}
export async function saveAdminDutyMonth(body) {
  return handle(await apiFetch(`${BASE}/admin-duty/month`, { method: 'POST', headers, body: JSON.stringify(body) }))
}
// ── 各單位「引用值班醫師」科別選取（UnitOnCallDept）──
// GET {unitCode}/oncall-display → 該單位選取的值班科別（含順序＋deptName）；供後台載入
export async function getUnitOnCallDepts(unitCode) {
  return handle(await apiFetch(`${BASE}/${unitCode}/oncall-display`))
}
// 覆寫某單位科別選取（entries:[{deptCode,sortOrder}]）
export async function saveUnitOnCallDepts(unitCode, entries) {
  return handle(await apiFetch(`${BASE}/${unitCode}/oncall-display/batch`, { method: 'POST', headers, body: JSON.stringify({ entries }) }))
}
// 前台：某單位所選科別當日值班醫師（依單位順序）→ [{deptCode,deptName,doctorName,ext,mobile}]
export async function getOnCallBoardForUnit(unitCode, date) {
  const p = date ? `?date=${date}` : ''
  return handle(await apiFetch(`${BASE}/${unitCode}/oncall-display/board${p}`))
}
// ── ER 床位主檔（病室動態平面圖 + 後台 CRUD）──────────────────────
// GET /api/Board/{unitCode}/bed?includeAll= → 該單位 ER 床位主檔（含座標/分區）
export async function getErBeds(unitCode, includeAll = false) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' })
  return handle(await apiFetch(`${BASE}/${unitCode}/bed?${p}`))
}
export async function createErBed(data) {
  return handle(await apiFetch(`${BASE}/bed`, { method: 'POST', headers, body: JSON.stringify(data) }))
}
export async function updateErBed(id, data) {
  return handle(await apiFetch(`${BASE}/bed/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) }))
}
export async function removeErBed(id) {
  return handle(await apiFetch(`${BASE}/bed/${id}`, { method: 'DELETE' }))
}
// ── OR 刀房主檔（手術動態房卡 + 後台 CRUD）──────────────────────────
// GET /api/Board/{unitCode}/room?includeAll= → 該單位 OR 刀房主檔（RoomId↔ApiRoom 對應）
export async function getOrRooms(unitCode, includeAll = false) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' })
  return handle(await apiFetch(`${BASE}/${unitCode}/room?${p}`))
}
export async function createOrRoom(data) {
  return handle(await apiFetch(`${BASE}/room`, { method: 'POST', headers, body: JSON.stringify(data) }))
}
export async function updateOrRoom(id, data) {
  return handle(await apiFetch(`${BASE}/room/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) }))
}
export async function removeOrRoom(id) {
  return handle(await apiFetch(`${BASE}/room/${id}`, { method: 'DELETE' }))
}
// ── 檢查/會診（自建；W52/ICU/ER）──────────────────────────────────
export async function getExamConsult(unitCode) { return handle(await apiFetch(`${BASE}/${unitCode}/exam`)) }
export async function getExamConsultList(unitCode, includeAll = true) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' })
  return handle(await apiFetch(`${BASE}/${unitCode}/examconsult?${p}`))
}
export async function createExamConsult(data) { return handle(await apiFetch(`${BASE}/examconsult`, { method: 'POST', headers, body: JSON.stringify(data) })) }
export async function updateExamConsult(id, data) { return handle(await apiFetch(`${BASE}/examconsult/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) })) }
export async function removeExamConsult(id) { return handle(await apiFetch(`${BASE}/examconsult/${id}`, { method: 'DELETE' })) }

// ── ICU 抗生素（自建；看板＋後台共用，以病歷號掛載）──────────────────
// GET /api/Board/{unitCode}/antibiotic?includeAll= → 抗生素列（看板用 includeAll=false 僅啟用）
export async function getAntibiotic(unitCode = 'ICU', includeAll = false) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' })
  return handle(await apiFetch(`${BASE}/${unitCode}/antibiotic?${p}`))
}
// GET /api/Board/{unitCode}/antibiotic/live → 院方 Board_bed 帶入的實際用藥（使用中；暫不過濾藥品種類）
export async function getAntibioticLive(unitCode = 'ICU') {
  return handle(await apiFetch(`${BASE}/${unitCode}/antibiotic/live`))
}
export async function createAntibiotic(data) { return handle(await apiFetch(`${BASE}/antibiotic`, { method: 'POST', headers, body: JSON.stringify(data) })) }
export async function updateAntibiotic(id, data) { return handle(await apiFetch(`${BASE}/antibiotic/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) })) }
export async function removeAntibiotic(id) { return handle(await apiFetch(`${BASE}/antibiotic/${id}`, { method: 'DELETE' })) }

// ══ 人員管理（自建；人員主檔＋多單位多角色＋排班＋床位指派＋查房＋交班）══
// 看板組裝（各站頁籤）
export async function getSchedule(unit, date) {
  const p = date ? `?date=${date}` : ''
  return handle(await apiFetch(`${BASE}/${unit}/schedule${p}`))
}
export async function getDoctorInfo(unit, date) {
  const p = date ? `?date=${date}` : ''
  return handle(await apiFetch(`${BASE}/${unit}/doctor${p}`))
}
export async function getHandover(unit, date, shift) {
  const p = new URLSearchParams(); if (date) p.set('date', date); if (shift) p.set('shift', shift)
  const qs = p.toString() ? `?${p}` : ''
  return handle(await apiFetch(`${BASE}/${unit}/handover${qs}`))
}
export async function getTeam(unit) { return handle(await apiFetch(`${BASE}/${unit}/team`)) }
// 驗證目前 token 並回最新身分（AuthContext 啟動時呼叫；401 由 apiFetch 觸發登出）
export async function me() { return handle(await apiFetch(`${BASE}/personnel/me`)) }
// 登入：員編＋密碼（LDAP 驗證；過渡期 LDAP 未啟用時密碼可空）。回 token＋身分＋可管理單位；失敗丟出 message。
export async function login(employeeNo, password) {
  const res = await apiFetch(`${BASE}/personnel/login`, { method: 'POST', headers, body: JSON.stringify({ employeeNo, password }) })
  if (res.ok) return res.json()
  let msg = '登入失敗'
  try { const j = await res.json(); msg = j.message || msg } catch { /* 非 JSON 忽略 */ }
  throw new Error(msg)
}
// 登出：寫登出稽核（失敗不影響前端登出）
export async function logout(employeeNo) {
  try { await apiFetch(`${BASE}/personnel/logout`, { method: 'POST', headers, body: JSON.stringify({ employeeNo }) }) } catch { /* ignore */ }
}
// 人員主檔 CRUD
export async function getStaff(includeAll = true) {
  return handle(await apiFetch(`${BASE}/personnel?includeAll=${includeAll ? 'true' : 'false'}`))
}
export async function createStaff(d) { return handle(await apiFetch(`${BASE}/personnel`, { method: 'POST', headers, body: JSON.stringify(d) })) }
export async function updateStaff(id, d) { return handle(await apiFetch(`${BASE}/personnel/${id}`, { method: 'PUT', headers, body: JSON.stringify(d) })) }
export async function removeStaff(id) { return handle(await apiFetch(`${BASE}/personnel/${id}`, { method: 'DELETE' })) }
// ── AD 帳號 / 密碼（連動 AD LDS）──
// 管理員：建/補建該員 AD 帳號（password 省略＝Kmsh@員編）
export async function createAdAccount(id, password) { return handle(await apiFetch(`${BASE}/personnel/${id}/ad-account`, { method: 'POST', headers, body: JSON.stringify({ password: password || null }) })) }
// 管理員：重設某員密碼
export async function resetPassword(id, newPassword) { return handle(await apiFetch(`${BASE}/personnel/${id}/reset-password`, { method: 'POST', headers, body: JSON.stringify({ newPassword }) })) }
// 使用者自助改密（員編取自 token）
export async function changePassword(oldPassword, newPassword) { return handle(await apiFetch(`${BASE}/personnel/change-password`, { method: 'POST', headers, body: JSON.stringify({ oldPassword, newPassword }) })) }
// 單位×角色 CRUD
export async function getUnitRoles(staffId, unit, includeAll = true) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' })
  if (staffId != null) p.set('staffId', staffId); if (unit) p.set('unit', unit)
  return handle(await apiFetch(`${BASE}/unitrole?${p}`))
}
export async function createUnitRole(d) { return handle(await apiFetch(`${BASE}/unitrole`, { method: 'POST', headers, body: JSON.stringify(d) })) }
export async function updateUnitRole(id, d) { return handle(await apiFetch(`${BASE}/unitrole/${id}`, { method: 'PUT', headers, body: JSON.stringify(d) })) }
export async function removeUnitRole(id) { return handle(await apiFetch(`${BASE}/unitrole/${id}`, { method: 'DELETE' })) }
// 排班 CRUD
export async function getScheduleList(unit, date, includeAll = true) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' }); if (date) p.set('date', date)
  return handle(await apiFetch(`${BASE}/${unit}/schedule-list?${p}`))
}
export async function createSchedule(d) { return handle(await apiFetch(`${BASE}/schedule`, { method: 'POST', headers, body: JSON.stringify(d) })) }
export async function updateSchedule(id, d) { return handle(await apiFetch(`${BASE}/schedule/${id}`, { method: 'PUT', headers, body: JSON.stringify(d) })) }
export async function removeSchedule(id) { return handle(await apiFetch(`${BASE}/schedule/${id}`, { method: 'DELETE' })) }
// 值班表三班護理師批次排班：{ from, to, shifts:[{shift, staffIds:[有序]}] } 疊加到區間每日
export async function setShiftRoster(unit, body) { return handle(await apiFetch(`${BASE}/${unit}/shift-roster`, { method: 'POST', headers, body: JSON.stringify(body) })) }
// 床位指派 CRUD
export async function getBedAssign(unit, date, type, includeAll = true) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' }); if (date) p.set('date', date); if (type) p.set('type', type)
  return handle(await apiFetch(`${BASE}/${unit}/bedassign?${p}`))
}
export async function createBedAssign(d) { return handle(await apiFetch(`${BASE}/bedassign`, { method: 'POST', headers, body: JSON.stringify(d) })) }
export async function updateBedAssign(id, d) { return handle(await apiFetch(`${BASE}/bedassign/${id}`, { method: 'PUT', headers, body: JSON.stringify(d) })) }
export async function removeBedAssign(id) { return handle(await apiFetch(`${BASE}/bedassign/${id}`, { method: 'DELETE' })) }
// 勾床配對：設定某護理師當日主護床位為恰好 bedIds（一床一主護）
export async function setBedNurse(unit, data) { return handle(await apiFetch(`${BASE}/${unit}/bed-nurse`, { method: 'POST', headers, body: JSON.stringify(data) })) }
// 查房表 CRUD
export async function getRoundList(unit, date, includeAll = true) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' }); if (date) p.set('date', date)
  return handle(await apiFetch(`${BASE}/${unit}/round-list?${p}`))
}
export async function createRound(d) { return handle(await apiFetch(`${BASE}/round`, { method: 'POST', headers, body: JSON.stringify(d) })) }
export async function updateRound(id, d) { return handle(await apiFetch(`${BASE}/round/${id}`, { method: 'PUT', headers, body: JSON.stringify(d) })) }
export async function removeRound(id) { return handle(await apiFetch(`${BASE}/round/${id}`, { method: 'DELETE' })) }
// 護理交班 header / 病人卡 / 事項 CRUD
export async function getHandoverShifts(unit, date, includeAll = true) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' }); if (date) p.set('date', date)
  return handle(await apiFetch(`${BASE}/${unit}/handover-shifts?${p}`))
}
export async function createHandoverShift(d) { return handle(await apiFetch(`${BASE}/handover-shift`, { method: 'POST', headers, body: JSON.stringify(d) })) }
export async function updateHandoverShift(id, d) { return handle(await apiFetch(`${BASE}/handover-shift/${id}`, { method: 'PUT', headers, body: JSON.stringify(d) })) }
export async function removeHandoverShift(id) { return handle(await apiFetch(`${BASE}/handover-shift/${id}`, { method: 'DELETE' })) }
export async function getHandoverPatients(shiftId) { return handle(await apiFetch(`${BASE}/handover-shift/${shiftId}/patients`)) }
export async function createHandoverPatient(d) { return handle(await apiFetch(`${BASE}/handover-patient`, { method: 'POST', headers, body: JSON.stringify(d) })) }
export async function updateHandoverPatient(id, d) { return handle(await apiFetch(`${BASE}/handover-patient/${id}`, { method: 'PUT', headers, body: JSON.stringify(d) })) }
export async function removeHandoverPatient(id) { return handle(await apiFetch(`${BASE}/handover-patient/${id}`, { method: 'DELETE' })) }
export async function getHandoverNotes(patientId) { return handle(await apiFetch(`${BASE}/handover-patient/${patientId}/notes`)) }
export async function createHandoverNote(d) { return handle(await apiFetch(`${BASE}/handover-note`, { method: 'POST', headers, body: JSON.stringify(d) })) }
export async function updateHandoverNote(id, d) { return handle(await apiFetch(`${BASE}/handover-note/${id}`, { method: 'PUT', headers, body: JSON.stringify(d) })) }
export async function removeHandoverNote(id) { return handle(await apiFetch(`${BASE}/handover-note/${id}`, { method: 'DELETE' })) }

// ── ER 三班醫護人員面板（自建；護理師掛人員管理）────────────────────
export async function getErShiftPanel(unit = 'ER') { return handle(await apiFetch(`${BASE}/${unit}/shiftpanel`)) }       // 看板（護理師已解析姓名）
export async function getErShiftPanelList(unit = 'ER') { return handle(await apiFetch(`${BASE}/${unit}/shiftpanel-list?includeAll=true`)) }  // 後台原始列
export async function updateErShiftPanel(id, d) { return handle(await apiFetch(`${BASE}/shiftpanel/${id}`, { method: 'PUT', headers, body: JSON.stringify(d) })) }

// ── 照護提醒（自建；W52）──────────────────────────────────────────
export async function getCareReminder(unit = 'W52', includeAll = false) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' })
  return handle(await apiFetch(`${BASE}/${unit}/care-reminder?${p}`))
}
export async function createCareReminder(d) { return handle(await apiFetch(`${BASE}/care-reminder`, { method: 'POST', headers, body: JSON.stringify(d) })) }
export async function updateCareReminder(id, d) { return handle(await apiFetch(`${BASE}/care-reminder/${id}`, { method: 'PUT', headers, body: JSON.stringify(d) })) }
export async function removeCareReminder(id) { return handle(await apiFetch(`${BASE}/care-reminder/${id}`, { method: 'DELETE' })) }

// ── 各站頁首單位資訊（主任/護理；自建可編輯）────────────────────────
export async function getUnitInfo(unitCode) { return handle(await apiFetch(`${BASE}/${unitCode}/info`)) }
export async function saveUnitInfo(data) { return handle(await apiFetch(`${BASE}/info`, { method: 'PUT', headers, body: JSON.stringify(data) })) }

// ── OR 手術派班 / 特殊交班（自建）──────────────────────────────────
// 看板：組裝三班 / 交班清單
export async function getOrSchedule() { return handle(await apiFetch(`${BASE}/or/schedule`)) }
export async function getOrHandover() { return handle(await apiFetch(`${BASE}/or/handover`)) }
export async function getOrSurgeries() { return handle(await apiFetch(`${BASE}/or/surgeries`)) }  // 全部 OR 手術清單（ICU 手術資訊）
// 該單位在床病人手術（依在床病歷號過濾）。from/to 可選(yyyy-MM-dd)；省略→當日。W52 當日、ICU 帶今天±3。
export async function getUnitSurgeries(unitCode, from, to) {
  const p = new URLSearchParams()
  if (from) p.set('from', from)
  if (to) p.set('to', to)
  const qs = p.toString()
  return handle(await apiFetch(`${BASE}/${unitCode}/surgeries${qs ? '?' + qs : ''}`))
}

// ── 全院共用主檔：科別 Department ──────────────────────────────────
export async function getDepartments(includeAll = true) {
  return handle(await apiFetch(`${BASE}/department?includeAll=${includeAll ? 'true' : 'false'}`))
}
export async function createDepartment(data) { return handle(await apiFetch(`${BASE}/department`, { method: 'POST', headers, body: JSON.stringify(data) })) }
export async function updateDepartment(id, data) { return handle(await apiFetch(`${BASE}/department/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) })) }
export async function removeDepartment(id) { return handle(await apiFetch(`${BASE}/department/${id}`, { method: 'DELETE' })) }

// ── 全院共用主檔：醫師 Doctor（deptCode 可篩選）──────────────────────
export async function getDoctors(deptCode = null, includeAll = true) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' })
  if (deptCode) p.set('deptCode', deptCode)
  return handle(await apiFetch(`${BASE}/doctor?${p}`))
}
export async function createDoctor(data) { return handle(await apiFetch(`${BASE}/doctor`, { method: 'POST', headers, body: JSON.stringify(data) })) }
export async function updateDoctor(id, data) { return handle(await apiFetch(`${BASE}/doctor/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) })) }
export async function removeDoctor(id) { return handle(await apiFetch(`${BASE}/doctor/${id}`, { method: 'DELETE' })) }
// 照服員主檔（全院共用；姓名＋單一聯絡方式）
export async function getCareAides(includeAll = true) { return handle(await apiFetch(`${BASE}/care-aide?includeAll=${includeAll ? 'true' : 'false'}`)) }
export async function createCareAide(data) { return handle(await apiFetch(`${BASE}/care-aide`, { method: 'POST', headers, body: JSON.stringify(data) })) }
export async function updateCareAide(id, data) { return handle(await apiFetch(`${BASE}/care-aide/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) })) }
export async function removeCareAide(id) { return handle(await apiFetch(`${BASE}/care-aide/${id}`, { method: 'DELETE' })) }
// ER 急診醫師主檔（供 ER 緊急編組納入醫師）
export async function getErDoctors(includeAll = true) { return handle(await apiFetch(`${BASE}/er-doctor?includeAll=${includeAll ? 'true' : 'false'}`)) }
export async function createErDoctor(data) { return handle(await apiFetch(`${BASE}/er-doctor`, { method: 'POST', headers, body: JSON.stringify(data) })) }
export async function updateErDoctor(id, data) { return handle(await apiFetch(`${BASE}/er-doctor/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) })) }
export async function removeErDoctor(id) { return handle(await apiFetch(`${BASE}/er-doctor/${id}`, { method: 'DELETE' })) }
// ER 急診醫師 每日緊急編組／點班
export async function getErDoctorGroups(date) { return handle(await apiFetch(`${BASE}/er-doctor-group?date=${encodeURIComponent(date)}`)) }
export async function saveErDoctorGroups(data) { return handle(await apiFetch(`${BASE}/er-doctor-group`, { method: 'POST', headers, body: JSON.stringify(data) })) }
// 各單位「顯示照服員」選取（UnitCareAide）
// GET {unitCode}/aide-display → 該單位選取的照服員（含順序＋姓名／聯絡方式）；供後台載入與前台顯示
export async function getUnitCareAides(unitCode) { return handle(await apiFetch(`${BASE}/${unitCode}/aide-display`)) }
// 覆寫某單位照服員選取（entries:[{aideId,sortOrder}]）
export async function saveUnitCareAides(unitCode, entries) {
  return handle(await apiFetch(`${BASE}/${unitCode}/aide-display/batch`, { method: 'POST', headers, body: JSON.stringify({ entries }) }))
}
// GET /api/Board/or/surgerylist?from=&to=（皆含 yyyy-MM-dd；省略→本月）→ { from,to,stats,rows[] }（本地 OrSurgery，快）
export async function getOrSurgeryList(from, to) {
  const p = new URLSearchParams()
  if (from) p.set('from', from)
  if (to) p.set('to', to)
  return handle(await apiFetch(`${BASE}/or/surgerylist?${p}`))
}
// 匯出 xlsx（含完整姓名，需登入）→ 回原始 Response（呼叫端自行 .blob()/看 status；帶 localStorage token）
export async function exportOrSurgeryList(from, to) {
  const p = new URLSearchParams()
  if (from) p.set('from', from)
  if (to) p.set('to', to)
  return apiFetch(`${BASE}/or/surgerylist/export?${p}`)
}
// 逐台刀 刷手/流動/備註 批次存檔（後台月曆）
export async function saveOrSurgeryNurseBatch(entries) {
  return handle(await apiFetch(`${BASE}/or/surgery-nurse/batch`, { method: 'POST', headers, body: JSON.stringify({ entries }) }))
}
// GET /api/Board/or/temphumidity?date=（省略→今日）→ 該日各刀房溫溼度 [{ opDate, roomId, temperature, humidity }]
export async function getOrRoomEnv(date) {
  const p = new URLSearchParams()
  if (date) p.set('date', date)
  return handle(await apiFetch(`${BASE}/or/temphumidity?${p}`))
}
// OR 刀房溫溼度 批次存檔（後台；兩欄皆空＝清除該刀房）
export async function saveOrRoomEnvBatch(entries) {
  return handle(await apiFetch(`${BASE}/or/temphumidity/batch`, { method: 'POST', headers, body: JSON.stringify({ entries }) }))
}
// 後台 CRUD：班級人員 OrShiftStaff
export async function getShiftStaff(unitCode = 'OR', includeAll = true) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' })
  return handle(await apiFetch(`${BASE}/${unitCode}/shiftstaff?${p}`))
}
export async function createShiftStaff(data) { return handle(await apiFetch(`${BASE}/shiftstaff`, { method: 'POST', headers, body: JSON.stringify(data) })) }
export async function updateShiftStaff(id, data) { return handle(await apiFetch(`${BASE}/shiftstaff/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) })) }
export async function removeShiftStaff(id) { return handle(await apiFetch(`${BASE}/shiftstaff/${id}`, { method: 'DELETE' })) }
// 後台 CRUD：房×班 刷手/流動 OrShiftRoom
export async function getShiftRoom(unitCode = 'OR', includeAll = true) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' })
  return handle(await apiFetch(`${BASE}/${unitCode}/shiftroom?${p}`))
}
export async function createShiftRoom(data) { return handle(await apiFetch(`${BASE}/shiftroom`, { method: 'POST', headers, body: JSON.stringify(data) })) }
export async function updateShiftRoom(id, data) { return handle(await apiFetch(`${BASE}/shiftroom/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) })) }
export async function removeShiftRoom(id) { return handle(await apiFetch(`${BASE}/shiftroom/${id}`, { method: 'DELETE' })) }
// 後台 CRUD：特殊交班 OrHandover
export async function getHandoverList(unitCode = 'OR', includeAll = true) {
  const p = new URLSearchParams({ includeAll: includeAll ? 'true' : 'false' })
  return handle(await apiFetch(`${BASE}/${unitCode}/handover-list?${p}`))
}
export async function createHandover(data) { return handle(await apiFetch(`${BASE}/handover`, { method: 'POST', headers, body: JSON.stringify(data) })) }
export async function updateHandover(id, data) { return handle(await apiFetch(`${BASE}/handover/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) })) }
export async function removeHandover(id) { return handle(await apiFetch(`${BASE}/handover/${id}`, { method: 'DELETE' })) }
export async function createExt(data) {
  return handle(await apiFetch(`${BASE}/ext`, { method: 'POST', headers, body: JSON.stringify(data) }))
}
export async function updateExt(id, data) {
  return handle(await apiFetch(`${BASE}/ext/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) }))
}
export async function removeExt(id) {
  return handle(await apiFetch(`${BASE}/ext/${id}`, { method: 'DELETE' }))
}
