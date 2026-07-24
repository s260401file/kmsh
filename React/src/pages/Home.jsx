// Home.jsx — 系統入口首頁
// 角色：醫院風格封面，提供四站白板（W52／ICU／OR／ER）與管理後台之入口。
import { useNavigate } from 'react-router-dom'
import './Home.css'

// 四站入口（順序：W52 → ICU → OR → ER；accent 延用各看板色系）
const STATIONS = [
  { code: 'W52', name: '一般病房', path: '/w52', accent: '#2D7A55' },
  { code: 'ICU', name: '加護病房', path: '/icu', accent: '#1565C0' },
  { code: 'OR',  name: '手術室',   path: '/or',  accent: '#B8860B' },
  { code: 'ER',  name: '急診室',   path: '/er',  accent: '#C62828' },
]

// 頁首白板標記（重繪 standalone 縮圖意象，非拷貝）
function BoardMark() {
  return (
    <svg className="home-mark" viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" rx="16" fill="#0e5238" />
      <rect x="22" y="26" width="56" height="48" rx="4" fill="#ffffff" />
      <rect x="28" y="32" width="20" height="14" rx="2" fill="#15704c" />
      <rect x="52" y="32" width="20" height="14" rx="2" fill="#d8e8df" />
      <rect x="28" y="50" width="20" height="14" rx="2" fill="#d8e8df" />
      <rect x="52" y="50" width="20" height="14" rx="2" fill="#dc2626" />
      <rect x="22" y="77" width="56" height="3" rx="1.5" fill="#0b4e33" />
    </svg>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const go = path => navigate(path)
  const onKey = path => e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(path) } }

  return (
    <div className="home-wrap">
      <header className="home-header">
        <BoardMark />
        <div className="home-titles">
          <h1 className="home-title">高雄市立民生醫院</h1>
          <p className="home-sub">護理科電子白板系統</p>
        </div>
      </header>

      <main className="home-main">
        <div className="home-grid">
          {STATIONS.map(s => (
            <div key={s.code} className="home-card" style={{ '--accent': s.accent }}
              role="button" tabIndex={0} onClick={() => go(s.path)} onKeyDown={onKey(s.path)}>
              <span className="home-bar" />
              <span className="home-code">{s.code}</span>
              <span className="home-name">{s.name}</span>
              <span className="home-enter">進入看板 →</span>
            </div>
          ))}
        </div>

        <button className="home-admin" onClick={() => go('/admin')}>管理後台 →</button>
      </main>

      <footer className="home-foot">高雄市立民生醫院　護理科電子白板系統</footer>
    </div>
  )
}
