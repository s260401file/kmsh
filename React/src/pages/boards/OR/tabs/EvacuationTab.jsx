import EVACUATION_DATA from '../tabsData/evacuationData'
import '../tabsCss/evacuation.css'

export default function EvacuationTab() {
  const { EvacPlan, Equipment, EmergencyContacts } = EVACUATION_DATA.Data

  return (
    <main className="main-content" style={{ padding: 0 }}>
      <div className="ev-panel">

        <div className="ev-title">
          <span className="ev-title-bar"></span>
          避難圖
          <span className="ev-title-meta">{EvacPlan.FloorNo} — {EvacPlan.WardName}</span>
        </div>

        <div className="ev-columns">

          {/* 左欄：平面示意圖 */}
          <div className="ev-map-wrap">

            <div className="ev-floor-plan-title">5F 手術室平面示意</div>

            <div className="ev-floor-plan">
              <div className="ev-floor-label">手術室（OR-01 ～ OR-07）</div>
              <div className="ev-stairs">樓梯間</div>
              <div className="ev-or-grid">
                {['OR-01','OR-02','OR-03','OR-04','OR-05','OR-06','OR-07'].map(id => (
                  <div key={id} className="ev-or-room">{id}</div>
                ))}
                <div className="ev-or-room ev-or-exit">緊急出口</div>
              </div>
              <div className="ev-exit-arrow">
                <span className="ev-arrow">↓</span>
                <span className="ev-arrow-label">避難方向 → 1F 集合點</span>
              </div>
            </div>

            <div className="ev-legend">
              <div className="ev-legend-item"><span className="ev-legend-dot dot-room"></span>手術室</div>
              <div className="ev-legend-item"><span className="ev-legend-dot dot-exit"></span>緊急出口</div>
              <div className="ev-legend-item"><span className="ev-legend-dot dot-stairs"></span>樓梯間</div>
            </div>

          </div>

          {/* 右欄：設備 + 緊急聯絡 */}
          <div className="ev-side">

            <div className="ev-card">
              <div className="ev-card-header">
                避難設備清單
                <span className="ev-card-count">{Equipment.length} 項</span>
              </div>
              <div className="ev-equip-list">
                {Equipment.map(e => (
                  <div key={e.EquipmentId} className="ev-equip-row">
                    <span className="ev-equip-name">{e.EquipmentName}</span>
                    <span className="ev-equip-loc">{e.Location}</span>
                    {e.Quantity > 1 && <span className="ev-equip-qty">×{e.Quantity}</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="ev-card">
              <div className="ev-card-header">緊急聯絡</div>
              <div className="ev-contacts">
                {EmergencyContacts.map(c => (
                  <div key={c.ContactId} className="ev-contact-row">
                    <span className="ev-contact-name">{c.Name}</span>
                    <span className="ev-contact-ext">{c.Extension}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  )
}
