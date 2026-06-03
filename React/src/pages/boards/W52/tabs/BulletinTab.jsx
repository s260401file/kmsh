import BULLETIN_DATA from '../tabsData/bulletinData'
import '../tabsCss/bulletin.css'

function BulletinList({ items, barClass, badgeClass }) {
  return items.map(b => (
    <div key={b.BulletinId} className="bl-card">
      <div className={`bl-priority-bar ${barClass(b.Priority)}`} />
      <div className="bl-card-body">
        <div className="bl-card-top">
          <span className={`bl-badge ${badgeClass(b.Priority)}`}>{b.Priority}</span>
          <span className="bl-card-title">{b.Title}</span>
        </div>
        <div className="bl-card-content">{b.Content}</div>
        <div className="bl-card-meta">
          <span className="bl-meta-date">{b.PostedAt}</span>
          <span className="bl-meta-author">{b.PostedBy}</span>
        </div>
      </div>
    </div>
  ))
}

export default function BulletinTab() {
  const { UnitBulletins, HospBulletins } = BULLETIN_DATA.Data
  return (
    <main className="main-content">
      <div className="bl-panel">
        <div className="bl-title">
          <span className="bl-title-bar"></span>
          佈告欄
        </div>
        <div className="bl-columns">
          <div className="bl-col">
            <div className="bl-col-header">
              護理站公告
              <span className="bl-col-count">{UnitBulletins.length} 則</span>
            </div>
            <div className="bl-list">
              <BulletinList
                items={UnitBulletins}
                barClass={p => p === '重要' ? 'bl-bar-重要' : 'bl-bar-一般'}
                badgeClass={p => p === '重要' ? 'bl-badge-重要' : 'bl-badge-一般'}
              />
            </div>
          </div>
          <div className="bl-col">
            <div className="bl-col-header">
              院方公告
              <span className="bl-col-count">{HospBulletins.length} 則</span>
            </div>
            <div className="bl-list">
              <BulletinList
                items={HospBulletins}
                barClass={p => p === '重要' ? 'bl-bar-重要' : 'bl-bar-院方'}
                badgeClass={p => p === '重要' ? 'bl-badge-重要' : 'bl-badge-院方'}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
