// BulletinTab：OR 手術室站「佈告欄」分頁
// 雙欄呈現「手術室公告」（單位）與「院方公告」（全院）；重要公告優先排序、樣式加強。
// 資料透過 useBulletin 由後端 API 取得（非 mockData）；定時輪詢、免 F5 自動更新。
import { useBulletin } from '../../../../hooks/useBulletin'
import '../tabsCss/bulletin.css'

// 將 ISO 日期字串格式化為 MM/DD
function fmtDate(isoStr) {
  if (!isoStr) return ''
  const d = isoStr.slice(0, 10)
  return `${d.slice(5, 7)}/${d.slice(8, 10)}`
}

// 單則公告卡片：依重要/院方/一般決定左側色條與徽章樣式
function BulletinCard({ item, isHosp }) {
  const barClass   = item.priority === '重要' ? 'bl-bar-重要' : (isHosp ? 'bl-bar-院方' : 'bl-bar-一般')
  const badgeClass = item.priority === '重要' ? 'bl-badge-重要' : (isHosp ? 'bl-badge-院方' : 'bl-badge-一般')
  return (
    <div className="bl-card">
      <div className={`bl-priority-bar ${barClass}`}></div>
      <div className="bl-card-body">
        <div className="bl-card-top">
          <span className={`bl-badge ${badgeClass}`}>{item.priority ?? '一般'}</span>
          <span className="bl-card-title">{item.title}</span>
        </div>
        <div className="bl-card-content">{item.content}</div>
        <div className="bl-card-meta">
          <span className="bl-meta-date">{fmtDate(item.createdAt)}</span>
        </div>
      </div>
    </div>
  )
}

export default function BulletinTab() {
  // 定時輪詢手術室公告（OR / bulletin_unit）與院方公告（ALL / bulletin_hosp）；免 F5 自動更新
  const { unitItems, hospItems } = useBulletin('OR')

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
              手術室公告
              <span className="bl-col-count">{unitItems.length ? `${unitItems.length} 則` : ''}</span>
            </div>
            <div className="bl-list">
              {unitItems.length === 0
                ? <div className="bl-empty">目前無手術室公告</div>
                : unitItems.map(b => <BulletinCard key={b.id} item={b} isHosp={false} />)
              }
            </div>
          </div>
          <div className="bl-col">
            <div className="bl-col-header">
              院方公告
              <span className="bl-col-count">{hospItems.length ? `${hospItems.length} 則` : ''}</span>
            </div>
            <div className="bl-list">
              {hospItems.length === 0
                ? <div className="bl-empty">目前無院方公告</div>
                : hospItems.map(b => <BulletinCard key={b.id} item={b} isHosp={true} />)
              }
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
