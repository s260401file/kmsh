// BulletinTab.jsx — ICU 佈告欄分頁
// 角色：左右雙欄顯示「護理站公告」與「院方公告」，內容由 textApi 後端取得。
//       公告依優先序（重要在前）再依建立時間新到舊排序；可標示重要/院方/一般三種樣式。
import { useState, useEffect } from 'react'
import * as textApi from '../../../../services/textApi'
import '../tabsCss/bulletin.css'

// 將 ISO 日期字串格式化為「MM/DD」
function fmtDate(isoStr) {
  if (!isoStr) return ''
  const d = isoStr.slice(0, 10)
  return `${d.slice(5, 7)}/${d.slice(8, 10)}`
}

// 公告排序：重要優先，其次依建立時間由新到舊
function sortItems(items) {
  return [...items].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === '重要' ? -1 : 1
    return (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
  })
}

// 單則公告卡片。props：item 公告資料、isHosp 是否為院方公告（影響色條/徽章樣式）
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
  const [unitItems, setUnitItems] = useState([]) // 護理站公告（ICU 單位）
  const [hospItems, setHospItems] = useState([]) // 院方公告（全院 ALL）

  // 掛載時各取一次公告；單位公告查 ICU，院方公告查 ALL，失敗則靜默保持空陣列
  useEffect(() => {
    textApi.getAll('ICU', 'bulletin_unit').then(d => setUnitItems(sortItems(d ?? []))).catch(() => {})
    textApi.getAll('ALL', 'bulletin_hosp').then(d => setHospItems(sortItems(d ?? []))).catch(() => {})
  }, [])

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
