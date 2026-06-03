import BULLETIN_DATA from '../tabsData/bulletinData'
import '../tabsCss/bulletin.css'

function BulletinList({ items, barFn, badgeFn }) {
  return items.map(b => (
    <div key={b.bulletinId} className="bl-card">
      <div className={`bl-priority-bar ${barFn(b.priority)}`} />
      <div className="bl-card-body">
        <div className="bl-card-top">
          <span className={`bl-badge ${badgeFn(b.priority)}`}>{b.priority}</span>
          <span className="bl-card-title">{b.title}</span>
        </div>
        <div className="bl-card-content">{b.content}</div>
        <div className="bl-card-meta">
          <span className="bl-meta-date">{b.postedAt}</span>
          <span className="bl-meta-author">{b.postedBy}</span>
        </div>
      </div>
    </div>
  ))
}

export default function BulletinTab() {
  const { unitBulletins, hospBulletins } = BULLETIN_DATA.data
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
              護理站公告 <span className="bl-col-count">{unitBulletins.length} 則</span>
            </div>
            <div className="bl-list">
              <BulletinList
                items={unitBulletins}
                barFn={p => p === '重要' ? 'bl-bar-重要' : 'bl-bar-一般'}
                badgeFn={p => p === '重要' ? 'bl-badge-重要' : 'bl-badge-一般'}
              />
            </div>
          </div>
          <div className="bl-col">
            <div className="bl-col-header">
              院方公告 <span className="bl-col-count">{hospBulletins.length} 則</span>
            </div>
            <div className="bl-list">
              <BulletinList
                items={hospBulletins}
                barFn={p => p === '重要' ? 'bl-bar-重要' : 'bl-bar-院方'}
                badgeFn={p => p === '重要' ? 'bl-badge-重要' : 'bl-badge-院方'}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
