import EXAM_DATA from '../tabsData/examData'
import '../tabsCss/exam.css'

export default function ExamTab() {
  const { Examinations: exams, Consultations: consults } = EXAM_DATA.Data
  return (
    <main className="main-content">
      <div className="ec-panel">
        <div className="ec-title">
          <span className="ec-title-bar"></span>
          檢查／會診
        </div>
        <div className="ec-columns">
          {/* 左：檢查 */}
          <div className="ec-card">
            <div className="ec-card-header">
              檢查
              <span className="ec-card-count">{exams.length} 筆</span>
            </div>
            <div className="ec-table-wrap">
              <table className="ec-table">
                <thead><tr><th>床號</th><th>姓名</th><th>檢查項目</th><th>預定日期</th><th>時段</th><th className="ec-th-center">狀態</th><th>備註</th></tr></thead>
                <tbody>
                  {exams.length === 0
                    ? <tr className="ec-empty-row"><td colSpan="7">無待執行檢查</td></tr>
                    : exams.map(e => (
                      <tr key={e.ExamId}>
                        <td className="ec-td-bed">{e.BedNo}</td>
                        <td className="ec-td-name"><span className={`ec-gender-${e.Gender === 'M' ? 'm' : 'f'}`}>{e.PatientName}</span></td>
                        <td className="ec-td-item">{e.ExamName}</td>
                        <td className="ec-td-date">{e.ScheduledDate}</td>
                        <td className="ec-td-time">{e.TimeSlot} {e.ScheduledTime}</td>
                        <td className="ec-td-status"><span className={`ec-status ec-status-${e.Status}`}>{e.Status}</span></td>
                        <td className="ec-td-remark">{e.Remarks || '—'}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
          {/* 右：會診 */}
          <div className="ec-card">
            <div className="ec-card-header">
              會診
              <span className="ec-card-count">{consults.length} 筆</span>
            </div>
            <div className="ec-table-wrap">
              <table className="ec-table">
                <thead><tr><th>床號</th><th>姓名</th><th>會診科別</th><th>會診醫師</th><th>完成時間</th><th className="ec-th-center">狀態</th><th>備註</th></tr></thead>
                <tbody>
                  {consults.length === 0
                    ? <tr className="ec-empty-row"><td colSpan="7">無待會診</td></tr>
                    : consults.map(c => (
                      <tr key={c.ConsultId}>
                        <td className="ec-td-bed">{c.BedNo}</td>
                        <td className="ec-td-name"><span className={`ec-gender-${c.Gender === 'M' ? 'm' : 'f'}`}>{c.PatientName}</span></td>
                        <td className="ec-td-item">{c.ConsultDept}</td>
                        <td className="ec-td-doctor">{c.ConsultDoctor}</td>
                        <td className="ec-td-time">{c.CompletedAt || '—'}</td>
                        <td className="ec-td-status"><span className={`ec-status ec-status-${c.Status}`}>{c.Status}</span></td>
                        <td className="ec-td-remark">{c.Remarks || '—'}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
