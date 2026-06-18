// EvacuationTab：避難圖分頁
// 角色：顯示由後台上傳的本站避難圖（evacuationApi）；尚未上傳時顯示提示佔位。
import { useState, useEffect } from 'react'
import { imageUrl, getImageInfo } from '../../../../services/evacuationApi'   // 避難圖 API
import '../tabsCss/evacuation.css'

const UNIT = 'W52'   // 本站代碼

export default function EvacuationTab() {
  const [hasImage, setHasImage] = useState(false)   // 是否已上傳避難圖
  const [ts,       setTs]       = useState(Date.now()) // 時間戳記，附在圖片 URL 後避免快取

  // 掛載時查詢是否有避難圖；查無或失敗則視為未上傳
  useEffect(() => {
    getImageInfo(UNIT).then(i => setHasImage(!!i)).catch(() => setHasImage(false))
  }, [])

  return (
    <main className="main-content">
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
