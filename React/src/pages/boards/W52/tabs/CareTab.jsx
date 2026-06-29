// CareTab：照護提醒分頁
// 角色：以清單列出各床的照護提醒，每筆含優先序色條、床號/病人、類別標籤（術後/感控/管路…）、
//       提醒內容、提醒時間與責任護理師。
// 資料來源：自建表（/api/Board/W52/care-reminder）；床/病人後台手填、責任護理師掛人員管理。免 F5 輪詢。
import { usePolling } from '../../../../hooks/usePolling'
import * as wardApi from '../../../../services/wardApi'
import { CENSUS_MS } from '../../../../config/pollingConfig'
import '../tabsCss/care.css'

export default function CareTab() {
  const { data } = usePolling(() => wardApi.getCareReminder('W52'), { intervalMs: CENSUS_MS, deps: ['W52-care'] })
  const items = data ?? []   // 提醒項目陣列（後端已排序：未完成優先、再依排序）
  return (
    <main className="main-content">
      <div className="care-panel">
        <div className="care-title">
          <span className="care-title-bar"></span>
          照護提醒
        </div>
        <div className="care-list">
          {items.length === 0
            ? <div style={{ padding: '40px', textAlign: 'center', color: '#90A4AE' }}>目前無照護提醒</div>
            : items.map(item => (
              <div key={item.id} className={`care-item${item.isDone ? ' care-done' : ''}`} style={item.isDone ? { opacity: 0.5 } : undefined}>
                <div className={`care-priority-bar priority-bar-${item.priority}`} />
                <div className="care-bed-info">
                  <span className="care-bed">{item.bedId}</span>
                  <span className={`care-patient care-gender-${item.gender === 'M' ? 'm' : 'f'}`}>{item.patientName}</span>
                  <span className="care-basic">{item.gender}/{item.age}</span>
                </div>
                <span className={`care-category cat-${item.category}`}>{item.category}</span>
                <span className="care-content">{item.content}</span>
                <div className="care-meta">
                  <span className="care-time">{item.remindTime}</span>
                  <span className="care-nurse">{item.primaryNurseName || ''}</span>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </main>
  )
}
