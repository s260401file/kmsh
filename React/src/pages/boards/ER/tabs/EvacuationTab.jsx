// EvacuationTab：ER 急診站「避難圖」分頁。
// 透過 evacuationApi 顯示後台上傳的避難圖（非假資料）；無圖時顯示提示。
import { useState, useEffect } from 'react'
import { imageUrl, getImageInfo } from '../../../../services/evacuationApi'
import '../tabsCss/evacuation.css'

const UNIT = 'ER'   // 本分頁固定對應急診站

export default function EvacuationTab() {
  const [hasImage, setHasImage] = useState(false)  // 是否已有上傳的避難圖
  const [ts,       setTs]       = useState(Date.now())  // 時間戳，用於圖片 URL 防快取

  // 載入時查詢是否已有避難圖
  useEffect(() => {
    getImageInfo(UNIT).then(i => setHasImage(!!i)).catch(() => setHasImage(false))
  }, [])

  return (
    <main className="main-content" style={{ padding: 0 }}>
      <div className="ev-panel">
        <div className="ev-title">
          <span className="ev-title-bar"></span>
          避難圖
        </div>
        <div className="ev-map-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          {hasImage
            ? <img src={`${imageUrl(UNIT)}?t=${ts}`} alt="避難圖" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={() => setHasImage(false)} />
            : <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🖼️</div>
                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>避難圖尚未上傳</div>
                <div style={{ fontSize: '13px' }}>請由管理後台上傳</div>
              </div>
          }
        </div>
      </div>
    </main>
  )
}
