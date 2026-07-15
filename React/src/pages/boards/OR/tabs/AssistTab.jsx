// AssistTab：OR 手術室站「各科協助業務」分頁（第 8 頁籤）
// 顯示由管理後台上傳的圖片（整頁）；尚未上傳時顯示佔位提示。功能同避難圖，資料源為通用看板圖片 API。
import { useState, useEffect } from 'react'
import { imageUrl, getImageInfo } from '../../../../services/boardImageApi'
import '../tabsCss/evacuation.css'

const UNIT = 'OR'          // 本分頁固定查詢的單位
const KIND = 'assist'      // 各科協助業務

export default function AssistTab() {
  const [hasImage, setHasImage] = useState(false)
  const [ts] = useState(() => Date.now())   // 時間戳，避免圖片快取

  useEffect(() => {
    getImageInfo(KIND, UNIT).then(i => setHasImage(!!i)).catch(() => setHasImage(false))
  }, [])

  return (
    <main className="main-content" style={{ padding: 0 }}>
      <div className="ev-panel">
        <div className="ev-title">
          <span className="ev-title-bar"></span>
          各科協助業務
        </div>
        <div className="ev-map-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          {hasImage
            ? <img src={`${imageUrl(KIND, UNIT)}?t=${ts}`} alt="各科協助業務" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={() => setHasImage(false)} />
            : <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🖼️</div>
                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>各科協助業務圖片尚未上傳</div>
                <div style={{ fontSize: '13px' }}>請由管理後台上傳</div>
              </div>
          }
        </div>
      </div>
    </main>
  )
}
