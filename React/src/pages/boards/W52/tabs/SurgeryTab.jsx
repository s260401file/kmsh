// SurgeryTab：手術資訊分頁
// 角色：以表格列出當日手術排程（床號、病人、時間、刀房、術式、診斷、麻醉、主治、狀態）；
//       依狀態優先序排序，狀態以色票標示，「取消」整列淡化、不計入台數。
import SURGERY_DATA from '../tabsData/surgeryData'   // 手術假資料，待接 API
import '../tabsCss/surgery.css'

// 列表排序依據：手術中 → 待手術 → 已完成 → 取消
const STATUS_ORDER = ['手術中','待手術','已完成','取消']

export default function SurgeryTab() {
  // 複製後依 STATUS_ORDER 排序（不直接改動原始資料）
  const items = [...SURGERY_DATA.Data.Items].sort(
    (a, b) => STATUS_ORDER.indexOf(a.Status) - STATUS_ORDER.indexOf(b.Status)
  )
  return (
    <main className="main-content">
      <div className="surg-panel">
        <div className="surg-title">
          <span className="surg-title-bar"></span>
          手術資訊
        </div>
        <div className="surg-card">
          <div className="surg-card-header">
            當日手術
            <span className="surg-card-count">共 {items.filter(i => i.Status !== '取消').length} 台</span>
          </div>
          <div className="surg-table-wrap">
            <table className="surg-table">
              <thead>
                <tr>
                  <th>床號</th><th>姓名</th><th>排程時間</th><th>手術間</th>
                  <th>術式</th><th>診斷</th><th>麻醉方式</th><th>主治醫師</th>
                  <th className="surg-th-center">狀態</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0
                  ? <tr className="surg-empty-row"><td colSpan="9">今日無手術排程</td></tr>
                  : items.map(item => (
                    <tr key={item.SurgeryId} className={item.Status === '取消' ? 'surg-row-cancel' : ''}>
                      <td className="surg-td-bed">{item.BedNo}</td>
                      <td className="surg-td-name">
                        <span className={`surg-name surg-gender-${item.Gender === 'M' ? 'm' : 'f'}`}>{item.PatientName}</span>
                        <span className="surg-basic">{item.Gender}/{item.Age}</span>
                      </td>
                      <td className="surg-td-time">{item.ScheduledTime}</td>
                      <td><span className="surg-td-or">{item.OrRoom}</span></td>
                      <td className="surg-td-procedure">{item.Procedure}</td>
                      <td className="surg-td-diagnosis">{item.Diagnosis}</td>
                      <td className="surg-td-anesthesia">{item.AnesthesiaMethod}</td>
                      <td className="surg-td-surgeon">{item.AttendingSurgeon}</td>
                      <td className="surg-td-status">
                        <span className={`surg-status surg-status-${item.Status}`}>{item.Status}</span>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}
