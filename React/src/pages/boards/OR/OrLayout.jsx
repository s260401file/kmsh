// OrLayout.jsx ── OR 手術室站的版面外框（Layout）
// 角色：負責整站共用的頁首（站別/主任/護理長/時鐘）、跑馬燈公告、底部分頁列，
//       並透過 React Router 的 <Outlet /> 巢狀渲染各分頁內容。
import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useClock } from '../../../hooks/useClock'      // 即時日期/時間
import { useMarquee } from '../../../hooks/useMarquee'   // 跑馬燈公告文字
import { useUnitInfo } from '../../../hooks/useUnitInfo'  // 頁首單位資訊（主任/護理，自建可後台編輯）
import OrViewGate from './OrViewGate'                    // 檢視密碼鍵盤門檻
import MOCK_DATA from './mockData'
import './OrLayout.css'

const UNLOCK_KEY = 'or_view_unlock_until'                // 解鎖到期 timestamp（per-device；存 sessionStorage）
const clampMins = v => Math.min(10, Math.max(1, Number(v) || 3))   // 有效分鐘 1–10，未設＝3

// 底部分頁設定：path 對應路由、label 為按鈕顯示文字
const TABS = [
  { path: 'ward',       label: '手術動態' },
  { path: 'schedule',   label: '手術派班' },
  { path: 'handover',   label: '特殊交班' },
  { path: 'contact',    label: '連絡電話' },
  { path: 'bulletin',   label: '佈告欄' },
  { path: 'evacuation', label: '避難圖' },
  { path: 'surgerylist', label: '手術清單' },
  { path: 'assist', label: '各科協助業務' },
]

export default function OrLayout() {
  const { date, time } = useClock()
  const marquee = useMarquee('OR', '2026/05/24 手術室公告：今日共安排 7 台手術，OR-05 MVR 預計 13:00 完成，ICU 床位已預留。')
  const info = useUnitInfo('OR')   // 頁首主任/護理（自建）＋檢視密碼設定
  // 有存過紀錄→用存的值（空白即空白、不套 mock）；從未設定(null)→用預設。整格皆空則不顯示。
  const dLbl = info ? info.directorLabel : '手術室主任'
  const dNam = info ? info.directorName : MOCK_DATA.HospitalInfo.WardDirector
  const hLbl = info ? info.headNurseLabel : '護理長'
  const hNam = info ? info.headNurseName : MOCK_DATA.HospitalInfo.HeadNurse

  // ── 檢視密碼門檻：第一頁(手術動態/ward)免密；其餘頁若有設密碼且未解鎖，以鍵盤取代內容 ──
  const loc = useLocation()
  const seg = loc.pathname.replace(/\/+$/, '').split('/').pop()
  const isFirst = seg === 'or' || seg === 'ward' || seg === ''   // /or 或 /or/ward ＝第一頁
  const pwd = info && info.viewPassword ? String(info.viewPassword) : ''
  const mins = clampMins(info?.viewTimeoutMinutes)
  const [until, setUntil] = useState(() => Number(sessionStorage.getItem(UNLOCK_KEY) || 0))
  const unlocked = Date.now() < until    // 每次 render（時鐘每秒）重算；逾時自動再上鎖
  const doUnlock = () => { const u = Date.now() + mins * 60000; sessionStorage.setItem(UNLOCK_KEY, String(u)); setUntil(u) }

  // 內容區：第一頁/未設密碼/已解鎖→正常內容；載入中→佔位（避免內容閃現）；否則→鍵盤門檻
  const content =
    (isFirst || (info !== null && !pwd) || unlocked) ? <Outlet />
    : info === null ? <div className="or-gate-loading">載入中…</div>
    : <OrViewGate expected={pwd} onUnlock={doUnlock} />

  return (
    <div className="or-board">
      <header className="page-header">
        <div className="header-left">OR<span className="ward-sub">手術室</span></div>
        <div className="header-center">
          {(dLbl || dNam) && <div className="staff-block">
            <div className="staff-label">{dLbl}</div>
            <div className="staff-name">{dNam}</div>
          </div>}
          {(hLbl || hNam) && <div className="staff-block">
            <div className="staff-label">{hLbl}</div>
            <div className="staff-name">{hNam}</div>
          </div>}
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

      {content}

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
