import { NavLink, Outlet } from 'react-router-dom'
import { useClock } from '../../../hooks/useClock'
import { useMarquee } from '../../../hooks/useMarquee'
import MOCK_DATA from './mockData'
import './OrLayout.css'

const TABS = [
  { path: 'ward',       label: '手術動態' },
  { path: 'schedule',   label: '手術派班' },
  { path: 'handover',   label: '特殊交班' },
  { path: 'contact',    label: '連絡電話' },
  { path: 'bulletin',   label: '佈告欄' },
  { path: 'evacuation', label: '避難圖' },
]

export default function OrLayout() {
  const { date, time } = useClock()
  const marquee = useMarquee('OR', '2026/05/24 手術室公告：今日共安排 7 台手術，OR-04 MVR 預計 13:00 完成，ICU 床位已預留。')

  return (
    <div className="or-board">
      <header className="page-header">
        <div className="header-left">OR<span className="ward-sub">手術室</span></div>
        <div className="header-center">
          <div className="staff-block">
            <div className="staff-label">手術室主任</div>
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
        <span>🔔</span>
        <span>{marquee}</span>
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
