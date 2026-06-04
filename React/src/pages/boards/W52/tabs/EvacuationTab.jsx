import { useState, useEffect } from 'react'
import { imageUrl, getImageInfo, getEquipment, getContact } from '../../../../services/evacuationApi'
import '../tabsCss/evacuation.css'

const UNIT = 'W52'

export default function EvacuationTab() {
  const [hasImage,   setHasImage]   = useState(false)
  const [ts,         setTs]         = useState(Date.now())
  const [equipment,  setEquipment]  = useState([])
  const [contacts,   setContacts]   = useState([])

  useEffect(() => {
    getImageInfo(UNIT).then(i => setHasImage(!!i)).catch(() => setHasImage(false))
    getEquipment(UNIT).then(d => setEquipment(d ?? [])).catch(() => {})
    getContact(UNIT).then(d => setContacts(d ?? [])).catch(() => {})
  }, [])

  return (
    <main className="main-content">
      <div className="ev-panel">
        <div className="ev-title">
          <span className="ev-title-bar"></span>
          避難圖
        </div>
        <div className="ev-columns">

          {/* 左欄：圖片 or 未上傳提示 */}
          <div className="ev-map-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {hasImage
              ? <img src={`${imageUrl(UNIT)}?t=${ts}`} alt="避難圖" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={() => setHasImage(false)} />
              : <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🖼️</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>避難圖尚未上傳</div>
                  <div style={{ fontSize: '13px' }}>請由管理後台上傳</div>
                </div>
            }
          </div>

          {/* 右欄：設備 + 緊急聯絡 */}
          <div className="ev-side">
            <div className="ev-card">
              <div className="ev-card-header">
                避難設備清單
                <span className="ev-card-count">{equipment.length} 項</span>
              </div>
              <div className="ev-equip-list">
                {equipment.map(e => (
                  <div key={e.id} className="ev-equip-row">
                    <span className="ev-equip-name">{e.equipmentName}</span>
                    <span className="ev-equip-loc">{e.location}</span>
                    {e.quantity > 1 && <span className="ev-equip-qty">×{e.quantity}</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="ev-card">
              <div className="ev-card-header">緊急聯絡</div>
              <div className="ev-contacts">
                {contacts.map(c => (
                  <div key={c.id} className="ev-contact-row">
                    <span className="ev-contact-name">{c.name}</span>
                    <span className="ev-contact-ext">{c.extension}</span>
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
