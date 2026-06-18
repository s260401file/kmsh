// EvacuationTab.jsx — ICU 避難圖分頁
// 角色：顯示由管理後台上傳的避難圖；尚未上傳時顯示佔位提示。
import { useState, useEffect } from 'react'
import { imageUrl, getImageInfo } from '../../../../services/evacuationApi'
import '../tabsCss/evacuation.css'

const UNIT = 'ICU' // 本分頁固定查 ICU 單位的避難圖

export default function EvacuationTab() {
  const [hasImage, setHasImage] = useState(false)  // 是否已有避難圖可顯示
  const [ts,       setTs]       = useState(Date.now()) // 時間戳，附在圖片網址後避免快取

  // 掛載時查詢是否有上傳避難圖；查無或失敗則設為 false 顯示佔位
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
