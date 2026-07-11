// AntibioticTab.jsx — ICU 抗生素分頁
// 角色：床位格狀圖標示哪些病人正使用抗生素（有用藥者床卡加紅框並顯示筆數徽章），
//       點擊床位開啟該病人的抗生素清單彈窗；底部為各類抗生素統計面板。
// 資料來源：床位/病人＝ ICU 看板（useIcuWard，Board_bed 真實在床）；
//          抗生素＝自建表（/api/Board/ICU/antibiotic），以「病歷號」對應在床病人。免 F5 輪詢。
import { useState, useMemo } from 'react'
import { useIcuWard } from '../../../../hooks/useIcuWard'
import { usePolling } from '../../../../hooks/usePolling'
import * as wardApi from '../../../../services/wardApi'
import { CENSUS_MS } from '../../../../config/pollingConfig'
import BoardLoading from '../../../../components/BoardLoading'   // 院方資料載入中動畫（同病室動態）

const norm = v => (v ?? '').toString().trim()

// 單張床位卡片。props：bed 床資料、abxList 該病人抗生素、onClick 點擊（空床不傳）
function BedCard({ bed, abxList, onClick }) {
  const bedLabel = `${bed.floor}F-${String(bed.num).padStart(2, '0')}`
  const hasAbx = abxList.length > 0     // 是否有用藥（決定紅框與筆數徽章）

  if (bed.status === 'empty') {
    return (
      <div className={`bed-card empty bed-${bed.id}`}>
        <div className="empty-bed-num">{bedLabel}</div>
        <div className="empty-label">空床</div>
      </div>
    )
  }
  const p = bed.patient
  return (
    <div
      className={`bed-card ${bed.status} bed-${bed.id}${hasAbx ? ' ab-has-abx' : ''}`}
      onClick={onClick}
    >
      <div className="card-row1">
        <span className="bed-num">{bedLabel}</span>
        {hasAbx && <span className="ab-count-badge">{abxList.length}</span>}
      </div>
      <div className="card-row2">
        <span className={`patient-name ${p.gender === 'M' ? 'gender-m' : 'gender-f'}`}>{p.name}</span>
        <span className="patient-basic">{p.gender}/{p.age}</span>
      </div>
    </div>
  )
}

// 抗生素清單彈窗。props：bed 該床資料、abxList 該病人抗生素、onClose 關閉回呼
function AbxModal({ bed, abxList, onClose }) {
  const bedLabel = `${bed.floor}F-${String(bed.num).padStart(2, '0')}`
  const p = bed.patient
  return (
    <div className="ab-modal-overlay show" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ab-modal-box">
        <div className="ab-modal-header">
          <div style={{display:'flex',alignItems:'baseline',gap:'8px',flexWrap:'wrap'}}>
            <span className="ab-modal-bed">{bedLabel}</span>
            <span className="ab-modal-name">{p.name}</span>
            <span className="ab-modal-rec">病歷號：{norm(p.medRecord)}</span>
          </div>
          <button className="ab-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="ab-modal-body">
          {abxList.length === 0
            ? <div className="ab-modal-empty">此病人目前無抗生素使用紀錄</div>
            : (
              <table className="ab-table">
                <thead>
                  <tr><th>藥品名稱</th><th>開始時間</th><th>首次給藥時間</th><th>結束時間</th></tr>
                </thead>
                <tbody>
                  {abxList.map(ab => (
                    <tr key={ab.id}>
                      <td className="ab-td-drug">{ab.drugName}</td>
                      <td className="ab-td-time">{ab.startDateTime || '—'}</td>
                      <td className="ab-td-time">{ab.firstDoseDateTime || '—'}</td>
                      <td className="ab-td-time">{ab.endDateTime || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
        <div className="ab-modal-footer">
          <button className="ab-btn-close" onClick={onClose}>關閉</button>
        </div>
      </div>
    </div>
  )
}

export default function AntibioticTab() {
  const [selectedBed, setSelectedBed] = useState(null)   // 目前開啟清單的床（null=未開）
  const [floor, setFloor] = useState(4)                  // 目前顯示樓層（4F 為主，可切 3F）

  const { beds, loading } = useIcuWard('ICU')            // 床位/病人＝真實在床
  const { data: abxRows } = usePolling(                  // 用藥＝院方 Board_bed 帶入（使用中；暫含全部用藥，非僅抗生素）
    () => wardApi.getAntibioticLive('ICU'),
    { intervalMs: CENSUS_MS, deps: ['ICU-abx-live'] },
  )

  // 以病歷號建索引：getAbx(病歷號) → 該病人抗生素清單
  const byHis = useMemo(() => {
    const m = {}
    ;(abxRows ?? []).forEach(a => {
      const k = norm(a.hhisnum)
      if (!k) return
      ;(m[k] = m[k] || []).push(a)
    })
    return m
  }, [abxRows])
  const getAbx = his => byHis[norm(his)] || []

  const floorBeds = useMemo(() => beds.filter(b => b.floor === floor), [beds, floor])
  const toggleFloor = () => { setFloor(f => (f === 4 ? 3 : 4)); setSelectedBed(null) }
  // 開著的清單彈窗：每次輪詢後用 id 從最新 beds 重新取回，內容跟著自動更新（約20秒）；病人離床則自動關閉
  const liveSelectedBed = selectedBed ? beds.find(b => b.id === selectedBed.id) : null

  // 統計：由在床病人 × 其抗生素即時計算（4F/3F 依床所在樓層；藥別以名稱比對）
  const stats = useMemo(() => {
    const occ = beds.filter(b => b.status !== 'empty' && b.patient)
    let f4 = 0, f3 = 0, bedsUsed = 0
    let vanc = 0, mero = 0, pip = 0
    occ.forEach(b => {
      const list = getAbx(b.patient.medRecord)
      if (list.length === 0) return
      bedsUsed++
      if (b.floor === 4) f4 += list.length; else if (b.floor === 3) f3 += list.length
      list.forEach(a => {
        const n = (a.drugName || '').toLowerCase()
        if (n.includes('vancomycin')) vanc++
        else if (n.includes('meropenem')) mero++
        else if (n.includes('piperacillin')) pip++
      })
    })
    const total = f4 + f3
    return { total, f4, f3, beds: bedsUsed, vanc, mero, pip, other: Math.max(0, total - vanc - mero - pip) }
  }, [beds, byHis])

  if (loading) return <main className="main-content"><BoardLoading /></main>   // 院方資料載入中（同病室動態）

  return (
    <main className="main-content">
      <div className="floor-section floor-main">
        <div className="floor-title">
          <span>▌ {floor}F　共 {floorBeds.length} 床</span>
          <button className="floor-toggle" onClick={toggleFloor}>
            {floor === 4 ? '切換 3F ▸' : '◂ 切回 4F'}
          </button>
        </div>
        <div className="floor-beds">
          <div className={floor === 4 ? 'grid-4f' : 'grid-3f'}>
            {floorBeds.map(bed => {
              const abxList = bed.patient ? getAbx(bed.patient.medRecord) : []
              return (
                <BedCard key={bed.id} bed={bed} abxList={abxList}
                  onClick={bed.status !== 'empty' ? () => setSelectedBed(bed) : undefined} />
              )
            })}
          </div>
        </div>
      </div>

      <div className="floor-section stats-section">
        <div className="floor-title">▌ 抗生素統計</div>
        {/* 抗生素統計面板（含 4F/3F 筆數，整體呈現） */}
        <div className="ward-stats">
          <div className="ws-row">
            <div className="ws-item"><div className="ws-value">{stats.total}</div><div className="ws-label">抗生素總筆</div></div>
            <div className="ws-item"><div className="ws-value ws-abx-4f">{stats.f4}</div><div className="ws-label">4F 筆數</div></div>
            <div className="ws-item"><div className="ws-value ws-abx-3f">{stats.f3}</div><div className="ws-label">3F 筆數</div></div>
            <div className="ws-item"><div className="ws-value ws-abx-beds">{stats.beds}</div><div className="ws-label">使用床位</div></div>
          </div>
          <div className="ws-row">
            <div className="ws-item"><div className="ws-value ws-abx-vanc">{stats.vanc}</div><div className="ws-label">Vancomycin</div></div>
            <div className="ws-item"><div className="ws-value ws-abx-mero">{stats.mero}</div><div className="ws-label">Meropenem</div></div>
            <div className="ws-item"><div className="ws-value ws-abx-pip">{stats.pip}</div><div className="ws-label">Pip/Tazo</div></div>
            <div className="ws-item"><div className="ws-value ws-abx-other">{stats.other}</div><div className="ws-label">其他</div></div>
          </div>
        </div>
      </div>

      {/* 有選取床位時才渲染抗生素清單彈窗 */}
      {liveSelectedBed && liveSelectedBed.patient && <AbxModal bed={liveSelectedBed} abxList={getAbx(liveSelectedBed.patient?.medRecord)} onClose={() => setSelectedBed(null)} />}
    </main>
  )
}
