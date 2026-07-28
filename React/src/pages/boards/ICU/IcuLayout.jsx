// IcuLayout.jsx ── ICU 加護病房站的版面外框（Layout）
// 角色：提供頂部表頭（站別、主任/護理長、時鐘）、跑馬燈公告、底部分頁列，
//       中央以 <Outlet/> 巢狀渲染各分頁（病室動態 / 抗生素 / 管路 …）。
import { Outlet, NavLink } from 'react-router-dom'
import { useClock } from '../../../hooks/useClock'      // 即時日期/時間 Hook
import { useMarquee } from '../../../hooks/useMarquee'  // 跑馬燈文字 Hook
import { useUnitInfo } from '../../../hooks/useUnitInfo' // 頁首單位資訊（主任/護理，自建可後台編輯）
import MOCK_DATA from './mockData'
import './IcuLayout.css'

// 底部分頁定義：path 對應巢狀路由、label 為顯示中文（順序即顯示順序）
const TABS = [
  { path: 'ward',       label: '病室動態' },
  { path: 'antibiotic', label: '抗生素' },
  { path: 'tube',       label: '管路' },
  { path: 'surgery',    label: '手術資訊' },
  { path: 'exam',       label: '檢查/會診' },
  { path: 'contact',    label: '連絡電話' },
  { path: 'bulletin',   label: '佈告欄' },
  { path: 'evacuation', label: '避難圖' },
]

export default function IcuLayout() {
  const { date, time } = useClock()
  // 跑馬燈：第一參數為單位代碼，第二參數為無資料時的預設文字
  const marquee = useMarquee('ICU', '院內感染管制週宣導：請確實執行手部衛生，進出隔離病房務必穿戴適當防護裝備。')
  const info = useUnitInfo('ICU')   // 頁首主任/護理（自建）
  // 有存過紀錄→用存的值（空白即空白、不套 mock）；從未設定(null)→用預設。整格皆空則不顯示。
  const dLbl = info ? info.directorLabel : '病房主任'
  const dNam = info ? info.directorName : MOCK_DATA.hospitalInfo.wardDirector
  const hLbl = info ? info.headNurseLabel : '單位護理長'
  const hNam = info ? info.headNurseName : MOCK_DATA.hospitalInfo.headNurse

  return (
    <div className="icu-board">
      {/* 頂部表頭：左為站別、中為主管資訊、右為更新時間與時鐘 */}
      <header className="page-header">
        <div className="header-left">ICU</div>
        <div className="header-center">
          {(dLbl || dNam) && <div className="staff-block"><div className="staff-label">{dLbl}</div><div className="staff-name">{dNam}</div></div>}
          {(hLbl || hNam) && <div className="staff-block"><div className="staff-label">{hLbl}</div><div className="staff-name">{hNam}</div></div>}
        </div>
        <div className="header-right">
          <div className="clock-date">{date}</div>
          <div className="clock-time">{time}</div>
        </div>
      </header>

      {/* 跑馬燈公告列 */}
      <div className="announce-bar">
        <span className="announce-icon">⚠️</span>
        <div className="announce-track">
          <span className="announce-text">{marquee}</span>
        </div>
      </div>

      {/* 各分頁內容由巢狀路由注入此處 */}
      <Outlet />

      {/* 底部分頁切換列：以 NavLink 標示目前作用中的分頁 */}
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
