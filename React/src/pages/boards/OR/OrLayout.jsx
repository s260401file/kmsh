// OrLayout.jsx ── OR 手術室站的版面外框（Layout）
// 角色：負責整站共用的頁首（站別/主任/護理長/時鐘）、跑馬燈公告、底部分頁列，
//       並透過 React Router 的 <Outlet /> 巢狀渲染各分頁內容。
import { NavLink, Outlet } from 'react-router-dom'
import { useClock } from '../../../hooks/useClock'      // 即時日期/時間
import { useMarquee } from '../../../hooks/useMarquee'   // 跑馬燈公告文字
import { useUnitInfo } from '../../../hooks/useUnitInfo'  // 頁首單位資訊（主任/護理，自建可後台編輯）
import MOCK_DATA from './mockData'
import './OrLayout.css'

// 底部分頁設定：path 對應路由、label 為按鈕顯示文字
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
  const marquee = useMarquee('OR', '2026/05/24 手術室公告：今日共安排 7 台手術，OR-05 MVR 預計 13:00 完成，ICU 床位已預留。')
  const info = useUnitInfo('OR')   // 頁首主任/護理（自建；無資料時以 mock 備援）

  return (
    <div className="or-board">
      <header className="page-header">
        <div className="header-left">OR<span className="ward-sub">手術室</span></div>
        <div className="header-center">
          <div className="staff-block">
            <div className="staff-label">{info?.directorLabel || '手術室主任'}</div>
            <div className="staff-name">{info?.directorName || MOCK_DATA.HospitalInfo.WardDirector}</div>
          </div>
          <div className="staff-block">
            <div className="staff-label">{info?.headNurseLabel || '護理長'}</div>
            <div className="staff-name">{info?.headNurseName || MOCK_DATA.HospitalInfo.HeadNurse}</div>
          </div>
        </div>
        <div className="header-right">
          <div className="update-label">資料更新時間：剛剛</div>
          <div className="clock-date">{date}</div>
          <div className="clock-time">{time}</div>
        </div>
      </header>

      <div className="announce-bar">
        <span className="announce-icon">🔔</span>
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
