import { Outlet, NavLink } from 'react-router-dom'
import { useClock } from '../../../hooks/useClock'
import { useMarquee } from '../../../hooks/useMarquee'
import MOCK_DATA from './mockData'
import './W52Layout.css'

const TABS = [
  { path: 'ward',       label: '病室動態' },
  { path: 'care',       label: '照護提醒' },
  { path: 'surgery',    label: '手術資訊' },
  { path: 'exam',       label: '檢查/會診' },
  { path: 'contact',    label: '連絡電話' },
  { path: 'schedule',   label: '排班資訊' },
  { path: 'doctor',     label: '醫師資訊' },
  { path: 'bulletin',   label: '佈告欄' },
  { path: 'evacuation', label: '避難圖' },
  { path: 'handover',   label: '護理交班' },
  { path: 'team',       label: '照護團隊' },
]

export default function W52Layout() {
  const { date, time } = useClock()
  const marquee = useMarquee('W52', '院內感染管制週宣導：請確實執行手部衛生，進出隔離病房務必穿戴適當防護裝備。')

  return (
    <div className="w52-board">
      <header className="page-header">
        <div className="header-left">W52<span className="ward-sub">一般病房</span></div>
        <div className="header-center">
          <div className="staff-block"><div className="staff-label">病房主任</div><div className="staff-name">{MOCK_DATA.HospitalInfo.WardDirector}</div></div>
          <div className="staff-block"><div className="staff-label">單位護理長</div><div className="staff-name">{MOCK_DATA.HospitalInfo.HeadNurse}</div></div>
        </div>
        <div className="header-right">
          <div className="update-label">資料更新時間：剛剛</div>
          <div className="clock-date">{date}</div>
          <div className="clock-time">{time}</div>
        </div>
      </header>

      <div className="announce-bar">
        <span>◆</span>
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
