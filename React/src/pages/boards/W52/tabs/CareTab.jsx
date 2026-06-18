// CareTab：照護提醒分頁
// 角色：以清單列出各床的照護提醒，每筆含優先序色條、床號/病人、類別標籤（術後/感控/管路…）、
//       提醒內容、提醒時間與責任護理師。
import CARE_DATA from '../tabsData/careData'   // 照護提醒假資料，待接 API
import '../tabsCss/care.css'

export default function CareTab() {
  const items = CARE_DATA.Data.Items   // 提醒項目陣列
  return (
    <main className="main-content">
      <div className="care-panel">
        <div className="care-title">
          <span className="care-title-bar"></span>
          照護提醒
        </div>
        <div className="care-list">
          {items.map(item => (
            <div key={item.ReminderId} className="care-item">
              <div className={`care-priority-bar priority-bar-${item.Priority}`} />
              <div className="care-bed-info">
                <span className="care-bed">{item.BedNo}</span>
                <span className={`care-patient care-gender-${item.Gender === 'M' ? 'm' : 'f'}`}>{item.PatientName}</span>
                <span className="care-basic">{item.Gender}/{item.Age}</span>
              </div>
              <span className={`care-category cat-${item.Category}`}>{item.Category}</span>
              <span className="care-content">{item.Content}</span>
              <div className="care-meta">
                <span className="care-time">{item.RemindTime}</span>
                <span className="care-nurse">{item.PrimaryNurse}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
