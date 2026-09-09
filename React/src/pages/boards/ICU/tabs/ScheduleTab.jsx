// ScheduleTab（ICU）：排班資訊分頁
// 角色：上方切換班別（白班/小夜/大夜，第一個視為當前班 is-current）；下方為護理人員表（滿版）。
// 比照 W52/schedule，但換 ICU 人員、且不含「當日專科護理師 / 當日住院醫師」右欄。
import { useState, useMemo } from 'react'
import { usePolling } from '../../../../hooks/usePolling'
import * as wardApi from '../../../../services/wardApi'
import { CENSUS_MS } from '../../../../config/pollingConfig'
import '../tabsCss/schedule.css'

const SHIFT_ORDER = ['白班', '小夜', '大夜']
const SHIFT_TIME = { '白班': '08:00–16:00', '小夜': '16:00–24:00', '大夜': '00:00–08:00' }

export default function ScheduleTab() {
  // 後端 /api/Board/ICU/schedule（自建人員排班＋主護勾床；免 F5 輪詢）
  const { data } = usePolling(() => wardApi.getSchedule('ICU'), { intervalMs: CENSUS_MS, deps: ['ICU-sch'] })
  const shifts = useMemo(() => {
    const raw = data?.shifts ?? []
    return [...raw]
      .map(s => ({ ...s, shiftTime: SHIFT_TIME[s.shiftType] ?? '' }))
      .sort((a, b) => SHIFT_ORDER.indexOf(a.shiftType) - SHIFT_ORDER.indexOf(b.shiftType))
  }, [data])
  const [activeIdx, setActiveIdx] = useState(0)
  const shift = shifts[activeIdx] ?? { shiftType: '', shiftTime: '', nurses: [] }

  if (shifts.length === 0) {
    return <main className="main-content"><div className="sc-panel"><div className="sc-title"><span className="sc-title-bar"></span>排班資訊</div><div style={{ padding: '40px', textAlign: 'center', color: '#90A4AE' }}>本日尚無排班資料</div></div></main>
  }

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
              key={s.shiftType}
              className={`sc-shift-btn${i === 0 ? ' is-current' : ''}${activeIdx === i ? ' active' : ''}`}
              onClick={() => setActiveIdx(i)}
            >
              {s.shiftType}
              <span className="sc-shift-time">{s.shiftTime}</span>
            </button>
          ))}
        </div>

        {/* 護理人員（滿版；無專師/住院醫師右欄） */}
        <div className="sc-columns">
          <div className="sc-col-left">
            <div className="sc-card">
              <div className="sc-card-header">
                護理人員
                <span className="sc-card-count">{shift.nurses.length} 人</span>
              </div>
              <div className="sc-table-wrap">
                <table className="sc-table">
                  <thead><tr><th>職別</th><th>姓名</th><th>分機</th><th>負責床位</th><th>緊急編組</th><th className="sc-th-center">點班</th></tr></thead>
                  <tbody>
                    {shift.nurses.map(n => (
                      <tr key={n.staffId}>
                        <td className="sc-td-role">{n.role}</td>
                        <td className="sc-td-name">{n.peName}</td>
                        <td className="sc-td-ext">{n.extension || '—'}</td>
                        <td>
                          {n.bedNos.length > 0
                            ? <div className="sc-beds">{n.bedNos.map(b => <span key={b} className="sc-bed-tag">{b}</span>)}</div>
                            : <span className="sc-beds-none">—</span>
                          }
                        </td>
                        <td>{n.emergencyGroup ? <span className={`sc-group-badge sc-group-${n.emergencyGroup}`}>{n.emergencyGroup}</span> : '—'}</td>
                        <td className="sc-td-checkin">
                          {n.checkIn
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
        </div>
      </div>
    </main>
  )
}
