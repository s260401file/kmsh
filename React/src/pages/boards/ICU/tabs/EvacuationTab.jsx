// EvacuationTab.jsx — ICU 避難圖分頁
// 左欄：後台上傳的避難圖；右欄：緊急應變編組（取自三班護理師今日排班的緊急編組）。
import { useState, useEffect } from 'react'
import { imageUrl, getImageInfo } from '../../../../services/evacuationApi'
import { usePolling } from '../../../../hooks/usePolling'
import * as wardApi from '../../../../services/wardApi'
import { CENSUS_MS } from '../../../../config/pollingConfig'
import '../tabsCss/evacuation.css'

const UNIT = 'ICU' // 本分頁固定查 ICU 單位
const EMERGENCY_GROUPS = ['救護班', '滅火班', '安全防護', '避難引導', '通報班']

export default function EvacuationTab() {
  const [hasImage, setHasImage] = useState(false)  // 是否已有避難圖可顯示
  const [ts]       = useState(() => Date.now())     // 時間戳，附在圖片網址後避免快取

  useEffect(() => {
    getImageInfo(UNIT).then(i => setHasImage(!!i)).catch(() => setHasImage(false))
  }, [])

  // 緊急應變編組：取三班護理師今日排班，依緊急編組彙整（跨班別，去重姓名）
  const { data: schedData } = usePolling(() => wardApi.getSchedule(UNIT), { intervalMs: CENSUS_MS, deps: ['ICU-ev-sched'] })
  const nurses = (schedData?.shifts ?? []).flatMap(s => s.nurses ?? [])
  const byGroup = {}
  nurses.forEach(n => {
    if (!n.emergencyGroup || !n.peName) return
    const a = (byGroup[n.emergencyGroup] = byGroup[n.emergencyGroup] || [])
    if (!a.includes(n.peName)) a.push(n.peName)
  })

  return (
    <main className="main-content" style={{ padding: 0 }}>
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

          {/* 右：緊急應變編組 */}
          <div className="ev-side">
            <div className="ev-card">
              <div className="ev-card-header">緊急應變編組</div>
              <div className="ev-resp">
                {EMERGENCY_GROUPS.map(g => (
                  <div className="ev-resp-row" key={g}>
                    <span className="ev-resp-k">{g}</span>
                    <span className="ev-resp-n">{byGroup[g]?.length ? byGroup[g].join('、') : '—'}</span>
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
