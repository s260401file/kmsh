import { useState, useMemo } from 'react'
import MOCK_DATA, { getStats } from '../mockData'

function sourceClass(source) {
  if (source === '急診刀') return 'src-er'
  if (source === '門診刀') return 'src-op'
  if (source === '住院刀') return 'src-inp'
  return ''
}

function isRoomVisible(room, filter) {
  if (filter === 'all' || room.Status === 'empty') return true
  const p = room.Patient
  switch (filter) {
    case 'er':   return p?.SurgerySource === '急診刀'
    case 'op':   return p?.SurgerySource === '門診刀'
    case 'inp':  return p?.SurgerySource === '住院刀'
    case 'busy': return room.Status === 'in-surgery'
    case 'prep': return room.Status === 'prep'
    case 'done': return room.Status === 'completed'
    default:     return false
  }
}

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
  return (
    <div
      className={`or-card ${room.Status} ${sourceClass(p.SurgerySource)}${filteredOut ? ' filtered-out' : ''}`}
      onClick={onClick}
    >
      <div className="card-row1">
        <span className="room-num">{room.RoomId}</span>
        <span className={`badge badge-${p.SurgerySource}`}>{p.SurgerySource}</span>
        <span className={`badge badge-${p.SurgeryStatus}`}>{p.SurgeryStatus}</span>
      </div>
      <div className="card-row2">
        <span className={`patient-name ${p.Gender === 'M' ? 'gender-m' : 'gender-f'}`}>{p.PatientName}</span>
        <span className="patient-basic">{p.Gender}/{p.Age}</span>
      </div>
      <div className="card-row3">{p.SurgeryName}</div>
      <div className="card-row4">術：{p.Doctor}</div>
    </div>
  )
}

function RoomModal({ room, onClose }) {
  const p = room.Patient
  const duration = calcDuration(p.StartTime, p.EndTime)
  return (
    <div className="modal-overlay show" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
            <span className="modal-room-id">{room.RoomId}</span>
            <span className="modal-patient">{p.PatientName}</span>
            <span className="modal-basic">{p.Gender === 'M' ? '男' : '女'} / {p.Age}歲</span>
            <div className="modal-badges">
              <span className={`badge badge-${p.SurgerySource}`}>{p.SurgerySource}</span>
              <span className={`badge badge-${p.SurgeryStatus}`}>{p.SurgeryStatus}</span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-row"><div className="modal-field full"><div className="field-label">診斷</div><div className="field-value diagnosis">{p.Diagnosis}</div></div></div>
          <div className="modal-row"><div className="modal-field full"><div className="field-label">術式</div><div className="field-value">{p.SurgeryName}</div></div></div>
          <div className="modal-row">
            <div className="modal-field"><div className="field-label">病歷號</div><div className="field-value">{p.MedRecord || '—'}</div></div>
            <div className="modal-field"><div className="field-label">生日</div><div className="field-value">{p.BirthDate || '—'}</div></div>
            <div className="modal-field"><div className="field-label">科別</div><div className="field-value">{p.Department || '—'}</div></div>
          </div>
          <div className="modal-row">
            <div className="modal-field"><div className="field-label">手術醫師</div><div className="field-value">{p.Doctor}</div></div>
            <div className="modal-field"><div className="field-label">刷手護理師</div><div className="field-value">{p.ScrubNurse}</div></div>
            <div className="modal-field"><div className="field-label">流動護理師</div><div className="field-value">{p.CircNurse}</div></div>
          </div>
          <div className="modal-row">
            <div className="modal-field"><div className="field-label">麻醉方式</div><div className="field-value">{p.AnesType}</div></div>
            <div className="modal-field"><div className="field-label">手術來源</div><div className="field-value">{p.SurgerySource}</div></div>
            <div className="modal-field"><div className="field-label">手術狀態</div><div className="field-value">{p.SurgeryStatus}</div></div>
          </div>
          <div className="modal-row">
            <div className="modal-field"><div className="field-label">排程時間</div><div className="field-value">{p.ScheduledTime || '—'}</div></div>
            <div className="modal-field"><div className="field-label">開始時間</div><div className="field-value">{p.StartTime || '—'}</div></div>
            <div className="modal-field"><div className="field-label">結束時間</div><div className="field-value">{p.EndTime || (p.StartTime ? '進行中' : '—')}</div></div>
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
  const [filter, setFilter] = useState('all')
  const [selectedRoom, setSelectedRoom] = useState(null)
  const stats = useMemo(() => getStats(MOCK_DATA.Rooms), [])
  const handleFilter = f => setFilter(prev => (prev === f && f !== 'all') ? 'all' : f)

  return (
    <>
      <main className="main-content">
        <div className="or-panel">
          <div className="ward-title">▌ 手術室　共 7 間（OR-01 ～ OR-07）</div>
          <div className="or-grid">
            {MOCK_DATA.Rooms.map(room => (
              <RoomCard
                key={room.RoomId}
                room={room}
                filteredOut={!isRoomVisible(room, filter)}
                onClick={room.Status !== 'empty' ? () => setSelectedRoom(room) : undefined}
              />
            ))}
          </div>
        </div>

        <div className="stats-panel">
          <div className="stats-title">▌ 手術統計</div>
          <div className="stats-body">
            <div className="ws-row">
              <div className="ws-item"><div className="ws-value">{stats.total}</div><div className="ws-label">刀房總數</div></div>
              <div className={`ws-item${filter === 'busy' ? ' active' : ''}`} data-filter="busy" onClick={() => handleFilter('busy')}><div className="ws-value ws-busy">{stats.inSurgery}</div><div className="ws-label">手術中</div></div>
            </div>
            <div className="ws-row">
              <div className={`ws-item${filter === 'er' ? ' active' : ''}`} data-filter="er" onClick={() => handleFilter('er')}><div className="ws-value ws-erknife">{stats.erKnife}</div><div className="ws-label">急診刀</div></div>
              <div className={`ws-item${filter === 'op' ? ' active' : ''}`} data-filter="op" onClick={() => handleFilter('op')}><div className="ws-value ws-opknife">{stats.opKnife}</div><div className="ws-label">門診刀</div></div>
              <div className={`ws-item${filter === 'inp' ? ' active' : ''}`} data-filter="inp" onClick={() => handleFilter('inp')}><div className="ws-value ws-inpknife">{stats.inpKnife}</div><div className="ws-label">住院刀</div></div>
            </div>
            <div className="ws-row">
              <div className={`ws-item${filter === 'prep' ? ' active' : ''}`} data-filter="prep" onClick={() => handleFilter('prep')}><div className="ws-value ws-prep">{stats.prep}</div><div className="ws-label">準備中</div></div>
              <div className={`ws-item${filter === 'done' ? ' active' : ''}`} data-filter="done" onClick={() => handleFilter('done')}><div className="ws-value ws-done">{stats.completed}</div><div className="ws-label">已完成</div></div>
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
        <button className={`filter-btn${filter === 'prep' ? ' active' : ''}`} onClick={() => handleFilter('prep')}>準備中</button>
        <button className={`filter-btn${filter === 'done' ? ' active' : ''}`} onClick={() => handleFilter('done')}>已完成</button>
      </div>

      {selectedRoom && <RoomModal room={selectedRoom} onClose={() => setSelectedRoom(null)} />}
    </>
  )
}
