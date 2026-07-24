// EvacuationTab：避難圖分頁
// 左欄：後台上傳的本站避難圖（evacuationApi）；右欄：緊急應變編組（取自三班護理師今日排班的緊急編組）。
import { useState, useEffect } from 'react'
import { imageUrl, getImageInfo } from '../../../../services/evacuationApi'   // 避難圖 API
import { usePolling } from '../../../../hooks/usePolling'
import * as wardApi from '../../../../services/wardApi'
import { CENSUS_MS } from '../../../../config/pollingConfig'
import '../tabsCss/evacuation.css'

const UNIT = 'W52'   // 本站代碼
const EMERGENCY_GROUPS = ['通報班', '滅火班', '安全防護', '救護班', '避難引導']   // 與後台三班護理師緊急編組一致（顯示順序）
const CHARGE = '點班'   // 點班（來源 checkIn=IsCharge），列於編組之後

export default function EvacuationTab() {
  const [hasImage, setHasImage] = useState(false)       // 是否已上傳避難圖
  const [ts]       = useState(() => Date.now())          // 時間戳記，附在圖片 URL 後避免快取

  // 掛載時查詢是否有避難圖；查無或失敗則視為未上傳
  useEffect(() => {
    getImageInfo(UNIT).then(i => setHasImage(!!i)).catch(() => setHasImage(false))
  }, [])

  // 緊急應變編組：取三班護理師今日排班，依緊急編組彙整（跨班別，去重姓名）。一人可多組（emergencyGroup 逗號分隔）；點班取 checkIn。
  const { data: schedData } = usePolling(() => wardApi.getSchedule(UNIT), { intervalMs: CENSUS_MS, deps: ['W52-ev-sched'] })
  const nurses = (schedData?.shifts ?? []).flatMap(s => s.nurses ?? [])
  const byGroup = {}
  const charge = []
  nurses.forEach(n => {
    if (!n.peName) return
    String(n.emergencyGroup ?? '').split(',').forEach(g0 => {
      const g = g0.trim()
      if (!g) return
      const a = (byGroup[g] = byGroup[g] || [])
      if (!a.includes(n.peName)) a.push(n.peName)
    })
    if (n.checkIn && !charge.includes(n.peName)) charge.push(n.peName)
  })
  const respRows = [...EMERGENCY_GROUPS.map(g => ({ k: g, names: byGroup[g] || [] })), { k: CHARGE, names: charge }]

  return (
    <main className="main-content">
      <div className="ev-panel">
        <div className="ev-title">
          <span className="ev-title-bar"></span>
          避難圖
        </div>

        <div className="ev-columns">
          {/* 左：避難圖 */}
          <div className="ev-map-wrap">
            {hasImage
              ? <img src={`${imageUrl(UNIT)}?t=${ts}`} alt="避難圖" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={() => setHasImage(false)} />
              : <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🖼️</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>避難圖尚未上傳</div>
                  <div style={{ fontSize: '13px' }}>請由管理後台上傳</div>
                </div>
            }
          </div>

          {/* 右：緊急應變編組（取自三班護理師今日排班） */}
          <div className="ev-side">
            <div className="ev-card">
              <div className="ev-card-header">緊急應變編組</div>
              <div className="ev-resp">
                {respRows.map(row => (
                  <div className="ev-resp-row" key={row.k}>
                    <span className="ev-resp-k">{row.k}</span>
                    <span className="ev-resp-n">{row.names.length ? row.names.join('、') : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
