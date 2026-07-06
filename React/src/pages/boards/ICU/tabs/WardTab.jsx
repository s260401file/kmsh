// WardTab.jsx — ICU 病室動態分頁
// 角色：以 4F/3F 樓層格狀床位圖呈現加護病房各床狀態；點擊床位開啟病人詳情 Modal。
//   - 病況等級：資料層用「穩定/重症/危急」，畫面一律轉成 C/B/A 級顯示
//     （配色 A 紅最重、B 黃、C 綠最輕，於 CSS 的 sev-dot-a/b/c 等定義）。
//   - 病人註記：以 FlagDot（SVG 形狀旗標）呈現 DNR、跌倒、隔離、管路等屬性。
//   - 底部統計面板 + 下方 filter-bar 可依屬性篩選床位（被篩掉者加 filtered-out 變淡）。
import { useState, useMemo } from 'react'
import { getStats } from '../mockData'                          // 統計函式（mockData 保留備援）
import { useIcuWard } from '../../../../hooks/useIcuWard'        // 病室動態：Board_bed(AICU/CICU) 真實在床＋自建臨床，輪詢
import BoardLoading from '../../../../components/BoardLoading'   // 院方資料載入中動畫
import { FlagDot, makeFlagStyle } from '../../../../utils/flagShapes'

// 病況等級顯示對照：資料值 → 畫面徽章文字（穩定=C、重症=B、危急=A）
const CONDITION_LABEL = { '穩定': 'C級', '重症': 'B級', '危急': 'A級' }

// 依病人各屬性組出要顯示的註記徽章字串陣列（順序即顯示順序）
function buildBadges(patient) {
  if (!patient) return []
  const b = []
  if (patient.dnr)                                      b.push('DNR')
  if (patient.fallRisk)                                 b.push('高危跌')
  if (patient.dependency)                               b.push('依賴' + patient.dependency)
  if (patient.isolation && patient.isolation !== '無')  b.push('隔離')
  if (patient.confidential)                             b.push('保密')
  if (patient.noTreatment)                              b.push('禁治療')
  if (patient.npo)                                      b.push('禁食')
  if (patient.allergy)                                  b.push('過敏')
  if (patient.rrt)                                      b.push('RRT')
  if (patient.chemo)                                    b.push('化療')
  if (patient.transport === '輪椅')                     b.push('輪椅')
  else if (patient.transport === '推床')                b.push('推床')
  if (patient.oxygen)                                   b.push('氧氣設備')
  if (patient.crrt)                                     b.push('洗腎')
  return b
}

// 判斷某床在目前篩選條件下是否仍可見（空床與「全部」恆顯示）
// 註：cond-a/b/c 對應的是資料值穩定/重症/危急，與畫面 C/B/A 徽章方向相反，勿混淆
function isBedVisible(bed, filter) {
  if (filter === 'all' || bed.status === 'empty') return true
  const p = bed.patient
  const badges = buildBadges(p)
  switch (filter) {
    case 'surgery':    return !!p?.surgery
    case 'exam':       return !!p?.exam
    case 'consult':    return !!p?.consult
    case 'cond-a':     return p?.condition === '穩定'
    case 'cond-b':     return p?.condition === '重症'
    case 'cond-c':     return p?.condition === '危急'
    case 'iso':        return bed.status === 'isolation'
    case 'tube-ett':   return !!p?.ventilator
    case 'tube-ng':    return !!p?.ng
    case 'tube-foley': return !!p?.foley
    case 'tube-cvc':   return !!p?.cvc
    default:           return badges.includes(filter)
  }
}

// 單張床位卡片。props：bed 床資料、filteredOut 是否被篩選淡化、onClick 點擊（空床不傳）
function BedCard({ bed, filteredOut, onClick }) {
  const bedLabel = `${bed.floor}F-${String(bed.num).padStart(2, '0')}`
  // 空床：只顯示床號與「空床」字樣，不可點擊
  if (bed.status === 'empty') {
    return (
      <div className={`bed-card empty bed-${bed.id}`}>
        <div className="empty-bed-num">{bedLabel}</div>
        <div className="empty-label">空床</div>
      </div>
    )
  }
  const p = bed.patient
  const allBadges = buildBadges(p)
  return (
    <div
      className={`bed-card ${bed.status} bed-${bed.id}${filteredOut ? ' filtered-out' : ''}`}
      onClick={onClick}
    >
      <div className="card-row1"><span className="bed-num">{bedLabel}</span></div>
      <div className="card-row2">
        <span className={`patient-name ${p.gender === 'M' ? 'gender-m' : 'gender-f'}`}>{p.name}</span>
        <span className="patient-basic">{p.gender}/{p.age}</span>
      </div>
      {p.doctor && <div className="card-row-dr">Dr {p.doctor}</div>}
      {/* 病人註記區：每個徽章對應一個 SVG 形狀旗標 */}
      <div className="dots-row">
        {allBadges.map(b => <FlagDot key={b} k={b} flagStyle={FLAG_STYLE} />)}
      </div>
    </div>
  )
}

// 點擊床位後的病人詳情彈窗。props：bed 該床資料、onClose 關閉回呼
function BedModal({ bed, onClose }) {
  const p = bed.patient
  const bedLabel = `${bed.floor}F-${String(bed.num).padStart(2, '0')}`
  // 由入院/轉入日（院方 Board_bed 轉入日期，yyyy/MM/dd）推算住院天數
  const daysSince = Math.floor((new Date() - new Date(p.admission)) / 86400000)
  // 管路欄位鍵 → 中文名稱對照，過濾出該病人實際使用中的管路
  const tubeMap = [['ventilator','氣管內管'],['ng','鼻胃管'],['foley','導尿管'],['cvc','中心靜脈導管']]
  const tubes = tubeMap.filter(([k]) => p[k]).map(([,v]) => v)
  const allBadges = buildBadges(p)
  return (
    <div className="modal-overlay show" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <div style={{display:'flex',alignItems:'baseline',gap:'6px',flexWrap:'wrap'}}>
            <span className="modal-bed-id">{bedLabel}</span>
            <span className="modal-patient">{p.name}</span>
            <span className="modal-basic">{p.gender === 'M' ? '男' : '女'} / {p.age}歲</span>
            <div className="modal-badges">{allBadges.map(b => <span key={b} className="badge"><FlagDot k={b} flagStyle={FLAG_STYLE} title={false} />{b}</span>)}</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-row"><div className="modal-field full"><div className="field-label">診斷</div><div className="field-value diagnosis">{p.diagnosis}</div></div></div>
          <div className="modal-row">
            <div className="modal-field"><div className="field-label">病歷號</div><div className="field-value">{p.medRecord || '—'}</div></div>
            <div className="modal-field"><div className="field-label">身分證</div><div className="field-value">{p.idNo || '—'}</div></div>
            <div className="modal-field"><div className="field-label">生日</div><div className="field-value">{p.birthDate || '—'}</div></div>
            <div className="modal-field"><div className="field-label">科別</div><div className="field-value">{p.department || '—'}</div></div>
          </div>
          <div className="modal-row">
            <div className="modal-field"><div className="field-label">主治醫師</div><div className="field-value">{p.doctor}</div></div>
            <div className="modal-field"><div className="field-label">責任護理師</div><div className="field-value">{p.nurse}</div></div>
          </div>
          <div className="modal-row">
            <div className="modal-field"><div className="field-label">入院日期</div><div className="field-value">{p.admission || '—'}</div></div>
            <div className="modal-field"><div className="field-label">住院天數</div><div className="field-value">{daysSince >= 0 ? daysSince + ' 天' : '—'}</div></div>
            <div className="modal-field"><div className="field-label">病況等級</div><div className="field-value">{CONDITION_LABEL[p.condition] || p.condition}</div></div>
          </div>
          <div className="modal-row">
            <div className="modal-field"><div className="field-label">隔離狀態</div><div className="field-value">{p.isolation || '無'}</div></div>
            <div className="modal-field"><div className="field-label">DNR</div><div className="field-value">{p.dnr ? '是 ✓' : '否'}</div></div>
          </div>
          <div className="modal-row">
            <div className="modal-field"><div className="field-label">呼吸器</div><div className="field-value">{p.ventilator ? '使用中 ✓' : '無'}</div></div>
            <div className="modal-field"><div className="field-label">CRRT</div><div className="field-value">{p.crrt ? '使用中 ✓' : '無'}</div></div>
          </div>
          <div className="modal-row"><div className="modal-field full"><div className="field-label">管路</div><div className="field-value" style={{fontSize:'15px',fontWeight:'400'}}>{tubes.length ? tubes.join('、') : '無'}</div></div></div>
          <div className="modal-row"><div className="modal-field full"><div className="field-label">備註</div><div className="field-value" style={{fontSize:'15px',fontWeight:'400'}}>{p.notes || '無'}</div></div></div>
        </div>
        <div className="modal-footer"><button className="btn-close-modal" onClick={onClose}>關閉</button></div>
      </div>
    </div>
  )
}

// 底部 filter-bar 可點選的篩選徽章清單（f=篩選鍵、cls=樣式、label=顯示文字）
const FILTER_BADGES = [
  {f:'DNR',cls:'badge-DNR',label:'DNR'},{f:'高危跌',cls:'badge-高危跌',label:'高危跌'},
  {f:'依賴L1',cls:'badge-依賴L1',label:'依賴L1'},{f:'依賴L2',cls:'badge-依賴L2',label:'依賴L2'},
  {f:'依賴L3',cls:'badge-依賴L3',label:'依賴L3'},{f:'隔離',cls:'badge-隔離',label:'隔離'},
  {f:'保密',cls:'badge-保密',label:'保密'},{f:'禁治療',cls:'badge-禁治療',label:'禁治療'},
  {f:'禁食',cls:'badge-禁食',label:'禁食'},{f:'過敏',cls:'badge-過敏',label:'過敏'},
  {f:'RRT',cls:'badge-RRT',label:'RRT'},{f:'化療',cls:'badge-化療',label:'化療'},
  {f:'輪椅',cls:'badge-輪椅',label:'輪椅'},{f:'推床',cls:'badge-推床',label:'推床'},
  {f:'氧氣設備',cls:'badge-氧氣設備',label:'氧氣設備'},{f:'洗腎',cls:'badge-洗腎',label:'洗腎'},
]
// 依篩選鍵集合預先產生各徽章對應的 SVG 形狀樣式
const FLAG_STYLE = makeFlagStyle(FILTER_BADGES.map(x => x.f))

export default function WardTab() {
  const [filter, setFilter] = useState('all')          // 目前篩選條件
  const [selectedBed, setSelectedBed] = useState(null)  // 目前開啟詳情的床（null=未開）
  const [floor, setFloor] = useState(4)                 // 目前顯示樓層（4F 為主，可切 3F）
  const { beds, loading } = useIcuWard('ICU')           // 後端聚合看板（真實在床＋自建臨床），定時輪詢
  // 只顯示當前樓層；統計亦只計當前樓層（總床數 4F=20、3F=5）
  const floorBeds = useMemo(() => beds.filter(b => b.floor === floor), [beds, floor])
  const stats = useMemo(() => getStats(floorBeds), [floorBeds])
  // 點同一篩選鍵再按 → 取消回到 all；「全部」不可被反選
  const handleFilter = f => setFilter(prev => (prev === f && f !== 'all') ? 'all' : f)
  // 切換樓層：重置篩選、關閉開啟中的詳情
  const toggleFloor = () => { setFloor(f => (f === 4 ? 3 : 4)); setFilter('all'); setSelectedBed(null) }
  // 開著的詳情彈窗：每次輪詢後用 id 從最新 beds 重新取回，內容跟著自動更新（約20秒）；病人離床則自動關閉
  const liveSelectedBed = selectedBed ? beds.find(b => b.id === selectedBed.id) : null

  if (loading) return <main className="main-content"><BoardLoading /></main>   // 院方資料載入中

  return (
    <>
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
              {floorBeds.map(bed => (
                <BedCard key={bed.id} bed={bed} filteredOut={!isBedVisible(bed, filter)}
                  onClick={bed.status !== 'empty' ? () => setSelectedBed(bed) : undefined} />
              ))}
            </div>
          </div>
        </div>

        <div className="floor-section stats-section">
          <div className="floor-title">▌ {floor}F 統計</div>
          <div className="ward-stats">
            <div className="ws-row">
              <div className="ws-item"><div className="ws-value">{stats.total}</div><div className="ws-label">總床數</div></div>
              <div className="ws-item"><div className="ws-value">{stats.occupied}</div><div className="ws-label">住院</div></div>
              <div className={`ws-item${filter==='surgery'?' active':''}`} data-filter="surgery" onClick={()=>handleFilter('surgery')}><div className="ws-value ws-surgery">{stats.surgery}</div><div className="ws-label">手術</div></div>
              <div className={`ws-item${filter==='exam'?' active':''}`} data-filter="exam" onClick={()=>handleFilter('exam')}><div className="ws-value ws-exam">{stats.exam}</div><div className="ws-label">檢查</div></div>
              <div className={`ws-item${filter==='consult'?' active':''}`} data-filter="consult" onClick={()=>handleFilter('consult')}><div className="ws-value ws-consult">{stats.consult}</div><div className="ws-label">會診</div></div>
            </div>
            {/* 第二列：病況等級（C/B/A）與其他屬性統計，點擊即套用對應篩選 */}
            {/* 注意 sevA 對應綠點顯示 C 級、sevC 對應紅點顯示 A 級，資料與標籤方向相反 */}
            <div className="ws-row">
              <div className={`ws-item${filter==='cond-a'?' active':''}`} data-filter="cond-a" onClick={()=>handleFilter('cond-a')}><div className="ws-value ws-sev-a">{stats.sevA}</div><div className="ws-label"><span className="sev-dot sev-dot-a"/>C級</div></div>
              <div className={`ws-item${filter==='cond-b'?' active':''}`} data-filter="cond-b" onClick={()=>handleFilter('cond-b')}><div className="ws-value ws-sev-b">{stats.sevB}</div><div className="ws-label"><span className="sev-dot sev-dot-b"/>B級</div></div>
              <div className={`ws-item${filter==='cond-c'?' active':''}`} data-filter="cond-c" onClick={()=>handleFilter('cond-c')}><div className="ws-value ws-sev-c">{stats.sevC}</div><div className="ws-label"><span className="sev-dot sev-dot-c"/>A級</div></div>
              <div className={`ws-item${filter==='iso'?' active':''}`} data-filter="iso" onClick={()=>handleFilter('iso')}><div className="ws-value ws-iso">{stats.isolation}</div><div className="ws-label">隔離</div></div>
              <div className={`ws-item${filter==='DNR'?' active':''}`} data-filter="DNR" onClick={()=>handleFilter('DNR')}><div className="ws-value ws-dnr">{stats.dnr}</div><div className="ws-label">DNR</div></div>
              <div className={`ws-item${filter==='RRT'?' active':''}`} data-filter="RRT" onClick={()=>handleFilter('RRT')}><div className="ws-value ws-rrt">{stats.rrt}</div><div className="ws-label">RRT</div></div>
            </div>
            <div className="ws-row">
              <div className={`ws-item${filter==='tube-ett'?' active':''}`} data-filter="tube-ett" onClick={()=>handleFilter('tube-ett')}><div className="ws-value ws-ett">{stats.ett}</div><div className="ws-label">氣管內管</div></div>
              <div className={`ws-item${filter==='tube-ng'?' active':''}`} data-filter="tube-ng" onClick={()=>handleFilter('tube-ng')}><div className="ws-value ws-ng">{stats.ng}</div><div className="ws-label">鼻胃管</div></div>
              <div className={`ws-item${filter==='tube-foley'?' active':''}`} data-filter="tube-foley" onClick={()=>handleFilter('tube-foley')}><div className="ws-value ws-foley">{stats.foley}</div><div className="ws-label">導尿管</div></div>
              <div className={`ws-item${filter==='tube-cvc'?' active':''}`} data-filter="tube-cvc" onClick={()=>handleFilter('tube-cvc')}><div className="ws-value ws-cvc">{stats.cvc}</div><div className="ws-label">中心靜脈</div></div>
            </div>
          </div>
        </div>
      </main>

      {/* 底部篩選列：全部 + 各屬性徽章，點擊切換 filter */}
      <div className="filter-bar">
        <button className={`filter-btn${filter==='all'?' active':''}`} onClick={()=>handleFilter('all')}>全部</button>
        {FILTER_BADGES.map(({f,label}) => (
          <button key={f} className={`badge badge-filter${filter===f?' active':''}`} onClick={()=>handleFilter(f)}>
            <FlagDot k={f} flagStyle={FLAG_STYLE} title={false} />{label}
          </button>
        ))}
      </div>

      {/* 有選取床位時才渲染病人詳情彈窗 */}
      {liveSelectedBed && liveSelectedBed.patient && <BedModal bed={liveSelectedBed} onClose={()=>setSelectedBed(null)} />}
    </>
  )
}
