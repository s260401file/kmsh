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

          {/* 左欄：急診室平面示意 */}
          <div className="ev-map-wrap">
            <div className="ev-floor-plan-title">1F 急診室平面示意</div>
            <div className="ev-floor-plan">
              <div className="ev-floor-label">急診室（19 床）</div>
              <div className="ev-er-grid">
                <div className="ev-er-zone ev-zone-station">
                  護理站 / 分診台
                  <span className="ev-zone-sub">Nursing Station</span>
                </div>
                <div className="ev-er-zone">急救區<span className="ev-zone-sub">1床</span></div>
                <div className="ev-er-zone">負壓隔離<span className="ev-zone-sub">2床</span></div>
                <div className="ev-er-zone ev-zone-exit">東側出口<span className="ev-zone-sub">急救入口</span></div>
                <div className="ev-er-zone">第一診療<span className="ev-zone-sub">5床</span></div>
                <div className="ev-er-zone">第二診療<span className="ev-zone-sub">6床</span></div>
                <div className="ev-er-zone ev-zone-exit">西側出口<span className="ev-zone-sub">一般出口</span></div>
                <div className="ev-er-zone">留觀區<span className="ev-zone-sub">2床</span></div>
                <div className="ev-er-zone">待床區<span className="ev-zone-sub">3床</span></div>
                <div className="ev-er-zone ev-zone-exit">集合點<span className="ev-zone-sub">院門前廣場</span></div>
              </div>
              <div className="ev-exit-arrow">
                <span className="ev-arrow">↓</span>
                <span className="ev-arrow-label">避難方向 → 院門前廣場</span>
              </div>
            </div>
            <div className="ev-legend">
              <div className="ev-legend-item"><span className="ev-legend-dot dot-zone"></span>診療區</div>
              <div className="ev-legend-item"><span className="ev-legend-dot dot-station"></span>護理站</div>
              <div className="ev-legend-item"><span className="ev-legend-dot dot-exit"></span>出口 / 集合點</div>
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
