// EvacuationTab：ER 急診站「避難圖」分頁。
// 左欄：後台上傳的避難圖；右欄：緊急應變編組（取自三班護理師今日排班的緊急編組）。
import { useState, useEffect } from 'react'
import { imageUrl, getImageInfo } from '../../../../services/evacuationApi'
import { usePolling } from '../../../../hooks/usePolling'
import * as wardApi from '../../../../services/wardApi'
import { CENSUS_MS } from '../../../../config/pollingConfig'
import '../tabsCss/evacuation.css'

const UNIT = 'ER'   // 本分頁固定對應急診站
const EMERGENCY_GROUPS = ['通報班', '滅火班', '安全防護', '救護班', '避難引導']   // 顯示順序（同後台）
const CHARGE = '點班'   // 點班（來源 checkIn=IsCharge），列於編組之後
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export default function EvacuationTab() {
  const [hasImage, setHasImage] = useState(false)  // 是否已有上傳的避難圖
  const [ts]       = useState(() => Date.now())     // 時間戳，用於圖片 URL 防快取

  useEffect(() => {
    getImageInfo(UNIT).then(i => setHasImage(!!i)).catch(() => setHasImage(false))
  }, [])

  // 緊急應變編組：取三班護理師今日排班＋急診醫師今日編組，依緊急編組彙整（跨班別，去重姓名）
  const { data: schedData } = usePolling(() => wardApi.getSchedule(UNIT), { intervalMs: CENSUS_MS, deps: ['ER-ev-sched'] })
  const { data: docGroups } = usePolling(() => wardApi.getErDoctorGroups(todayIso()), { intervalMs: CENSUS_MS, deps: ['ER-ev-docgrp'] })
  const byGroup = {}
  const charge = []
  const addMember = (name, emergencyGroup, isCharge) => {
    if (!name) return
    String(emergencyGroup ?? '').split(',').forEach(g0 => {
      const g = g0.trim()
      if (!g) return
      const a = (byGroup[g] = byGroup[g] || [])
      if (!a.includes(name)) a.push(name)
    })
    if (isCharge && !charge.includes(name)) charge.push(name)
  }
  ;(schedData?.shifts ?? []).flatMap(s => s.nurses ?? []).forEach(n => addMember(n.peName, n.emergencyGroup, n.checkIn))
  ;(docGroups ?? []).forEach(d => addMember(d.name, d.emergencyGroup, d.isCharge))   // 急診醫師（與護理師併列）
  const respRows = [...EMERGENCY_GROUPS.map(g => ({ k: g, names: byGroup[g] || [] })), { k: CHARGE, names: charge }]

  return (
    <main className="main-content" style={{ padding: 0 }}>
      <div className="ev-panel">
        <div className="ev-title">
          <span className="ev-title-bar"></span>
          避難圖
        </div>

        <div className="ev-columns">
          {/* 左：避難圖 */}
          <div className="ev-map-wrap" style={{ alignItems: 'center', justifyContent: 'center' }}>
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
