// ExamTab：檢查／會診分頁
// 角色：左欄列出檢查排程（項目/預定日期/時段/狀態/備註），右欄列出會診（科別/醫師/完成時間/狀態）。
import { usePolling } from '../../../../hooks/usePolling'
import * as wardApi from '../../../../services/wardApi'
import { CENSUS_MS } from '../../../../config/pollingConfig'
import '../tabsCss/exam.css'

export default function ExamTab() {
  // 後端 /api/Board/W52/exam（自建 WardExamConsult；免 F5 輪詢）
  const { data } = usePolling(() => wardApi.getExamConsult('W52'), { intervalMs: CENSUS_MS, deps: ['W52'] })
  const exams = data?.exams ?? []
  const consults = data?.consults ?? []
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
                    : exams.map((e, i) => (
                      <tr key={i}>
                        <td className="ec-td-bed">{e.bedId}</td>
                        <td className="ec-td-name"><span className={`ec-gender-${e.gender === 'M' ? 'm' : 'f'}`}>{e.patientName}</span></td>
                        <td className="ec-td-item">{e.examName}</td>
                        <td className="ec-td-date">{e.scheduledDate}</td>
                        <td className="ec-td-time">{e.timeSlot}</td>
                        <td className="ec-td-status"><span className={`ec-status ec-status-${e.status}`}>{e.status}</span></td>
                        <td className="ec-td-remark">{e.notes || '—'}</td>
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
                    : consults.map((c, i) => (
                      <tr key={i}>
                        <td className="ec-td-bed">{c.bedId}</td>
                        <td className="ec-td-name"><span className={`ec-gender-${c.gender === 'M' ? 'm' : 'f'}`}>{c.patientName}</span></td>
                        <td className="ec-td-item">{c.consultDept}</td>
                        <td className="ec-td-doctor">{c.consultDoctor}</td>
                        <td className="ec-td-time">{c.completedTime || '—'}</td>
                        <td className="ec-td-status"><span className={`ec-status ec-status-${c.status}`}>{c.status}</span></td>
                        <td className="ec-td-remark">{c.notes || '—'}</td>
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
