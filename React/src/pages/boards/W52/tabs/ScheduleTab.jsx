// ScheduleTab：排班資訊分頁
// 角色：上方切換班別（白班/小夜/大夜，第一個視為當前班 is-current）；
//       下方左欄為護理人員（職別/分機/負責床位/緊急編組/點班狀態），右欄為專科護理師與住院醫師。
import { useState, useMemo } from 'react'
import { usePolling } from '../../../../hooks/usePolling'
import * as wardApi from '../../../../services/wardApi'
import { CENSUS_MS } from '../../../../config/pollingConfig'
import '../tabsCss/schedule.css'

const SHIFT_ORDER = ['白班', '小夜', '大夜']
const SHIFT_TIME = { '白班': '08:00–16:00', '小夜': '16:00–24:00', '大夜': '00:00–08:00' }

export default function ScheduleTab() {
  // 後端 /api/Board/W52/schedule（自建人員排班＋主護勾床；免 F5 輪詢）
  const { data } = usePolling(() => wardApi.getSchedule('W52'), { intervalMs: CENSUS_MS, deps: ['W52-sch'] })
  // 依固定班別順序排列，並補上班別時間（後端未帶）
  const shifts = useMemo(() => {
    const raw = data?.shifts ?? []
    return [...raw]
      .map(s => ({ ...s, shiftTime: SHIFT_TIME[s.shiftType] ?? '' }))
      .sort((a, b) => SHIFT_ORDER.indexOf(a.shiftType) - SHIFT_ORDER.indexOf(b.shiftType))
  }, [data])
  const [activeIdx, setActiveIdx] = useState(0)        // 目前檢視的班別索引（預設第一個＝當前班）
  const shift = shifts[activeIdx] ?? { shiftType: '', shiftTime: '', nurses: [], specialists: [], residents: [] }

  if (shifts.length === 0) {
    return <main className="main-content"><div className="sc-panel"><div className="sc-title"><span className="sc-title-bar"></span>排班資訊</div><div style={{padding:'40px',textAlign:'center',color:'#90A4AE'}}>本日尚無排班資料</div></div></main>
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

        {/* 雙欄 */}
        <div className="sc-columns">
          {/* 左：護理人員 */}
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
                        <td className="sc-td-ext">{n.extension}</td>
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

          {/* 右：專師 + 住院醫師 */}
          <div className="sc-col-right">
            <div className="sc-card">
              <div className="sc-card-header">
                當日專科護理師
                <span className="sc-card-count">{shift.specialists.length} 人</span>
              </div>
              <div className="sc-table-wrap">
                <table className="sc-table">
                  <thead><tr><th>姓名</th></tr></thead>
                  <tbody>
                    {shift.specialists.length === 0
                      ? <tr className="sc-empty-row"><td colSpan="1">本日無專師</td></tr>
                      : shift.specialists.map(s => (
                        <tr key={s.staffId}><td>{s.peName}</td></tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
            <div className="sc-card">
              <div className="sc-card-header">
                當日住院醫師
                <span className="sc-card-count">{shift.residents.length} 人</span>
              </div>
              <div className="sc-table-wrap">
                <table className="sc-table">
                  <thead><tr><th>姓名</th></tr></thead>
                  <tbody>
                    {shift.residents.length === 0
                      ? <tr className="sc-empty-row"><td colSpan="1">本日無住院醫師</td></tr>
                      : shift.residents.map(r => (
                        <tr key={r.id}><td>{r.peName}</td></tr>
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
