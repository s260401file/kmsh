import CARE_DATA from '../tabsData/careData'
import '../tabsCss/care.css'

export default function CareTab() {
  const items = CARE_DATA.Data.Items
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
