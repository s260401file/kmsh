// ExamTab：ER 急診站「檢查 / 會診」分頁。
// 左欄列出檢查清單（X光、CT、超音波等及其狀態），右欄列出會診清單（科別、會診醫師、回覆狀態）。
// 資料來源：後端 /api/Board/ER/exam（自建 WardExamConsult；免 F5 輪詢）。
import { usePolling } from '../../../../hooks/usePolling'
import * as wardApi from '../../../../services/wardApi'
import { CENSUS_MS } from '../../../../config/pollingConfig'
import BoardLoading from '../../../../components/BoardLoading'
import '../tabsCss/exam.css'

export default function ExamTab() {
  const { data, loading } = usePolling(() => wardApi.getExamConsult('ER'), { intervalMs: CENSUS_MS, deps: ['ER'] })
  const Exams = data?.exams ?? []
  const Consults = data?.consults ?? []

  if (loading) return <main className="main-content"><BoardLoading text="檢查／會診載入中…" /></main>
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
                  {Exams.map((e, i) => (
                    <tr key={i}>
                      <td className="ec-bed">{e.bedId}</td>
                      <td>{e.patientName}</td>
                      <td>{e.examName}</td>
                      <td><span className={`ec-status ec-status-${e.status}`}>{e.status}</span></td>
                      <td>{e.timeSlot}</td>
                      <td className="ec-note">{e.notes || '—'}</td>
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
                  {Consults.map((c, i) => (
                    <tr key={i}>
                      <td className="ec-bed">{c.bedId}</td>
                      <td>{c.patientName}</td>
                      <td>{c.consultDept}</td>
                      <td>{c.consultDoctor}</td>
                      <td><span className={`ec-status ec-status-${c.status}`}>{c.status}</span></td>
                      <td className="ec-note">{c.notes || '—'}</td>
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
