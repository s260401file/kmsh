import EXAM_DATA from '../tabsData/examData'
import '../tabsCss/exam.css'

export default function ExamTab() {
  const { Exams, Consults } = EXAM_DATA.Data

  return (
    <main className="main-content">
      <div className="ec-panel">
        <div className="ec-page-title">
          <span className="ec-title-accent"></span>
          檢查 / 會診
        </div>
        <div className="ec-columns">
          {/* 左：檢查清單 */}
          <div className="ec-card">
            <div className="ec-card-header">
              檢查清單
              <span className="ec-card-count">{Exams.length} 筆</span>
            </div>
            <div className="ec-table-wrap">
              <table className="ec-table">
                <thead>
                  <tr>
                    <th>床號</th>
                    <th>病患</th>
                    <th>檢查項目</th>
                    <th>狀態</th>
                    <th>時段</th>
                    <th>備註</th>
                  </tr>
                </thead>
                <tbody>
                  {Exams.map(e => (
                    <tr key={e.ExamId}>
                      <td className="ec-bed">{e.BedId}</td>
                      <td>{e.PatientName}</td>
                      <td>{e.ExamName}</td>
                      <td><span className={`ec-status ec-status-${e.Status}`}>{e.Status}</span></td>
                      <td>{e.TimeSlot}</td>
                      <td className="ec-note">{e.Notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 右：會診清單 */}
          <div className="ec-card">
            <div className="ec-card-header">
              會診清單
              <span className="ec-card-count">{Consults.length} 筆</span>
            </div>
            <div className="ec-table-wrap">
              <table className="ec-table">
                <thead>
                  <tr>
                    <th>床號</th>
                    <th>病患</th>
                    <th>會診科別</th>
                    <th>會診醫師</th>
                    <th>狀態</th>
                    <th>備註</th>
                  </tr>
                </thead>
                <tbody>
                  {Consults.map(c => (
                    <tr key={c.ConsultId}>
                      <td className="ec-bed">{c.BedId}</td>
                      <td>{c.PatientName}</td>
                      <td>{c.ConsultDept}</td>
                      <td>{c.ConsultDoctor}</td>
                      <td><span className={`ec-status ec-status-${c.Status}`}>{c.Status}</span></td>
                      <td className="ec-note">{c.Notes || '—'}</td>
                    </tr>
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
