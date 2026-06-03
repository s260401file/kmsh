import { useState } from 'react'
import SCHEDULE_DATA from '../tabsData/scheduleData'
import '../tabsCss/schedule.css'

export default function ScheduleTab() {
  const shifts = SCHEDULE_DATA.Data.Shifts
  const [currentIdx, setCurrentIdx] = useState(0)
  const shift = shifts[currentIdx]

  const activeNurses = new Set()
  shift.Rooms.forEach(r => {
    if (r.ScrubNurse) activeNurses.add(r.ScrubNurse)
    if (r.CircNurse) activeNurses.add(r.CircNurse)
  })
  const activeRooms = shift.Rooms.filter(r => r.ScrubNurse).length

  return (
    <main className="main-content">
      <div className="sc-body">

        {/* 左側 */}
        <div className="sc-left">

          {/* 班別切換 */}
          <div className="sc-shift-bar">
            {shifts.map((s, i) => (
              <button
                key={s.ShiftType}
                className={`sc-shift-btn${i === currentIdx ? ' active' : ''}${i === 0 ? ' is-current' : ''}`}
                onClick={() => setCurrentIdx(i)}
              >
                {s.ShiftType}
                <span className="sc-shift-time">{s.ShiftTime}</span>
              </button>
            ))}
          </div>

          {/* 護理長 */}
          <div className="sc-info-card">
            <div className="sc-info-label">值班護理長</div>
            <div className="sc-info-value">{shift.Charge.Name}（分機 {shift.Charge.Extension}）</div>
          </div>

          {/* 麻醉科 */}
          <div className="sc-info-card" style={{ paddingBottom: 0 }}>
            <div className="sc-info-label" style={{ marginBottom: '8px' }}>麻醉科人員</div>
            <table className="sc-anes-table">
              <thead>
                <tr>
                  <th>職稱</th>
                  <th>姓名</th>
                  <th>分機</th>
                </tr>
              </thead>
              <tbody>
                {shift.Anesthesia.map(a => (
                  <tr key={a.StaffId}>
                    <td className="sc-td-role">{a.Role}</td>
                    <td>{a.Name}</td>
                    <td className="sc-td-ext">{a.Extension}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* CircTech */}
          <div className="sc-info-card">
            <div className="sc-info-label">體外循環技師</div>
            <div className="sc-info-value">
              {shift.CircTech ? `${shift.CircTech.Name}（分機 ${shift.CircTech.Extension}）` : '本班無'}
            </div>
          </div>

          {/* 統計 */}
          <div className="sc-stats">
            <div className="sc-stat-card">
              <div className="stat-val">{activeNurses.size}</div>
              <div className="stat-lbl">護理師人數</div>
            </div>
            <div className="sc-stat-card">
              <div className="stat-val">{shift.Anesthesia.length}</div>
              <div className="stat-lbl">麻醉科人員</div>
            </div>
            <div className="sc-stat-card">
              <div className="stat-val">{activeRooms}</div>
              <div className="stat-lbl">有人刀房</div>
            </div>
          </div>

        </div>

        {/* 右側：刀房派班表 */}
        <div className="sc-right">
          <div className="sc-section-title">刀房派班一覽</div>
          <div className="sc-table-wrap">
            <table className="sc-room-table">
              <thead>
                <tr>
                  <th>刀房</th>
                  <th className="sc-th-center">分機</th>
                  <th>刷手護理師</th>
                  <th>流動護理師</th>
                </tr>
              </thead>
              <tbody>
                {shift.Rooms.map(r => (
                  <tr key={r.RoomId}>
                    <td className="sc-td-room">{r.RoomId}</td>
                    <td className="sc-td-ext" style={{ textAlign: 'center' }}>{r.Extension}</td>
                    <td>{r.ScrubNurse || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td>{r.CircNurse  || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  )
}
