import { NavLink, Outlet } from 'react-router-dom'
import { useClock } from '../../../hooks/useClock'
import { useMarquee } from '../../../hooks/useMarquee'
import MOCK_DATA from './mockData'
import './ErLayout.css'

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
  const marquee = useMarquee('ER', '2026/05/24 急診分流提醒：目前二級重症病人待床中，ICU 床位有限，請優先處理急救室病人轉出作業。')

  return (
    <div className="er-board">
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

      <div className="announce-bar">
        <span className="announce-icon">🚨</span>
        <div className="announce-track">
          <span className="announce-text">{marquee}</span>
        </div>
      </div>

      <Outlet />

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
