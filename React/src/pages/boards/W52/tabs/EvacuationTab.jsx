import EVACUATION_DATA from '../tabsData/evacuationData'
import '../tabsCss/evacuation.css'

export default function EvacuationTab() {
  const { EvacPlan, Equipment, EmergencyContacts } = EVACUATION_DATA.Data
  return (
    <main className="main-content">
      <div className="ev-panel">
        <div className="ev-title">
          <span className="ev-title-bar"></span>
          避難圖
          <span className="ev-title-meta">{EvacPlan.FloorNo} — {EvacPlan.WardName}</span>
        </div>
        <div className="ev-columns">
          {/* 左：平面圖 SVG */}
          <div className="ev-map-wrap">
            <svg viewBox="0 0 800 540" className="ev-svg" preserveAspectRatio="xMidYMid meet">
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#E64A19"/>
                </marker>
              </defs>
              <g transform="translate(740, 30)">
                <circle cx="0" cy="0" r="18" fill="none" stroke="#3A5068" strokeWidth="1.5"/>
                <text x="0" y="-22" fontSize="11" fill="#3A5068" textAnchor="middle">N</text>
                <path d="M 0 -12 L 5 8 L 0 4 L -5 8 z" fill="#E64A19"/>
              </g>
              <rect x="40" y="60" width="700" height="360" fill="#FAFCFD" stroke="#2C3E50" strokeWidth="4"/>
              <g><rect x="60" y="80" width="150" height="120" fill="#F5F9FC" stroke="#90A4AE" strokeWidth="2"/>
                <text x="135" y="100" fontSize="13" fontWeight="700" fill="#3A5068" textAnchor="middle">四人房</text>
                <text x="135" y="115" fontSize="11" fill="#7A8FA0" textAnchor="middle">001–004</text>
                <rect x="72"  y="130" width="28" height="20" fill="#E3F2FD" stroke="#1565C0" strokeWidth="1"/>
                <rect x="105" y="130" width="28" height="20" fill="#E3F2FD" stroke="#1565C0" strokeWidth="1"/>
                <rect x="138" y="130" width="28" height="20" fill="#E3F2FD" stroke="#1565C0" strokeWidth="1"/>
                <rect x="171" y="130" width="28" height="20" fill="#E3F2FD" stroke="#1565C0" strokeWidth="1"/></g>
              <g><rect x="220" y="80" width="150" height="120" fill="#F5F9FC" stroke="#90A4AE" strokeWidth="2"/>
                <text x="295" y="100" fontSize="13" fontWeight="700" fill="#3A5068" textAnchor="middle">四人房</text>
                <text x="295" y="115" fontSize="11" fill="#7A8FA0" textAnchor="middle">005–008</text>
                <rect x="232" y="130" width="28" height="20" fill="#E3F2FD" stroke="#1565C0" strokeWidth="1"/>
                <rect x="265" y="130" width="28" height="20" fill="#E3F2FD" stroke="#1565C0" strokeWidth="1"/>
                <rect x="298" y="130" width="28" height="20" fill="#E3F2FD" stroke="#1565C0" strokeWidth="1"/>
                <rect x="331" y="130" width="28" height="20" fill="#E3F2FD" stroke="#1565C0" strokeWidth="1"/></g>
              <g><rect x="380" y="80" width="120" height="120" fill="#E8F5EE" stroke="#2D7A55" strokeWidth="2"/>
                <text x="440" y="120" fontSize="14" fontWeight="800" fill="#2D7A55" textAnchor="middle">護理站</text>
                <text x="440" y="138" fontSize="11" fill="#5B8772" textAnchor="middle">Nurse Station</text>
                <circle cx="440" cy="170" r="9" fill="#FFF" stroke="#1565C0" strokeWidth="2"/>
                <text x="440" y="174" fontSize="11" fontWeight="800" fill="#1565C0" textAnchor="middle">O₂</text></g>
              <g><rect x="510" y="80" width="100" height="120" fill="#F5F9FC" stroke="#90A4AE" strokeWidth="2"/>
                <text x="560" y="100" fontSize="13" fontWeight="700" fill="#3A5068" textAnchor="middle">四人房</text>
                <text x="560" y="115" fontSize="11" fill="#7A8FA0" textAnchor="middle">009–012</text>
                <rect x="518" y="130" width="22" height="20" fill="#E3F2FD" stroke="#1565C0" strokeWidth="1"/>
                <rect x="544" y="130" width="22" height="20" fill="#E3F2FD" stroke="#1565C0" strokeWidth="1"/>
                <rect x="570" y="130" width="22" height="20" fill="#E3F2FD" stroke="#1565C0" strokeWidth="1"/>
                <rect x="596" y="130" width="22" height="20" fill="#E3F2FD" stroke="#1565C0" strokeWidth="1"/></g>
              <g><rect x="620" y="80" width="100" height="120" fill="#F5F9FC" stroke="#90A4AE" strokeWidth="2"/>
                <text x="670" y="100" fontSize="13" fontWeight="700" fill="#3A5068" textAnchor="middle">四人房</text>
                <text x="670" y="115" fontSize="11" fill="#7A8FA0" textAnchor="middle">013–016</text>
                <rect x="628" y="130" width="22" height="20" fill="#E3F2FD" stroke="#1565C0" strokeWidth="1"/>
                <rect x="654" y="130" width="22" height="20" fill="#E3F2FD" stroke="#1565C0" strokeWidth="1"/>
                <rect x="680" y="130" width="22" height="20" fill="#E3F2FD" stroke="#1565C0" strokeWidth="1"/>
                <rect x="706" y="130" width="22" height="20" fill="#E3F2FD" stroke="#1565C0" strokeWidth="1"/></g>
              <rect x="60" y="220" width="660" height="60" fill="#FFFBF0" stroke="#E0D5B5" strokeWidth="1"/>
              <text x="395" y="258" fontSize="12" fill="#9C8C5A" textAnchor="middle" letterSpacing="2">CORRIDOR — 走 廊</text>
              <g>
                <rect x="60"  y="300" width="120" height="100" fill="#F5F9FC" stroke="#90A4AE" strokeWidth="2"/>
                <text x="120" y="335" fontSize="12" fill="#3A5068" textAnchor="middle">儲藏室</text>
                <rect x="190" y="300" width="120" height="100" fill="#F5F9FC" stroke="#90A4AE" strokeWidth="2"/>
                <text x="250" y="335" fontSize="12" fill="#3A5068" textAnchor="middle">茶水間</text>
                <rect x="320" y="300" width="160" height="100" fill="#F5F9FC" stroke="#90A4AE" strokeWidth="2"/>
                <text x="400" y="335" fontSize="12" fill="#3A5068" textAnchor="middle">會議 / 衛教室</text>
                <rect x="490" y="300" width="100" height="100" fill="#F5F9FC" stroke="#90A4AE" strokeWidth="2"/>
                <text x="540" y="335" fontSize="12" fill="#3A5068" textAnchor="middle">汙衣間</text>
                <rect x="600" y="300" width="120" height="100" fill="#F5F9FC" stroke="#90A4AE" strokeWidth="2"/>
                <text x="660" y="335" fontSize="12" fill="#3A5068" textAnchor="middle">浴廁</text>
              </g>
              {[100,350,540,680].map(cx => (
                <g key={cx}><circle cx={cx} cy="250" r="11" fill="#E05C5C"/>
                  <text x={cx} y="254" fontSize="12" fontWeight="800" fill="white" textAnchor="middle">F</text></g>
              ))}
              {[220,450,620].map(cx => (
                <g key={cx}><circle cx={cx} cy="220" r="6" fill="#2D7A55"/><circle cx={cx} cy="220" r="3" fill="#A5E1B7"/></g>
              ))}
              <g>
                <rect x="20" y="240" width="22" height="22" fill="#2D7A55"/>
                <text x="31" y="256" fontSize="12" fontWeight="800" fill="white" textAnchor="middle">出</text>
                <text x="11" y="240" fontSize="12" fill="#2D7A55" textAnchor="middle">←</text>
                <text x="2"  y="285" fontSize="11" fontWeight="700" fill="#2D7A55">安全門</text>
              </g>
              <g>
                <rect x="738" y="240" width="22" height="22" fill="#2D7A55"/>
                <text x="749" y="256" fontSize="12" fontWeight="800" fill="white" textAnchor="middle">出</text>
                <text x="769" y="240" fontSize="12" fill="#2D7A55" textAnchor="middle">→</text>
                <text x="738" y="285" fontSize="11" fontWeight="700" fill="#2D7A55">安全門</text>
              </g>
              <path d="M 100 250 L 40 250"  stroke="#E64A19" strokeWidth="3.5" strokeDasharray="10,5" fill="none" markerEnd="url(#arrow)"/>
              <path d="M 350 250 L 100 250" stroke="#E64A19" strokeWidth="3.5" strokeDasharray="10,5" fill="none" markerEnd="url(#arrow)"/>
              <path d="M 540 250 L 760 250" stroke="#E64A19" strokeWidth="3.5" strokeDasharray="10,5" fill="none" markerEnd="url(#arrow)"/>
              <path d="M 440 250 L 540 250" stroke="#E64A19" strokeWidth="3.5" strokeDasharray="10,5" fill="none" markerEnd="url(#arrow)"/>
              <g transform="translate(395, 480)">
                <circle cx="0" cy="0" r="26" fill="#E64A19" stroke="#FFF" strokeWidth="3"/>
                <polygon points="0,-15 4.5,-4.5 16,-4.5 7,3 10,14 0,7 -10,14 -7,3 -16,-4.5 -4.5,-4.5" fill="#FFF8E1"/>
                <text x="55" y="-2" fontSize="13" fontWeight="800" fill="#1A2635">集合點</text>
                <text x="55" y="14" fontSize="11" fill="#7A8FA0">1F 中庭廣場</text>
              </g>
              <text x="14" y="430" fontSize="10" fontWeight="700" fill="#2D7A55">↓ 樓梯</text>
              <text x="745" y="430" fontSize="10" fontWeight="700" fill="#2D7A55">↓ 樓梯</text>
            </svg>
          </div>

          {/* 右：設備 + 圖例 + 緊急聯絡 */}
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
              <div className="ev-card-header">圖例</div>
              <div className="ev-legend">
                {[
                  [<span className="ev-icon-fire">F</span>, '滅火器'],
                  [<span className="ev-icon-light"></span>, '緊急照明'],
                  [<span className="ev-icon-exit">出</span>, '安全門 / 樓梯間'],
                  [<span className="ev-icon-arrow"></span>, '逃生路線方向'],
                  [<span className="ev-icon-meet">★</span>, '集合點'],
                  [<span className="ev-icon-o2">O₂</span>, '氧氣切換閥'],
                ].map(([icon, label]) => (
                  <div key={label} className="ev-legend-row">
                    <span className="ev-legend-icon">{icon}</span>
                    <span className="ev-legend-text">{label}</span>
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
