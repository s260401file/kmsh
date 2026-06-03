import EVACUATION_DATA from '../tabsData/evacuationData'
import '../tabsCss/evacuation.css'

export default function EvacuationTab() {
  const { evacPlan, equipment, emergencyContacts } = EVACUATION_DATA.data
  return (
    <main className="main-content">
      <div className="ev-panel">
        <div className="ev-title">
          <span className="ev-title-bar"></span>
          避難圖
          <span className="ev-title-meta">{evacPlan.floorNo} — {evacPlan.wardName}</span>
        </div>
        <div className="ev-columns">
          {/* 左：ICU 3F/4F 平面圖 SVG */}
          <div className="ev-map-wrap">
            <svg viewBox="0 0 800 580" className="ev-svg" preserveAspectRatio="xMidYMid meet">
              <defs>
                <marker id="arrow-icu" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#E64A19"/>
                </marker>
              </defs>
              {/* 北方標示 */}
              <g transform="translate(740,30)"><circle cx="0" cy="0" r="18" fill="none" stroke="#3A5068" strokeWidth="1.5"/><text x="0" y="-22" fontSize="11" fill="#3A5068" textAnchor="middle">N</text><path d="M 0 -12 L 5 8 L 0 4 L -5 8 z" fill="#E64A19"/></g>
              {/* 4F 標題 */}
              <rect x="30" y="20" width="680" height="240" fill="#FAFCFD" stroke="#2C3E50" strokeWidth="3"/>
              <text x="45" y="42" fontSize="14" fontWeight="800" fill="#2D7A55">4F — 加護病房（20床）</text>
              {/* 4F 護理站 */}
              <rect x="310" y="50" width="120" height="90" fill="#E8F5EE" stroke="#2D7A55" strokeWidth="2"/>
              <text x="370" y="85" fontSize="13" fontWeight="800" fill="#2D7A55" textAnchor="middle">護理站</text>
              <circle cx="370" cy="125" r="9" fill="#FFF" stroke="#1565C0" strokeWidth="2"/><text x="370" y="129" fontSize="11" fontWeight="800" fill="#1565C0" textAnchor="middle">O₂</text>
              {/* 4F 床位區塊 */}
              <rect x="50" y="50" width="240" height="90" fill="#F5F9FC" stroke="#90A4AE" strokeWidth="2"/>
              <text x="170" y="75" fontSize="13" fontWeight="700" fill="#3A5068" textAnchor="middle">Group A</text>
              <text x="170" y="90" fontSize="11" fill="#7A8FA0" textAnchor="middle">F4-01~F4-11</text>
              <rect x="450" y="50" width="240" height="90" fill="#F5F9FC" stroke="#90A4AE" strokeWidth="2"/>
              <text x="570" y="75" fontSize="13" fontWeight="700" fill="#3A5068" textAnchor="middle">Group B</text>
              <text x="570" y="90" fontSize="11" fill="#7A8FA0" textAnchor="middle">F4-12~F4-22</text>
              {/* 4F 走廊 */}
              <rect x="50" y="160" width="640" height="40" fill="#FFFBF0" stroke="#E0D5B5" strokeWidth="1"/>
              <text x="370" y="185" fontSize="12" fill="#9C8C5A" textAnchor="middle" letterSpacing="2">走　廊</text>
              {/* 4F 逃生 */}
              <rect x="15" y="165" width="22" height="22" fill="#2D7A55"/><text x="26" y="181" fontSize="12" fontWeight="800" fill="white" textAnchor="middle">出</text>
              <rect x="703" y="165" width="22" height="22" fill="#2D7A55"/><text x="714" y="181" fontSize="12" fontWeight="800" fill="white" textAnchor="middle">出</text>
              <path d="M 100 185 L 37 185" stroke="#E64A19" strokeWidth="3" strokeDasharray="8,4" fill="none" markerEnd="url(#arrow-icu)"/>
              <path d="M 500 185 L 725 185" stroke="#E64A19" strokeWidth="3" strokeDasharray="8,4" fill="none" markerEnd="url(#arrow-icu)"/>
              {/* 4F 滅火器 */}
              <circle cx="100" cy="180" r="10" fill="#E05C5C"/><text x="100" y="184" fontSize="11" fontWeight="800" fill="white" textAnchor="middle">F</text>
              <circle cx="450" cy="180" r="10" fill="#E05C5C"/><text x="450" y="184" fontSize="11" fontWeight="800" fill="white" textAnchor="middle">F</text>
              <circle cx="630" cy="180" r="10" fill="#E05C5C"/><text x="630" y="184" fontSize="11" fontWeight="800" fill="white" textAnchor="middle">F</text>
              {/* 4F 隔離房 */}
              <rect x="50" y="210" width="80" height="45" fill="#FFEBEB" stroke="#E05C5C" strokeWidth="2"/>
              <text x="90" y="228" fontSize="10" fontWeight="700" fill="#AD1457" textAnchor="middle">隔離</text>
              <text x="90" y="242" fontSize="10" fill="#AD1457" textAnchor="middle">F4-07/15/16</text>

              {/* 3F 標題 */}
              <rect x="30" y="300" width="680" height="180" fill="#FAFCFD" stroke="#2C3E50" strokeWidth="3"/>
              <text x="45" y="322" fontSize="14" fontWeight="800" fill="#2D7A55">3F — 加護病房（5床）</text>
              {/* 3F 護理站 */}
              <rect x="310" y="330" width="120" height="75" fill="#E8F5EE" stroke="#2D7A55" strokeWidth="2"/>
              <text x="370" y="362" fontSize="13" fontWeight="800" fill="#2D7A55" textAnchor="middle">護理站</text>
              <circle cx="370" cy="395" r="9" fill="#FFF" stroke="#1565C0" strokeWidth="2"/><text x="370" y="399" fontSize="11" fontWeight="800" fill="#1565C0" textAnchor="middle">O₂</text>
              {/* 3F 床位 */}
              <rect x="50" y="330" width="230" height="75" fill="#F5F9FC" stroke="#90A4AE" strokeWidth="2"/>
              <text x="165" y="360" fontSize="13" fontWeight="700" fill="#3A5068" textAnchor="middle">F3-01 ~ F3-05</text>
              {/* 3F 走廊 */}
              <rect x="50" y="425" width="640" height="35" fill="#FFFBF0" stroke="#E0D5B5" strokeWidth="1"/>
              <text x="370" y="448" fontSize="12" fill="#9C8C5A" textAnchor="middle" letterSpacing="2">走　廊</text>
              {/* 3F 逃生 */}
              <rect x="15" y="430" width="22" height="22" fill="#2D7A55"/><text x="26" y="446" fontSize="12" fontWeight="800" fill="white" textAnchor="middle">出</text>
              <path d="M 100 442 L 37 442" stroke="#E64A19" strokeWidth="3" strokeDasharray="8,4" fill="none" markerEnd="url(#arrow-icu)"/>
              {/* 3F 滅火器 */}
              <circle cx="100" cy="442" r="10" fill="#E05C5C"/><text x="100" y="446" fontSize="11" fontWeight="800" fill="white" textAnchor="middle">F</text>
              <circle cx="500" cy="442" r="10" fill="#E05C5C"/><text x="500" y="446" fontSize="11" fontWeight="800" fill="white" textAnchor="middle">F</text>
              {/* 集合點 */}
              <g transform="translate(370,530)">
                <circle cx="0" cy="0" r="24" fill="#E64A19" stroke="#FFF" strokeWidth="3"/>
                <polygon points="0,-13 4,-4 14,-4 6,2 9,12 0,6 -9,12 -6,2 -14,-4 -4,-4" fill="#FFF8E1"/>
                <text x="50" y="-2" fontSize="12" fontWeight="800" fill="#1A2635">集合點</text>
                <text x="50" y="13" fontSize="11" fill="#7A8FA0">1F 門診廣場</text>
              </g>
              <text x="14" y="500" fontSize="10" fontWeight="700" fill="#2D7A55">↓ 樓梯</text>
            </svg>
          </div>

          {/* 右側資訊 */}
          <div className="ev-side">
            <div className="ev-card">
              <div className="ev-card-header">避難設備清單 <span className="ev-card-count">{equipment.length} 項</span></div>
              <div className="ev-equip-list">
                {equipment.map(e => (
                  <div key={e.equipmentId} className="ev-equip-row">
                    <span className="ev-equip-name">{e.equipmentName}</span>
                    <span className="ev-equip-loc">{e.location}</span>
                    {e.quantity > 1 && <span className="ev-equip-qty">×{e.quantity}</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="ev-card">
              <div className="ev-card-header">圖例</div>
              <div className="ev-legend">
                {[
                  [<span className="ev-icon-fire">F</span>, '滅火器'],
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
                {emergencyContacts.map(c => (
                  <div key={c.contactId} className="ev-contact-row">
                    <span className="ev-contact-name">{c.name}</span>
                    <span className="ev-contact-ext">{c.extension}</span>
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
