// EvacuationTab：OR 手術室站「避難圖」分頁
// 顯示由管理後台上傳的避難圖圖片；尚未上傳時顯示佔位提示。
// 圖片透過 evacuationApi 由後端 API 取得（非 mockData），以單位代碼 OR 查詢。
import { useState, useEffect } from 'react'
import { imageUrl, getImageInfo } from '../../../../services/evacuationApi'
import '../tabsCss/evacuation.css'

const UNIT = 'OR'   // 本分頁固定查詢的單位代碼

export default function EvacuationTab() {
  const [hasImage, setHasImage] = useState(false)  // 是否已有避難圖
  const [ts,       setTs]       = useState(Date.now()) // 時間戳，用於圖片網址避免快取

  // 載入時查詢避難圖資訊以判斷是否存在
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
