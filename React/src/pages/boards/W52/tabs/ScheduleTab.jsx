import { useState } from 'react'
import SCHEDULE_DATA from '../tabsData/scheduleData'
import '../tabsCss/schedule.css'

export default function ScheduleTab() {
  const shifts = SCHEDULE_DATA.Data.Shifts
  const [activeIdx, setActiveIdx] = useState(0)
  const shift = shifts[activeIdx]

  return (
    <main className="main-content">
      <div className="sc-panel">
        <div className="sc-title">
          <span className="sc-title-bar"></span>
          排班資訊
        </div>

        {/* 班別切換 */}
        <div className="sc-shift-bar">
          {shifts.map((s, i) => (
            <button
              key={s.ShiftType}
              className={`sc-shift-btn${i === 0 ? ' is-current' : ''}${activeIdx === i ? ' active' : ''}`}
              onClick={() => setActiveIdx(i)}
            >
              {s.ShiftType}
              <span className="sc-shift-time">{s.ShiftTime}</span>
            </button>
          ))}
        </div>

        {/* 雙欄 */}
        <div className="sc-columns">
          {/* 左：護理人員 */}
          <div className="sc-col-left">
            <div className="sc-card">
              <div className="sc-card-header">
                護理人員
                <span className="sc-card-count">{shift.Nurses.length} 人</span>
              </div>
              <div className="sc-table-wrap">
                <table className="sc-table">
                  <thead><tr><th>職別</th><th>姓名</th><th>分機</th><th>負責床位</th><th>緊急編組</th><th className="sc-th-center">點班</th></tr></thead>
                  <tbody>
                    {shift.Nurses.map(n => (
                      <tr key={n.StaffId}>
                        <td className="sc-td-role">{n.Role}</td>
                        <td>{n.PeName}</td>
                        <td className="sc-td-ext">{n.Extension}</td>
                        <td>
                          {n.BedNos.length > 0
                            ? <div className="sc-beds">{n.BedNos.map(b => <span key={b} className="sc-bed-tag">{b}</span>)}</div>
                            : <span className="sc-beds-none">—</span>
                          }
                        </td>
                        <td><span className={`sc-group-badge sc-group-${n.EmergencyGroup}`}>{n.EmergencyGroup}</span></td>
                        <td className="sc-td-checkin">
                          {n.CheckIn
                            ? <span className="sc-checkin-yes">✓</span>
                            : <span className="sc-checkin-no">—</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 右：專師 + 住院醫師 */}
          <div className="sc-col-right">
            <div className="sc-card">
              <div className="sc-card-header">
                專科護理師
                <span className="sc-card-count">{shift.Specialists.length} 人</span>
              </div>
              <div className="sc-table-wrap">
                <table className="sc-table">
                  <thead><tr><th>姓名</th><th>專科</th><th>分機</th></tr></thead>
                  <tbody>
                    {shift.Specialists.length === 0
                      ? <tr className="sc-empty-row"><td colSpan="3">本班無專師</td></tr>
                      : shift.Specialists.map(s => (
                        <tr key={s.StaffId}><td>{s.PeName}</td><td>{s.Specialty}</td><td className="sc-td-ext">{s.Extension}</td></tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
            <div className="sc-card">
              <div className="sc-card-header">
                住院醫師
                <span className="sc-card-count">{shift.Residents.length} 人</span>
              </div>
              <div className="sc-table-wrap">
                <table className="sc-table">
                  <thead><tr><th>姓名</th><th>科別</th><th>分機</th></tr></thead>
                  <tbody>
                    {shift.Residents.length === 0
                      ? <tr className="sc-empty-row"><td colSpan="3">本班無住院醫師</td></tr>
                      : shift.Residents.map(r => (
                        <tr key={r.StaffId}><td>{r.PeName}</td><td>{r.Department}</td><td className="sc-td-ext">{r.Extension}</td></tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
