import BULLETIN_DATA from '../tabsData/bulletinData'
import '../tabsCss/bulletin.css'

function fmtDate(dateStr) {
  const parts = dateStr.split('-')
  return `${parts[1]}/${parts[2]}`
}

function BulletinCard({ item }) {
  const barClass   = item.Priority === '重要' ? 'bl-bar-重要' : (item.Category === '院方' ? 'bl-bar-院方' : 'bl-bar-一般')
  const badgeClass = item.Priority === '重要' ? 'bl-badge-重要' : (item.Category === '院方' ? 'bl-badge-院方' : 'bl-badge-一般')
  return (
    <div className="bl-card">
      <div className={`bl-priority-bar ${barClass}`}></div>
      <div className="bl-card-body">
        <div className="bl-card-top">
          <span className={`bl-badge ${badgeClass}`}>{item.Priority}</span>
          <span className="bl-card-title">{item.Title}</span>
        </div>
        <div className="bl-card-content">{item.Content}</div>
        <div className="bl-card-meta">
          <span className="bl-meta-date">{fmtDate(item.PostedAt)}</span>
          <span className="bl-meta-author">{item.PostedBy}</span>
        </div>
      </div>
    </div>
  )
}

function sortBulletins(items) {
  return [...items].sort((a, b) => {
    if (a.Priority !== b.Priority) return a.Priority === '重要' ? -1 : 1
    return b.PostedAt.localeCompare(a.PostedAt)
  })
}

export default function BulletinTab() {
  const { UnitBulletins, HospBulletins } = BULLETIN_DATA.Data
  const unitSorted = sortBulletins(UnitBulletins)
  const hospSorted = sortBulletins(HospBulletins)

  return (
    <main className="main-content" style={{ padding: 0 }}>
      <div className="bl-panel">
        <div className="bl-title">
          <span className="bl-title-bar"></span>
          佈告欄
        </div>
        <div className="bl-columns">
          <div className="bl-col">
            <div className="bl-col-header">
              急診室公告
              <span className="bl-col-count">{unitSorted.length ? `${unitSorted.length} 則` : ''}</span>
            </div>
            <div className="bl-list">
              {unitSorted.length === 0
                ? <div className="bl-empty">目前無急診室公告</div>
                : unitSorted.map(b => <BulletinCard key={b.BulletinId} item={b} />)
              }
            </div>
          </div>
          <div className="bl-col">
            <div className="bl-col-header">
              院方公告
              <span className="bl-col-count">{hospSorted.length ? `${hospSorted.length} 則` : ''}</span>
            </div>
            <div className="bl-list">
              {hospSorted.length === 0
                ? <div className="bl-empty">目前無院方公告</div>
                : hospSorted.map(b => <BulletinCard key={b.BulletinId} item={b} />)
              }
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
