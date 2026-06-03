import HANDOVER_DATA from '../tabsData/handoverData'
import '../tabsCss/handover.css'

export default function HandoverTab() {
  const { HandoverInfo, Patients } = HANDOVER_DATA.Data
  const fromPill = `ho-pill-${HandoverInfo.FromShift}`
  const toPill   = `ho-pill-${HandoverInfo.ToShift}`
  return (
    <main className="main-content">
      <div className="ho-panel">
        <div className="ho-title">
          <span className="ho-title-bar"></span>
          護理交班
          <span className="ho-title-meta">{HandoverInfo.FromShift} → {HandoverInfo.ToShift}</span>
        </div>

        {/* 交班資訊橫條 */}
        <div className="ho-meta-bar">
          <div className="ho-meta-block">
            <span className="ho-meta-label">交班</span>
            <span className={`ho-meta-pill ${fromPill}`}>{HandoverInfo.FromShift}</span>
            <span className="ho-meta-arrow">→</span>
            <span className={`ho-meta-pill ${toPill}`}>{HandoverInfo.ToShift}</span>
          </div>
          <div className="ho-meta-block">
            <span className="ho-meta-label">時間</span>
            <span className="ho-meta-time">{HandoverInfo.HandoverTime}</span>
          </div>
          <div className="ho-meta-block">
            <span className="ho-meta-label">交班</span>
            <span className="ho-meta-nurses">{HandoverInfo.FromNurses.join('、')}</span>
          </div>
          <div className="ho-meta-block">
            <span className="ho-meta-label">接班</span>
            <span className="ho-meta-nurses">{HandoverInfo.ToNurses.join('、')}</span>
          </div>
        </div>

        {/* 病患交班卡片 */}
        <div className="ho-list">
          {Patients.map(p => (
            <div key={p.HandoverId} className="ho-card">
              <div className={`ho-priority-bar ho-bar-${p.Priority}`} />
              <div className="ho-card-body">
                <div className="ho-card-top">
                  <span className="ho-bed-label">床</span>
                  <span className="ho-bed-no">{p.BedNo}</span>
                  <span className={`ho-patient-name ho-gender-${p.Gender === 'M' ? 'm' : 'f'}`}>{p.PatientName}</span>
                  <span className="ho-basic">{p.Gender}/{p.Age}</span>
                  <span className={`ho-priority-badge ho-pri-${p.Priority}`}>{p.Priority}</span>
                </div>
                <div className="ho-diagnosis">{p.Diagnosis}</div>
                <div className="ho-items">
                  {p.Items.map((item, i) => (
                    <div key={i} className="ho-item">
                      <span className={`ho-cat-badge ho-cat-${item.Category}`}>{item.Category}</span>
                      <span className="ho-item-content">{item.Content}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
