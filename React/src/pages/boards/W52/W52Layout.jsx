// W52Layout：W52 一般病房站的外框版面元件
// 角色：固定頂部 header（站名/主管/時鐘）、跑馬燈公告，下方分頁導覽列，
//       中間 <Outlet/> 由 React Router 依路由帶入各分頁內容（病室動態、照護提醒…）。
import { Outlet, NavLink } from 'react-router-dom'
import { useClock } from '../../../hooks/useClock'       // 時鐘 hook：回傳目前日期與時間字串
import { useMarquee } from '../../../hooks/useMarquee'   // 跑馬燈 hook：回傳該站要捲動的公告文字
import { useUnitInfo } from '../../../hooks/useUnitInfo'  // 頁首單位資訊（主任/護理，自建可後台編輯）
import MOCK_DATA from './mockData'                        // 本站假資料（床位…），待接 API
import './W52Layout.css'

// 底部分頁設定：path 對應子路由、label 為顯示文字（與 TABS 順序即為頁籤排列順序）
const TABS = [
  { path: 'ward',       label: '病室動態' },
  { path: 'care',       label: '照護提醒' },
  { path: 'surgery',    label: '手術資訊' },
  { path: 'exam',       label: '檢查/會診' },
  { path: 'contact',    label: '連絡資訊' },
  { path: 'schedule',   label: '排班資訊' },
  { path: 'doctor',     label: '醫師資訊' },
  { path: 'bulletin',   label: '佈告欄' },
  { path: 'evacuation', label: '避難圖' },
  { path: 'handover',   label: '護理交班' },
  { path: 'team',       label: '照護團隊' },
]

export default function W52Layout() {
  const { date, time } = useClock()
  // 跑馬燈內容：優先取後台設定的 W52 公告，第二參數為無資料時的預設文字
  const marquee = useMarquee('W52', '院內感染管制週宣導：請確實執行手部衛生，進出隔離病房務必穿戴適當防護裝備。')
  const info = useUnitInfo('W52')   // 頁首主任/護理（自建；無資料時以 mock 備援）

  return (
    <div className="w52-board">
      {/* 頂部 header：左站名、中為病房主任/護理長、右為更新時間與時鐘 */}
      <header className="page-header">
        <div className="header-left">W52<span className="ward-sub">一般病房</span></div>
        <div className="header-center">
          <div className="staff-block"><div className="staff-label">{info?.directorLabel || '病房主任'}</div><div className="staff-name">{info?.directorName || MOCK_DATA.HospitalInfo.WardDirector}</div></div>
          <div className="staff-block"><div className="staff-label">{info?.headNurseLabel || '單位護理長'}</div><div className="staff-name">{info?.headNurseName || MOCK_DATA.HospitalInfo.HeadNurse}</div></div>
        </div>
        <div className="header-right">
          <div className="update-label">資料更新時間：剛剛</div>
          <div className="clock-date">{date}</div>
          <div className="clock-time">{time}</div>
        </div>
      </header>

      {/* 跑馬燈公告列 */}
      <div className="announce-bar">
        <span className="announce-icon">📢</span>
        <div className="announce-track">
          <span className="announce-text">{marquee}</span>
        </div>
      </div>

      {/* 分頁內容出口：依目前子路由渲染對應分頁 */}
      <Outlet />

      {/* 底部分頁列：以 NavLink 切換子路由，active 樣式標示目前分頁 */}
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
