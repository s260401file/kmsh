// WardTab：OR 手術室站「刀房狀態地圖」分頁
// 以卡片地圖呈現 7 間刀房（OR-01～03、OR-05～08，已移除 OR-04）的今日手術狀態，
// 每張卡片顯示今日「進行中/首台」手術＋「今日 N 台」，點卡片開啟 Modal 看今日全部台次。
// 資料來源：後端 /api/Board/or（自建刀房主檔 ＋ Board_OR 今日排程 ＋ overlay；免 F5 輪詢）。
import { useState, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useOrWard } from '../../../../hooks/useOrWard'
import { useOrRoomEnv } from '../../../../hooks/useOrRoomEnv'   // 今日各刀房溫溼度
import BoardLoading from '../../../../components/BoardLoading'   // 院方資料載入中動畫

// 依手術來源回傳對應的 CSS class（急診/門診/住院刀）
function sourceClass(source) {
  if (source === '急診刀') return 'src-er'
  if (source === '門診刀') return 'src-op'
  if (source === '住院刀') return 'src-inp'
  return ''
}

// 判斷某刀房在目前篩選條件下是否應「亮起」（空房與 all 一律顯示）
function isRoomVisible(room, filter) {
  if (filter === 'all' || room.Status === 'empty') return true
  const p = room.Patient
  switch (filter) {
    case 'er':   return p?.SurgerySource === '急診刀'
    case 'op':   return p?.SurgerySource === '門診刀'
    case 'inp':  return p?.SurgerySource === '住院刀'
    case 'busy': return room.Status === 'in-surgery'
    case 'prep': return room.Status === 'scheduled'
    case 'done': return room.Status === 'completed'
    default:     return false
  }
}

// 計算手術時長：有結束時間取區間，無結束時間以現在時刻推算「進行中」
function calcDuration(startTime, endTime) {
  if (!startTime) return '—'
  const [sh, sm] = startTime.split(':').map(Number)
  const startMins = sh * 60 + sm
  if (endTime) {
    const [eh, em] = endTime.split(':').map(Number)
    const dur = (eh * 60 + em) - startMins
    return `${Math.floor(dur / 60)}h ${dur % 60}m`
  }
  const now = new Date()
  const elapsed = now.getHours() * 60 + now.getMinutes() - startMins
  return elapsed > 0 ? `${Math.floor(elapsed / 60)}h ${elapsed % 60}m（進行中）` : '—'
}

// 單一刀房卡片：空房顯示房號與「空房」；有手術則顯示來源/狀態/今日台數/病患/術式/主刀
function RoomCard({ room, filteredOut, onClick }) {
  if (room.Status === 'empty') {
    return (
      <div className="or-card empty">
        <div className="empty-room-num">{room.RoomId}</div>
        <div className="empty-label">空房</div>
      </div>
    )
  }
  const p = room.Patient
  const status = p.SurgeryStatus || '排程'
  return (
    <div
      className={`or-card ${room.Status} ${sourceClass(p.SurgerySource)}${filteredOut ? ' filtered-out' : ''}`}
      onClick={onClick}
    >
      <div className="card-row1">
        <span className="room-num">{room.RoomId}</span>
        {p.SurgerySource && <span className={`badge badge-${p.SurgerySource}`}>{p.SurgerySource}</span>}
        <span className={`badge badge-${status}`}>{status}</span>
        {room.TodayCount > 1 && <span className="badge badge-count">今日 {room.TodayCount} 台</span>}
      </div>
      <div className="card-row2">
        <span className={`patient-name ${p.Gender === 'M' ? 'gender-m' : 'gender-f'}`}>{p.PatientName}</span>
        <span className="patient-basic">{p.Gender}/{p.Age ?? '—'}　{p.ScheduledTime || ''}</span>
      </div>
      <div className="card-row3">{p.SurgeryName}</div>
      <div className="card-row4">術：{p.Doctor || '—'}{p.AnesType ? `　麻：${p.AnesType}` : ''}</div>
    </div>
  )
}

// 第 8 格：今日各刀房溫溼度摘要卡（後台「溫溼度記錄」填入；隨看板輪詢更新，缺值顯示「—」）
function EnvCard({ rooms, envByRoom, date }) {
  const fmt = v => (v == null ? '—' : String(v))
  return (
    <div className="or-env-card">
      <div className="or-env-title">溫溼度<span className="or-env-date">{date}</span></div>
      <div className="or-env-body">
        {rooms.map(r => {
          const e = envByRoom[r.RoomId]
          return (
            <div key={r.RoomId} className="or-env-row">
              <span className="or-env-room">{r.RoomId}</span>
              <span className="or-env-val">{fmt(e?.temperature)}<i>°C</i></span>
              <span className="or-env-val">{fmt(e?.humidity)}<i>%</i></span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// 點擊刀房卡片後彈出的病患詳情視窗（今日台次清單可切換；顯示診斷、術式、派班、麻醉、時間、備註）
function RoomModal({ room, onClose }) {
  const list = room.Surgeries?.length ? room.Surgeries : (room.Patient ? [room.Patient] : [])
  // 預設停在「房卡目前顯示的那一台」(room.Patient，後端已依手術中/保留期選定)，與卡片一致；
  // 找不到時再退回：手術中 → 第一台。以病歷號＋排程時間比對（房間內唯一）。
  const cur = room.Patient
  const curIdx = cur ? list.findIndex(s => s.MedRecord === cur.MedRecord && s.ScheduledTime === cur.ScheduledTime) : -1
  const initIdx = curIdx >= 0 ? curIdx : Math.max(0, list.findIndex(s => s.SurgeryStatus === '手術中'))
  const [idx, setIdx] = useState(initIdx)
  const p = list[idx] || room.Patient
  const status = p.SurgeryStatus || '排程'
  const duration = calcDuration(p.StartTime, p.EndTime)
  return (
    <div className="modal-overlay show" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
            <span className="modal-room-id">{room.RoomId}</span>
            <span className="modal-patient">{p.PatientName}</span>
            <span className="modal-basic">{p.Gender === 'M' ? '男' : '女'} / {p.Age ?? '—'}歲</span>
            <div className="modal-badges">
              {p.SurgerySource && <span className={`badge badge-${p.SurgerySource}`}>{p.SurgerySource}</span>}
              <span className={`badge badge-${status}`}>{status}</span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* 今日台次清單（多台時可切換） */}
        {list.length > 1 && (
          <div className="or-today-list">
            <span className="or-today-label">今日 {list.length} 台：</span>
            {list.map((s, i) => (
              <button key={i} className={`or-today-item${i === idx ? ' active' : ''}`} onClick={() => setIdx(i)}>
                {s.ScheduledTime || '—'} {s.PatientName}
              </button>
            ))}
          </div>
        )}

        <div className="modal-body">
          <div className="modal-row"><div className="modal-field full"><div className="field-label">診斷</div><div className="field-value diagnosis">{p.Diagnosis || '—'}</div></div></div>
          <div className="modal-row"><div className="modal-field full"><div className="field-label">術式</div><div className="field-value">{p.SurgeryName || '—'}</div></div></div>
          <div className="modal-row">
            <div className="modal-field"><div className="field-label">病歷號</div><div className="field-value">{p.MedRecord || '—'}</div></div>
            <div className="modal-field"><div className="field-label">生日</div><div className="field-value">{p.BirthDate || '—'}</div></div>
            <div className="modal-field"><div className="field-label">科別</div><div className="field-value">{p.Department || '—'}</div></div>
          </div>
          <div className="modal-row">
            <div className="modal-field"><div className="field-label">手術醫師</div><div className="field-value">{p.Doctor || '—'}</div></div>
            <div className="modal-field"><div className="field-label">刷手護理師</div><div className="field-value">{p.ScrubNurse || '—'}</div></div>
            <div className="modal-field"><div className="field-label">流動護理師</div><div className="field-value">{p.CircNurse || '—'}</div></div>
          </div>
          <div className="modal-row">
            <div className="modal-field"><div className="field-label">麻醉方式</div><div className="field-value">{p.AnesType || '—'}</div></div>
            <div className="modal-field"><div className="field-label">手術來源</div><div className="field-value">{p.SurgerySource || '—'}</div></div>
            <div className="modal-field"><div className="field-label">手術狀態</div><div className="field-value">{status}</div></div>
          </div>
          <div className="modal-row">
            <div className="modal-field"><div className="field-label">排程時間</div><div className="field-value">{p.ScheduledTime || '—'}</div></div>
            <div className="modal-field"><div className="field-label">開始時間</div><div className="field-value">{(status === '手術中' || status === '已完成') ? (p.StartTime || '—') : '—'}</div></div>
            <div className="modal-field"><div className="field-label">結束時間</div><div className="field-value">{p.EndTime || (status === '手術中' ? '進行中' : '—')}</div></div>
            <div className="modal-field"><div className="field-label">手術時長</div><div className="field-value">{duration}</div></div>
          </div>
          <div className="modal-row"><div className="modal-field full"><div className="field-label">備註</div><div className="field-value" style={{ fontSize: '15px', fontWeight: '400' }}>{p.Notes || '無'}</div></div></div>
        </div>
        <div className="modal-footer"><button className="btn-close-modal" onClick={onClose}>關閉</button></div>
      </div>
    </div>
  )
}

export default function WardTab() {
  const { ensureUnlocked } = useOutletContext() || {}   // OR 檢視密碼門檻（點卡詳情需驗證，與頁籤共用解鎖）
  const openRoom = room => (ensureUnlocked ? ensureUnlocked(() => setSelectedRoom(room)) : setSelectedRoom(room))
  const [filter, setFilter] = useState('all')          // 目前篩選條件（all/er/op/inp/busy/prep）
  const [selectedRoom, setSelectedRoom] = useState(null) // 目前開啟詳情的刀房
  const [showCompleted, setShowCompleted] = useState(false) // 今日已完成清單 Modal
  const { rooms, count, loading } = useOrWard('OR')     // 後端聚合看板（當日快照＋overlay）
  const { env } = useOrRoomEnv()                        // 今日各刀房溫溼度（第 8 格）
  const envByRoom = useMemo(() => Object.fromEntries((env || []).map(e => [e.roomId, e])), [env])
  const envDate = useMemo(() => { const d = new Date(); return `${d.getMonth() + 1}/${d.getDate()}` }, [])
  // 開著的刀房詳情彈窗：每次輪詢後用 RoomId 從最新 rooms 重新取回，內容跟著自動更新（約20秒）
  const liveSelectedRoom = selectedRoom ? rooms.find(r => r.RoomId === selectedRoom.RoomId) : null
  // 統計改以「刀數」計（由各房今日手術聯集；今日總刀＝後端穩定 count）
  const allSurgeries = useMemo(() => rooms.flatMap(r => r.Surgeries || []), [rooms])
  const completedList = useMemo(
    () => rooms.flatMap(r => (r.Surgeries || []).filter(s => s.SurgeryStatus === '已完成').map(s => ({ ...s, roomId: r.RoomId }))),
    [rooms])
  const stats = useMemo(() => ({
    roomTotal:  rooms.length,
    inSurgery:  allSurgeries.filter(s => s.SurgeryStatus === '手術中').length,
    prep:       allSurgeries.filter(s => s.SurgeryStatus === '準備中' || s.SurgeryStatus === '排程').length,
    completed:  allSurgeries.filter(s => s.SurgeryStatus === '已完成').length,
    erKnife:    allSurgeries.filter(s => s.SurgerySource === '急診刀').length,
    opKnife:    allSurgeries.filter(s => s.SurgerySource === '門診刀').length,
    inpKnife:   allSurgeries.filter(s => s.SurgerySource === '住院刀').length,
    empty:      rooms.filter(r => !r.Patient).length,
  }), [rooms, allSurgeries])
  // 點同一篩選鈕再點一次即取消（回到 all）；all 本身不切換
  const handleFilter = f => setFilter(prev => (prev === f && f !== 'all') ? 'all' : f)

  if (loading) return <main className="main-content"><BoardLoading /></main>   // 院方資料載入中

  return (
    <>
      <main className="main-content">
        <div className="or-panel">
          <div className="ward-title">▌ 手術室　共 7 間（OR-01～03、OR-05～08）　今日 {count} 台</div>
          <div className="or-grid">
            {rooms.map(room => (
              <RoomCard
                key={room.RoomId}
                room={room}
                filteredOut={!isRoomVisible(room, filter)}
                onClick={room.Status !== 'empty' ? () => openRoom(room) : undefined}
              />
            ))}
            <EnvCard rooms={rooms} envByRoom={envByRoom} date={envDate} />
          </div>
        </div>

        <div className="stats-panel">
          <div className="stats-title">▌ 手術統計</div>
          <div className="stats-body">
            <div className="ws-row">
              <div className="ws-item"><div className="ws-value">{count}</div><div className="ws-label">今日總刀</div></div>
              <div className={`ws-item${filter === 'busy' ? ' active' : ''}`} data-filter="busy" onClick={() => handleFilter('busy')}><div className="ws-value ws-busy">{stats.inSurgery}</div><div className="ws-label">手術中</div></div>
            </div>
            <div className="ws-row">
              <div className={`ws-item${filter === 'er' ? ' active' : ''}`} data-filter="er" onClick={() => handleFilter('er')}><div className="ws-value ws-erknife">{stats.erKnife}</div><div className="ws-label">急診刀</div></div>
              <div className={`ws-item${filter === 'op' ? ' active' : ''}`} data-filter="op" onClick={() => handleFilter('op')}><div className="ws-value ws-opknife">{stats.opKnife}</div><div className="ws-label">門診刀</div></div>
              <div className={`ws-item${filter === 'inp' ? ' active' : ''}`} data-filter="inp" onClick={() => handleFilter('inp')}><div className="ws-value ws-inpknife">{stats.inpKnife}</div><div className="ws-label">住院刀</div></div>
            </div>
            <div className="ws-row">
              <div className={`ws-item${filter === 'prep' ? ' active' : ''}`} data-filter="prep" onClick={() => handleFilter('prep')}><div className="ws-value ws-prep">{stats.prep}</div><div className="ws-label">排程</div></div>
              <div className="ws-item" style={{ cursor: 'pointer' }} onClick={() => setShowCompleted(true)}><div className="ws-value ws-done">{stats.completed}</div><div className="ws-label">已完成 ▸</div></div>
              <div className="ws-item"><div className="ws-value ws-empty">{stats.empty}</div><div className="ws-label">空房</div></div>
            </div>
          </div>
        </div>
      </main>

      <div className="filter-bar">
        <span className="filter-label">來源 / 狀態：</span>
        <button className={`filter-btn${filter === 'all' ? ' active' : ''}`} onClick={() => handleFilter('all')}>全部</button>
        <button className={`badge badge-filter badge-er${filter === 'er' ? ' active' : ''}`} onClick={() => handleFilter('er')}>急診刀</button>
        <button className={`badge badge-filter badge-op${filter === 'op' ? ' active' : ''}`} onClick={() => handleFilter('op')}>門診刀</button>
        <button className={`badge badge-filter badge-inp${filter === 'inp' ? ' active' : ''}`} onClick={() => handleFilter('inp')}>住院刀</button>
        <button className={`filter-btn${filter === 'busy' ? ' active' : ''}`} onClick={() => handleFilter('busy')}>手術中</button>
        <button className={`filter-btn${filter === 'prep' ? ' active' : ''}`} onClick={() => handleFilter('prep')}>排程</button>
        <button className="filter-btn" onClick={() => setShowCompleted(true)}>已完成 ▸</button>
      </div>

      {liveSelectedRoom && <RoomModal room={liveSelectedRoom} onClose={() => setSelectedRoom(null)} />}
      {showCompleted && <CompletedModal items={completedList} onClose={() => setShowCompleted(false)} />}
    </>
  )
}

// 今日已完成手術清單 Modal（點統計面板/篩選列「已完成」開啟）
function CompletedModal({ items, onClose }) {
  return (
    <div className="modal-overlay show" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <span className="modal-room-id">今日已完成手術</span>
          <span className="modal-basic">{items.length} 台</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <table className="surg-table" style={{ width: '100%' }}>
            <thead>
              <tr><th>刀房</th><th>排程</th><th>病人</th><th>術式</th><th>主刀</th></tr>
            </thead>
            <tbody>
              {items.length === 0
                ? <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>今日尚無已完成手術</td></tr>
                : items.map((s, i) => (
                  <tr key={i}>
                    <td><span className="surg-td-or">{s.roomId}</span></td>
                    <td>{s.ScheduledTime || '—'}</td>
                    <td><span className={s.Gender === 'M' ? 'gender-m' : 'gender-f'}>{s.PatientName}</span> {s.Gender}/{s.Age ?? '—'}</td>
                    <td>{s.SurgeryName || '—'}</td>
                    <td>{s.Doctor || '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="modal-footer"><button className="btn-close-modal" onClick={onClose}>關閉</button></div>
      </div>
    </div>
  )
}
