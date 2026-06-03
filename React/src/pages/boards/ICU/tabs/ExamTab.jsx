import EXAM_DATA from '../tabsData/examData'
import '../tabsCss/exam.css'

export default function ExamTab() {
  const { examinations: exams, consultations: consults } = EXAM_DATA.data
  return (
    <main className="main-content">
      <div className="ec-panel">
        <div className="ec-title">
          <span className="ec-title-bar"></span>
          檢查／會診
        </div>
        <div className="ec-columns">
          <div className="ec-card">
            <div className="ec-card-header">
              檢查 <span className="ec-card-count">{exams.length} 筆</span>
            </div>
            <div className="ec-table-wrap">
              <table className="ec-table">
                <thead><tr><th>床號</th><th>姓名</th><th>檢查項目</th><th>預定日期</th><th>時段</th><th className="ec-th-center">狀態</th><th>備註</th></tr></thead>
                <tbody>
                  {exams.length === 0
                    ? <tr className="ec-empty-row"><td colSpan="7">無待執行檢查</td></tr>
                    : exams.map(e => (
                      <tr key={e.examId}>
                        <td className="ec-td-bed">{e.bedId}</td>
                        <td className="ec-td-name"><span className={`ec-gender-${e.gender === 'M' ? 'm' : 'f'}`}>{e.patientName}</span></td>
                        <td className="ec-td-item">{e.examName}</td>
                        <td className="ec-td-date">{e.scheduledDate}</td>
                        <td className="ec-td-time">{e.timeSlot} {e.scheduledTime}</td>
                        <td className="ec-td-status"><span className={`ec-status ec-status-${e.status}`}>{e.status}</span></td>
                        <td className="ec-td-remark">{e.remarks || '—'}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
          <div className="ec-card">
            <div className="ec-card-header">
              會診 <span className="ec-card-count">{consults.length} 筆</span>
            </div>
            <div className="ec-table-wrap">
              <table className="ec-table">
                <thead><tr><th>床號</th><th>姓名</th><th>會診科別</th><th>會診醫師</th><th>完成時間</th><th className="ec-th-center">狀態</th><th>備註</th></tr></thead>
                <tbody>
                  {consults.length === 0
                    ? <tr className="ec-empty-row"><td colSpan="7">無待會診</td></tr>
                    : consults.map(c => (
                      <tr key={c.consultId}>
                        <td className="ec-td-bed">{c.bedId}</td>
                        <td className="ec-td-name"><span className={`ec-gender-${c.gender === 'M' ? 'm' : 'f'}`}>{c.patientName}</span></td>
                        <td className="ec-td-item">{c.consultDept}</td>
                        <td className="ec-td-doctor">{c.consultDoctor}</td>
                        <td className="ec-td-time">{c.completedAt || '—'}</td>
                        <td className="ec-td-status"><span className={`ec-status ec-status-${c.status}`}>{c.status}</span></td>
                        <td className="ec-td-remark">{c.remarks || '—'}</td>
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
