// WardTab：W52 病室動態分頁（本站核心畫面）
// 角色：依房型分組（五人房/三人房/四人房…）排出 41 床的床位地圖，每床一張床卡，
//       床卡上以「SVG 形狀標記」(FlagDot) 呈現病人註記（DNR、隔離、管路…）。
//       左側統計面板可點選做床位篩選；點床卡開啟病人詳情 modal。
// 形狀指派：FILTER_BADGES 的順序決定每個註記對應哪個 SVG 形狀，由 makeFlagStyle 依固定
//           順序循環指派（圓/三角/方/愛心…，實心/空心交替）；上色由 CSS class flag-dot-KEY 控制。
import { useState, useMemo } from 'react'
import { getStats } from '../mockData'                            // 統計函式（mockData 保留備援）
import { useWard } from '../../../../hooks/useWard'               // 病室動態：Board_bed 真實在床＋自建臨床，輪詢
import BoardLoading from '../../../../components/BoardLoading'     // 院方資料載入中動畫
import { FlagDot, makeFlagStyle } from '../../../../utils/flagShapes' // 共用 SVG 旗標形狀系統

// 由病人資料 + 床位狀態組出該床要顯示的註記字串陣列（順序即顯示順序）
function buildBadges(patient, bedStatus = '') {
  if (!patient) return []
  const b = []
  if (patient.Dnr)                                      b.push('DNR')
  if (patient.FallRisk)                                 b.push('高危跌')
  if (patient.Dependency)                               b.push('依賴' + patient.Dependency)
  if (patient.Isolation && patient.Isolation !== '無')  b.push('隔離')
  if (patient.Confidential)                             b.push('保密')
  if (patient.NoTreatment)                              b.push('禁治療')
  if (patient.Npo)                                      b.push('禁食')
  if (patient.Allergy)                                  b.push('過敏')
  if (patient.Rrt)                                      b.push('RRT')
  if (patient.Chemo)                                    b.push('化療')
  if (patient.Transport)                                b.push(patient.Transport)
  if (patient.Oxygen)                                   b.push('氧氣設備')
  if (patient.Renal)                                    b.push('洗腎')
  if (bedStatus === 'transfer-in')                      b.push('待轉入')
  if (bedStatus === 'transfer')                         b.push('待轉出')
  if (bedStatus === 'discharge')                        b.push('待出院')
  return b
}

// 判斷某床在目前篩選條件下是否該「亮起」（false 則套用 filtered-out 變暗）
// filter='all' 或空床一律顯示；管路/手術等用病人欄位判斷，其餘比對 badges 文字
function isBedVisible(bed, filter) {
  if (filter === 'all' || bed.Status === 'empty') return true
  const p = bed.Patient
  const badges = buildBadges(p, bed.Status)
  switch (filter) {
    case 'surgery':      return !!p?.Surgery
    case 'exam':         return !!p?.Exam
    case 'consult':      return !!p?.Consult
    case 'iso':          return bed.Status === 'isolation'
    case 'tube-port':    return !!p?.PortCath
    case 'tube-dlvc':    return !!p?.DLVC
    case 'tube-foley':   return !!p?.Foley
    case 'tube-cvc':     return !!p?.CVC
    case 'tube-cardiac': return !!p?.CardiacCath
    default:             return badges.includes(filter)
  }
}

// 單張床卡：空床只顯示床號與「空床」；有病人則顯示床號、姓名(依性別上色)、年齡與註記形狀
function BedCard({ bed, filteredOut, onClick }) {
  const bedLabel = bed.BedId.replace('W52-', '')   // 顯示用床號（去掉 W52- 前綴）
  if (bed.Status === 'empty') {
    return (
      <div className={`bed-card empty bed-${bed.BedId}`}>
        <div className="empty-bed-num">{bedLabel}</div>
        <div className="empty-label">空床</div>
      </div>
    )
  }
  const p = bed.Patient
  const allBadges = buildBadges(p, bed.Status)
  return (
    <div
      className={`bed-card ${bed.Status} bed-${bed.BedId}${filteredOut ? ' filtered-out' : ''}`}
      onClick={onClick}
    >
      <div className="card-row1"><span className="bed-num">{bedLabel}</span></div>
      <div className="card-row2">
        <span className={`patient-name ${p.Gender === 'M' ? 'gender-m' : 'gender-f'}`}>{p.PatientName}</span>
        <span className="patient-basic">{p.Gender}/{p.Age}</span>
      </div>
      {/* 註記形狀列：每個 badge 渲染一個 SVG 形狀標記 */}
      <div className="dots-row">
        {allBadges.map(b => <FlagDot key={b} k={b} flagStyle={FLAG_STYLE} />)}
      </div>
    </div>
  )
}

// 病人詳情彈窗：點床卡後開啟，顯示診斷、病歷號、主治/責護、住院天數、管路、備註等
function BedModal({ bed, onClose }) {
  const p = bed.Patient
  const bedLabel = bed.BedId.replace('W52-', '')
  // 住院天數：入院/轉入日（院方 Board_bed 轉入日期，yyyy/MM/dd）與今天相減
  const daysSince = Math.floor((new Date() - new Date(p.AdmissionDate)) / 86400000)
  // 將病人身上為 true 的管路欄位轉成中文名稱清單
  const tubes = [['PortCath','人工血管'],['DLVC','雙腔靜脈導管'],['Foley','導尿管'],['CVC','中心靜脈導管'],['CardiacCath','心導管']]
    .filter(([k]) => p[k]).map(([,v]) => v)
  const allBadges = buildBadges(p, bed.Status)
  // 點背景遮罩（非彈窗內容）才關閉
  return (
    <div className="modal-overlay show" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <div style={{display:'flex',alignItems:'baseline',gap:'6px',flexWrap:'wrap'}}>
            <span className="modal-bed-id">W52-{bedLabel}</span>
            <span className="modal-patient">{p.PatientName}</span>
            <span className="modal-basic">{p.Gender === 'M' ? '男' : '女'} / {p.Age}歲</span>
            <div className="modal-badges">
              {allBadges.map(b => (
                <span key={b} className="legend-item modal-flag">
                  <FlagDot k={b} flagStyle={FLAG_STYLE} title={false} />
                  <span>{b}</span>
                </span>
              ))}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-row"><div className="modal-field full"><div className="field-label">診斷</div><div className="field-value diagnosis">{p.Diagnosis}</div></div></div>
          <div className="modal-row">
            <div className="modal-field"><div className="field-label">病歷號</div><div className="field-value">{p.MedicalRecordNo || '—'}</div></div>
            <div className="modal-field"><div className="field-label">身分證</div><div className="field-value">{p.IdNo || '—'}</div></div>
            <div className="modal-field"><div className="field-label">生日</div><div className="field-value">{p.BirthDate || '—'}</div></div>
            <div className="modal-field"><div className="field-label">科別</div><div className="field-value">{p.Department || '—'}</div></div>
          </div>
          <div className="modal-row">
            <div className="modal-field"><div className="field-label">主治醫師</div><div className="field-value">{p.AttendingDoctor}</div></div>
            <div className="modal-field"><div className="field-label">責任護理師</div><div className="field-value">{p.PrimaryNurse}</div></div>
          </div>
          <div className="modal-row">
            <div className="modal-field"><div className="field-label">入院日期</div><div className="field-value">{p.AdmissionDate || '—'}</div></div>
            <div className="modal-field"><div className="field-label">住院天數</div><div className="field-value">{daysSince >= 0 ? daysSince + ' 天' : '—'}</div></div>
            <div className="modal-field"><div className="field-label">病況等級</div><div className="field-value">{p.Condition || '—'}</div></div>
          </div>
          <div className="modal-row">
            <div className="modal-field"><div className="field-label">隔離狀態</div><div className="field-value">{p.Isolation || '無'}</div></div>
            <div className="modal-field"><div className="field-label">DNR</div><div className="field-value">{p.Dnr ? '是 ✓' : '否'}</div></div>
          </div>
          <div className="modal-row"><div className="modal-field full"><div className="field-label">管路</div><div className="field-value" style={{fontSize:'15px',fontWeight:'400'}}>{tubes.length ? tubes.join('、') : '無'}</div></div></div>
          <div className="modal-row"><div className="modal-field full"><div className="field-label">備註</div><div className="field-value" style={{fontSize:'15px',fontWeight:'400'}}>{p.Notes || '無'}</div></div></div>
        </div>
        <div className="modal-footer"><button className="btn-close-modal" onClick={onClose}>關閉</button></div>
      </div>
    </div>
  )
}

// 所有可篩選的註記清單；此「順序」即決定每個註記對應的 SVG 形狀（見 makeFlagStyle）
const FILTER_BADGES = [
  'DNR','高危跌','依賴L1','依賴L2','依賴L3','隔離','保密','禁治療',
  '禁食','過敏','RRT','化療','輪椅','推床','氧氣設備','洗腎',
  '待轉入','待轉出','待出院',
]
// 產生 { 註記 → 形狀名 } 對照表，供 FlagDot 取用
const FLAG_STYLE = makeFlagStyle(FILTER_BADGES)

export default function WardTab() {
  const [filter, setFilter] = useState('all')          // 目前篩選的註記，'all' 為不篩選
  const [selectedBed, setSelectedBed] = useState(null) // 目前開啟詳情的床位，null 為未開啟
  const { beds, loading } = useWard('W52')              // 後端聚合看板（真實在床＋自建臨床），定時輪詢
  const stats = useMemo(() => getStats(beds), [beds])   // 統計面板數值（總床/住院/各類別計數）
  // 點同一篩選鈕再按一次可取消（回到 all）；'all' 鈕本身不切回
  const handleFilter = f => setFilter(prev => (prev === f && f !== 'all') ? 'all' : f)

  if (loading) return <main className="main-content"><BoardLoading /></main>   // 院方資料載入中

  return (
    <>
      <main className="main-content">
        <div className="beds-panel">
          <div className="ward-title">▌ W52病房　共 41 床（L 型配置：左翼 18 床 ＋ 右雙排 14 床 ＋ 底排 9 床）</div>
          {/* 病室地圖：用 CSS grid 的 row/column 框出各房型分區（底色 + 房型標籤），床卡再以 bed-<BedId> class 定位其上 */}
          <div className="ward-grid">
            {/* 房型分組底框與標籤（rg-* 底色框、rl-* 房型文字標籤） */}
            <div className="room-grp rg-five"  style={{gridColumn:'1/5',gridRow:'1/3'}}/>
            <div className="room-lbl rl-five"  style={{gridColumn:'2/5',gridRow:'2'}}>五人房</div>
            <div className="room-grp rg-three" style={{gridColumn:'1/3',gridRow:'3/5'}}/>
            <div className="room-lbl rl-three" style={{gridColumn:'2',gridRow:'3'}}>三人房</div>
            <div className="room-grp rg-four"  style={{gridColumn:'1/4',gridRow:'5/7'}}/>
            <div className="room-lbl rl-four"  style={{gridColumn:'2/4',gridRow:'5'}}>四人房</div>

            {/* 統計面板：上方為總床/住院；其餘格子可點擊切換對應篩選（ws-item active 表示已選） */}
            <div className="stats-wrap">
              <div className="ws-row">
                <div className="ws-item"><div className="ws-value">{stats.total}</div><div className="ws-label">總床數</div></div>
                <div className="ws-item"><div className="ws-value">{stats.occupied}</div><div className="ws-label">住院</div></div>
              </div>
              <div className="ws-row">
                <div className={`ws-item${filter==='surgery'?' active':''}`} data-filter="surgery" onClick={()=>handleFilter('surgery')}><div className="ws-value ws-surgery">{stats.surgery}</div><div className="ws-label">手術 ▾</div></div>
                <div className={`ws-item${filter==='exam'?' active':''}`} data-filter="exam" onClick={()=>handleFilter('exam')}><div className="ws-value ws-exam">{stats.exam}</div><div className="ws-label">檢查 ▾</div></div>
                <div className={`ws-item${filter==='consult'?' active':''}`} data-filter="consult" onClick={()=>handleFilter('consult')}><div className="ws-value ws-consult">{stats.consult}</div><div className="ws-label">會診 ▾</div></div>
              </div>
              <div className="ws-row">
                <div className={`ws-item${filter==='iso'?' active':''}`} data-filter="iso" onClick={()=>handleFilter('iso')}><div className="ws-value ws-iso">{stats.isolation}</div><div className="ws-label">隔離 ▾</div></div>
                <div className={`ws-item${filter==='DNR'?' active':''}`} data-filter="DNR" onClick={()=>handleFilter('DNR')}><div className="ws-value ws-dnr">{stats.dnr}</div><div className="ws-label">DNR ▾</div></div>
                <div className={`ws-item${filter==='RRT'?' active':''}`} data-filter="RRT" onClick={()=>handleFilter('RRT')}><div className="ws-value ws-rrt">{stats.rrt}</div><div className="ws-label">RRT ▾</div></div>
              </div>
              <div className="ws-row">
                <div className={`ws-item${filter==='tube-port'?' active':''}`} data-filter="tube-port" onClick={()=>handleFilter('tube-port')}><div className="ws-value ws-port">{stats.port}</div><div className="ws-label">人工血管 ▾</div></div>
                <div className={`ws-item${filter==='tube-dlvc'?' active':''}`} data-filter="tube-dlvc" onClick={()=>handleFilter('tube-dlvc')}><div className="ws-value ws-dlvc">{stats.dlvc}</div><div className="ws-label">雙腔靜脈 ▾</div></div>
                <div className={`ws-item${filter==='tube-foley'?' active':''}`} data-filter="tube-foley" onClick={()=>handleFilter('tube-foley')}><div className="ws-value ws-foley">{stats.foley}</div><div className="ws-label">導尿管 ▾</div></div>
              </div>
              <div className="ws-row">
                <div className={`ws-item${filter==='tube-cvc'?' active':''}`} data-filter="tube-cvc" onClick={()=>handleFilter('tube-cvc')}><div className="ws-value ws-cvc">{stats.cvc}</div><div className="ws-label">中心靜脈 ▾</div></div>
                <div className={`ws-item${filter==='tube-cardiac'?' active':''}`} data-filter="tube-cardiac" onClick={()=>handleFilter('tube-cardiac')}><div className="ws-value ws-cardiac">{stats.cardiac}</div><div className="ws-label">心導管 ▾</div></div>
              </div>
            </div>

            {/* 逐床渲染床卡；不符篩選者變暗，非空床點擊開啟詳情 modal */}
            {beds.map(bed => (
              <BedCard key={bed.BedId} bed={bed} filteredOut={!isBedVisible(bed, filter)}
                onClick={bed.Status !== 'empty' ? () => setSelectedBed(bed) : undefined} />
            ))}
          </div>
        </div>
      </main>

      {/* 底部篩選列：全部 + 各註記按鈕（含形狀圖示），點擊切換篩選 */}
      <div className="filter-bar">
        <button className={`filter-btn${filter==='all'?' active':''}`} onClick={()=>handleFilter('all')}>全部</button>
        {FILTER_BADGES.map(f => (
          <button key={f} className={`legend-item${filter===f?' active':''}`} onClick={()=>handleFilter(f)}>
            <FlagDot k={f} flagStyle={FLAG_STYLE} title={false} />
            <span>{f}</span>
          </button>
        ))}
      </div>

      {/* 有選取床位時才掛載病人詳情彈窗 */}
      {selectedBed && <BedModal bed={selectedBed} onClose={()=>setSelectedBed(null)} />}
    </>
  )
}
