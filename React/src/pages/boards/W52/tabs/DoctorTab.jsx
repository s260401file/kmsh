// DoctorTab：醫師資訊分頁
// 角色：左欄列出醫師/專師各自負責的床位與分機；右欄為當日起的查房時間表（依日期分組）。
import DOCTOR_DATA from '../tabsData/doctorData'   // 醫師/查房假資料，待接 API
import '../tabsCss/doctor.css'

// 星期數字 → 中文（用於查房日期標頭）
const DAY_MAP = { '0':'日', '1':'一', '2':'二', '3':'三', '4':'四', '5':'五', '6':'六' }

// 將 yyyyMMdd 字串轉成 { label:'MM/DD (週幾)', isToday } 供日期分隔列使用
function formatDate(d) {
  const s = String(d)
  const dt = new Date(`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`)
  const day = DAY_MAP[String(dt.getDay())]
  return { label: `${s.slice(4,6)}/${s.slice(6,8)} (${day})`, isToday: s === new Date().toISOString().slice(0,10).replace(/-/g,'') }
}

export default function DoctorTab() {
  const { DoctorBeds, RoundSchedule } = DOCTOR_DATA.Data

  // 將查房排程依日期（RoundDate）分組，方便畫面用日期當分隔列
  const roundsByDate = RoundSchedule.reduce((acc, r) => {
    if (!acc[r.RoundDate]) acc[r.RoundDate] = []
    acc[r.RoundDate].push(r)
    return acc
  }, {})

  return (
    <main className="main-content">
      <div className="dr-panel">
        <div className="dr-title">
          <span className="dr-title-bar"></span>
          醫師資訊
        </div>
        <div className="dr-columns">
          {/* 左：負責床位 */}
          <div className="dr-card">
            <div className="dr-card-header">
              醫師 / 專師負責床位
              <span className="dr-card-count">{DoctorBeds.length} 人</span>
            </div>
            <div className="dr-table-wrap">
              <table className="dr-table">
                <thead><tr><th>姓名</th><th>職別</th><th>專科</th><th>分機</th><th>負責床位</th></tr></thead>
                <tbody>
                  {DoctorBeds.map(d => (
                    <tr key={d.DoctorId}>
                      <td>{d.DoctorName}</td>
                      <td><span className={`dr-role-badge dr-role-${d.Role}`}>{d.Role}</span></td>
                      <td className="dr-td-specialty">{d.Specialty}</td>
                      <td className="dr-td-ext">{d.Ext}</td>
                      <td>
                        <div className="dr-beds">
                          {d.BedNos.map(b => <span key={b} className="dr-bed-tag">{b}</span>)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 右：查房時間表 */}
          <div className="dr-card">
            <div className="dr-card-header">查房時間表</div>
            <div className="dr-table-wrap">
              <table className="dr-table">
                <thead><tr><th>日期</th><th>姓名</th><th>專科</th><th>預計時段</th><th className="dr-th-center">狀態</th></tr></thead>
                <tbody>
                  {Object.entries(roundsByDate).map(([date, rounds]) => (
                    <>
                      <tr key={`sep-${date}`} className="dr-date-sep">
                        <td colSpan="5">{formatDate(date).label}</td>
                      </tr>
                      {rounds.map(r => (
                        <tr key={r.RoundId} className={r.IsCompleted ? 'dr-row-done' : ''}>
                          <td className="dr-td-date">
                            <span className="dr-date-main">{r.EstimatedTime}</span>
                            {r.ActualTime && <span className="dr-actual-time">實 {r.ActualTime}</span>}
                          </td>
                          <td>{r.DoctorName}</td>
                          <td className="dr-td-specialty">{r.Specialty}</td>
                          <td className="dr-td-time">{r.EstimatedTime}</td>
                          <td className="dr-td-status">
                            {r.IsCompleted
                              ? <span className="dr-status-done">✓ 完成</span>
                              : <span className="dr-status-pending">待查房</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
