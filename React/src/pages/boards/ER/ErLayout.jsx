// ErLayout.jsx ── ER 急診站的版面外框（Layout）
// 角色：負責整個急診白板的共用框架——頁首（站別、急診主任/護理長、時鐘）、
//       跑馬燈公告列、底部分頁按鈕，內容區以 <Outlet/> 嵌入各分頁子頁面。
import { NavLink, Outlet } from 'react-router-dom'
import { useClock } from '../../../hooks/useClock'      // 即時時鐘 hook（提供 date / time）
import { useMarquee } from '../../../hooks/useMarquee'   // 跑馬燈公告 hook
import MOCK_DATA from './mockData'                       // 假資料來源（頁首的主任/護理長名單等）
import './ErLayout.css'

// 底部分頁設定：path 對應巢狀路由、label 為顯示文字（病室動態為預設首頁）
const TABS = [
  { path: 'ward',          label: '病室動態' },
  { path: 'exam',          label: '檢查/會診' },
  { path: 'mass-casualty', label: '大量傷患' },
  { path: 'contact',       label: '連絡電話' },
  { path: 'bulletin',      label: '佈告欄' },
  { path: 'evacuation',    label: '避難圖' },
]

export default function ErLayout() {
  const { date, time } = useClock()
  // 跑馬燈：第一參數為站別代碼，第二參數為預設公告文字
  const marquee = useMarquee('ER', '2026/05/24 急診分流提醒：目前二級重症病人待床中，ICU 床位有限，請優先處理急救室病人轉出作業。')

  return (
    <div className="er-board">
      {/* 頁首：左為站別、中為主任/護理長、右為更新時間與時鐘 */}
      <header className="page-header">
        <div className="header-left">ER<span className="ward-sub">急診室</span></div>
        <div className="header-center">
          <div className="staff-block">
            <div className="staff-label">急診主任</div>
            <div className="staff-name">{MOCK_DATA.HospitalInfo.WardDirector}</div>
          </div>
          <div className="staff-block">
            <div className="staff-label">護理長</div>
            <div className="staff-name">{MOCK_DATA.HospitalInfo.HeadNurse}</div>
          </div>
        </div>
        <div className="header-right">
          <div className="update-label">資料更新時間：剛剛</div>
          <div className="clock-date">{date}</div>
          <div className="clock-time">{time}</div>
        </div>
      </header>

      {/* 公告跑馬燈列 */}
      <div className="announce-bar">
        <span className="announce-icon">🚨</span>
        <div className="announce-track">
          <span className="announce-text">{marquee}</span>
        </div>
      </div>

      {/* 各分頁子頁面的內容由此處嵌入（巢狀路由出口）*/}
      <Outlet />

      {/* 底部分頁切換列：依 TABS 產生，isActive 時加 active 樣式 */}
      <nav className="bottom-tabs">
        {TABS.map(t => (
          <NavLink
            key={t.path}
            to={t.path}
            className={({ isActive }) => `tab-btn${isActive ? ' active' : ''}`}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
