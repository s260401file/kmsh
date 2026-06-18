// BulletinTab：佈告欄分頁
// 角色：左欄為本站護理站公告（useBulletin 取 W52/bulletin_unit），右欄為全院公告（ALL/bulletin_hosp）。
//       此分頁實接後台文字 API（非假資料），重要公告置頂、同級依建立時間新到舊排序；定時輪詢、免 F5 自動更新。
import { useBulletin } from '../../../../hooks/useBulletin'
import '../tabsCss/bulletin.css'

// 將 ISO 日期字串轉成 MM/DD 顯示
function fmtDate(isoStr) {
  if (!isoStr) return ''
  const d = isoStr.slice(0, 10)
  return `${d.slice(5, 7)}/${d.slice(8, 10)}`
}

// 單則公告卡：依優先序與是否院方公告決定色條/徽章樣式
function BulletinCard({ item, isHosp }) {
  const barClass   = item.priority === '重要' ? 'bl-bar-重要' : (isHosp ? 'bl-bar-院方' : 'bl-bar-一般')
  const badgeClass = item.priority === '重要' ? 'bl-badge-重要' : (isHosp ? 'bl-badge-院方' : 'bl-badge-一般')
  return (
    <div className="bl-card">
      <div className={`bl-priority-bar ${barClass}`} />
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
  // 定時輪詢護理站公告（W52 / bulletin_unit）與全院公告（ALL / bulletin_hosp）；免 F5 自動更新
  const { unitItems, hospItems } = useBulletin('W52')

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
              <span className="bl-col-count">{unitItems.length ? `${unitItems.length} 則` : ''}</span>
            </div>
            <div className="bl-list">
              {unitItems.length === 0
                ? <div className="bl-empty">目前無護理站公告</div>
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
