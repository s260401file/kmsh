import { useState, useMemo } from 'react'
import { useClock } from '../../../hooks/useClock'
import { useMarquee } from '../../../hooks/useMarquee'
import MOCK_DATA, { getStats } from './mockData'
import './ErPage.css'

const TRIAGE_LABELS = {1:'一級 復甦急救',2:'二級 危急',3:'三級 緊急',4:'四級 次緊急',5:'五級 非緊急'}

function bedClass(bedId) { return bedId.replace('負', 'neg') }

function buildBadges(patient) {
  if (!patient) return []
  const b = []
  if (patient.Deceased)    b.push('死亡')
  if (patient.Mbd)         b.push('MBD')
  if (patient.Aad)         b.push('AAD')
  if (patient.TransferOut) b.push('轉出')
  if (patient.TransferIn)  b.push('轉入')
  if (patient.Dnr)         b.push('DNR')
  if (patient.Observation) b.push('留觀')
  if (patient.Admitted)    b.push('住院')
  return b
}

function isBedVisible(bed, filter) {
  if (filter === 'all' || bed.Status === 'empty') return true
  const p = bed.Patient
  const badges = buildBadges(p)
  switch (filter) {
    case 'critical':  return p?.Triage <= 2
    case 'moderate':  return p?.Triage >= 3
    case 'obs':       return !!p?.Observation
    case 'transfer':  return !!(p?.TransferOut || p?.TransferIn)
    case 'await-gen': return p?.Awaiting && p?.AwaitingType === '一般'
    case 'await-icu': return p?.Awaiting && p?.AwaitingType === '加護'
    case 'await-iso': return p?.Awaiting && p?.AwaitingType === '隔離'
    default:          return badges.includes(filter)
  }
}

function BedCard({ bed, filteredOut, onClick }) {
  const cls = bedClass(bed.BedId)
  if (bed.Status === 'empty') {
    return (
      <div className={`bed-card empty bed-${cls}`}>
        <div className="empty-bed-num">{bed.BedId}</div>
        <div className="empty-label">空床</div>
      </div>
    )
  }
  const p = bed.Patient
  const triageCls = `triage-${p.Triage}`
  const negIsoCls = p.Isolation === '負壓隔離' ? 'neg-iso' : ''
  const deceasedCls = p.Deceased ? 'deceased' : ''
  const allBadges = buildBadges(p)
  const cardBadges = allBadges.slice(0, 3)
  const extra = allBadges.length - cardBadges.length
  const triageLabels = ['','一級','二級','三級','四級','五級']
  return (
    <div
      className={`bed-card ${bed.Status} ${triageCls} ${negIsoCls} ${deceasedCls} bed-${cls}${filteredOut ? ' filtered-out' : ''}`}
      onClick={onClick}
    >
      <div className="card-row1">
        <span className={`triage-badge t${p.Triage}`}>{triageLabels[p.Triage] || p.Triage + '級'}</span>
        <span className="bed-num">{bed.BedId}</span>
      </div>
      <div className="card-row2">
        <span className={`patient-name ${p.Gender === 'M' ? 'gender-m' : 'gender-f'}`}>{p.PatientName}</span>
        <span className="patient-basic">{p.Gender}/{p.Age}</span>
      </div>
      <div className="card-row3">
        {cardBadges.map(b => <span key={b} className={`badge badge-${b}`}>{b}</span>)}
        {extra > 0 && <span className="badge-more">+{extra}</span>}
      </div>
    </div>
  )
}

function BedModal({ bed, onClose }) {
  const p = bed.Patient
  const arrStr = `2026-${p.ArrivalDate.replace('/', '-')}T${p.ArrivalTime}:00`
  const diff = new Date() - new Date(arrStr)
  const stayH = Math.floor(diff / 3600000)
  const stayM = Math.floor((diff % 3600000) / 60000)
  const stayStr = diff > 0 ? (stayH > 0 ? `${stayH}h ${stayM}m` : `${stayM}m`) : '—'
  const erStatuses = []
  if (p.Deceased)    erStatuses.push('死亡')
  if (p.Observation) erStatuses.push('留觀')
  if (p.Awaiting)    erStatuses.push(`待床${p.AwaitingType ? '（' + p.AwaitingType + '）' : ''}`)
  if (p.TransferOut) erStatuses.push(p.TransferHospital ? `轉出（${p.TransferHospital}）` : '轉出')
  if (p.TransferIn)  erStatuses.push(p.TransferHospital ? `轉入（${p.TransferHospital}）` : '轉入')
  if (p.Aad)         erStatuses.push('AAD')
  if (p.Mbd)         erStatuses.push('MBD')
  if (p.Admitted)    erStatuses.push(p.AdmBedNo ? `住院（${p.AdmBedNo}）` : '住院')
  const allBadges = buildBadges(p)
  return (
    <div className="modal-overlay show" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <div style={{display:'flex',alignItems:'baseline',gap:'6px',flexWrap:'wrap'}}>
            <span className="modal-bed-id">{bed.BedId}</span>
            <span className="modal-patient">{p.PatientName}</span>
            <span className="modal-basic">{p.Gender === 'M' ? '男' : '女'} / {p.Age}歲</span>
            <div className="modal-badges">{allBadges.map(b => <span key={b} className={`badge badge-${b}`}>{b}</span>)}</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-row"><div className="modal-field full"><div className="field-label">診斷</div><div className="field-value diagnosis">{p.Diagnosis}</div></div></div>
          <div className="modal-row">
            <div className="modal-field"><div className="field-label">病歷號</div><div className="field-value">{p.MedRecord || '—'}</div></div>
            <div className="modal-field"><div className="field-label">生日</div><div className="field-value">{p.BirthDate || '—'}</div></div>
            <div className="modal-field"><div className="field-label">科別</div><div className="field-value">{p.Department || '—'}</div></div>
          </div>
          <div className="modal-row">
            <div className="modal-field"><div className="field-label">主治醫師</div><div className="field-value">{p.Doctor}</div></div>
            <div className="modal-field"><div className="field-label">責任護理師</div><div className="field-value">{p.Nurse}</div></div>
          </div>
          <div className="modal-row">
            <div className="modal-field"><div className="field-label">到院時間</div><div className="field-value">2026/{p.ArrivalDate} {p.ArrivalTime}</div></div>
            <div className="modal-field"><div className="field-label">滯留時間</div><div className="field-value">{stayStr}</div></div>
            <div className="modal-field"><div className="field-label">檢傷分級</div><div className={`field-value triage-val t${p.Triage}`}>{TRIAGE_LABELS[p.Triage] || '—'}</div></div>
          </div>
          <div className="modal-row">
            <div className="modal-field"><div className="field-label">隔離狀態</div><div className="field-value">{p.Isolation || '無'}</div></div>
            <div className="modal-field"><div className="field-label">DNR</div><div className="field-value">{p.Dnr ? '是 ✓' : '否'}</div></div>
            <div className="modal-field"><div className="field-label">急診狀態</div><div className="field-value">{erStatuses.length > 0 ? erStatuses.join('、') : '看診中'}</div></div>
          </div>
          <div className="modal-row"><div className="modal-field full"><div className="field-label">備註</div><div className="field-value" style={{fontSize:'15px',fontWeight:'400'}}>{p.Notes || '無'}</div></div></div>
        </div>
        <div className="modal-footer"><button className="btn-close-modal" onClick={onClose}>關閉</button></div>
      </div>
    </div>
  )
}

const TABS = ['病室動態','檢傷分診','大量傷患','檢查/會診','待床管理','連絡電話','派班資訊','佈告欄','避難圖']
const FILTER_BADGES = [
  {f:'死亡',cls:'badge-死亡',label:'死亡'},{f:'MBD',cls:'badge-MBD',label:'MBD'},
  {f:'AAD',cls:'badge-AAD',label:'AAD'},{f:'轉出',cls:'badge-轉出',label:'轉出'},
  {f:'轉入',cls:'badge-轉入',label:'轉入'},{f:'DNR',cls:'badge-DNR',label:'DNR'},
  {f:'obs',cls:'badge-留觀',label:'留觀'},{f:'住院',cls:'badge-住院',label:'住院'},
]

export default function ErPage() {
  const { date, time } = useClock()
  const marquee = useMarquee('ER', '2026/05/24 急診分流提醒：目前二級危急病人待床中，ICU 床位有限，請優先處理急救室病人轉出作業。')
  const [filter, setFilter] = useState('all')
  const [selectedBed, setSelectedBed] = useState(null)
  const [activeTab, setActiveTab] = useState(0)
  const stats = useMemo(() => getStats(MOCK_DATA.Beds), [])
  const handleFilter = f => setFilter(prev => (prev === f && f !== 'all') ? 'all' : f)

  return (
    <div className="er-board">
      <header className="page-header">
        <div className="header-left">ER<span className="ward-sub">急診室</span></div>
        <div className="header-center">
          <div className="staff-block"><div className="staff-label">急診主任</div><div className="staff-name">{MOCK_DATA.HospitalInfo.WardDirector}</div></div>
          <div className="staff-block"><div className="staff-label">護理長</div><div className="staff-name">{MOCK_DATA.HospitalInfo.HeadNurse}</div></div>
        </div>
        <div className="header-right">
          <div className="update-label">資料更新時間：剛剛</div>
          <div className="clock-date">{date}</div>
          <div className="clock-time">{time}</div>
        </div>
      </header>

      <div className="announce-bar">
        <span>🚨</span>
        <span>{marquee}</span>
      </div>

      <main className="main-content">
        <div className="beds-panel">
          <div className="ward-title">▌ 急診室　共 19 床（負壓 2＋急救 1＋第一診療 5＋第二診療 6＋留觀 2＋待床 3）</div>
          <div className="ward-grid">
            <div className="nursing-station">櫃檯</div>
            {MOCK_DATA.Beds.map(bed => (
              <BedCard
                key={bed.BedId}
                bed={bed}
                filteredOut={!isBedVisible(bed, filter)}
                onClick={bed.Status !== 'empty' ? () => setSelectedBed(bed) : undefined}
              />
            ))}
          </div>
        </div>

        <div className="stats-panel">
          <div className="stats-title">▌ 急診統計</div>
          <div className="stats-body">
            <div className="ws-row">
              <div className="ws-item"><div className="ws-value">{stats.total}</div><div className="ws-label">總床數</div></div>
              <div className="ws-item"><div className="ws-value">{stats.attending}</div><div className="ws-label">看診中</div></div>
            </div>
            <div className="ws-row">
              <div className={`ws-item${filter==='obs'?' active':''}`} data-filter="obs" onClick={()=>handleFilter('obs')}><div className="ws-value ws-obs">{stats.observation}</div><div className="ws-label">留觀</div></div>
              <div className={`ws-item${filter==='轉入'?' active':''}`} data-filter="轉入" onClick={()=>handleFilter('轉入')}><div className="ws-value ws-transfer-in">{stats.transferIn}</div><div className="ws-label">轉入</div></div>
              <div className={`ws-item${filter==='轉出'?' active':''}`} data-filter="轉出" onClick={()=>handleFilter('轉出')}><div className="ws-value ws-transfer-out">{stats.transferOut}</div><div className="ws-label">轉出</div></div>
            </div>
            <div className="ws-row">
              <div className={`ws-item${filter==='await-gen'?' active':''}`} data-filter="await-gen" onClick={()=>handleFilter('await-gen')}><div className="ws-value ws-await-gen">{stats.awaitGen}</div><div className="ws-label">待床 一般</div></div>
              <div className={`ws-item${filter==='await-icu'?' active':''}`} data-filter="await-icu" onClick={()=>handleFilter('await-icu')}><div className="ws-value ws-await-icu">{stats.awaitIcu}</div><div className="ws-label">待床 加護</div></div>
              <div className={`ws-item${filter==='await-iso'?' active':''}`} data-filter="await-iso" onClick={()=>handleFilter('await-iso')}><div className="ws-value ws-await-iso">{stats.awaitIso}</div><div className="ws-label">待床 隔離</div></div>
            </div>
            <div className="ws-row">
              <div className={`ws-item${filter==='critical'?' active':''}`} data-filter="critical" onClick={()=>handleFilter('critical')}><div className="ws-value ws-crit">{stats.critical}</div><div className="ws-label">一二級 危急</div></div>
              <div className={`ws-item${filter==='moderate'?' active':''}`} data-filter="moderate" onClick={()=>handleFilter('moderate')}><div className="ws-value ws-mod">{stats.moderate}</div><div className="ws-label">三~五級 輕中症</div></div>
            </div>
            <div className="ws-row">
              <div className={`ws-item${filter==='DNR'?' active':''}`} data-filter="DNR" onClick={()=>handleFilter('DNR')}><div className="ws-value ws-dnr">{stats.dnr}</div><div className="ws-label">DNR</div></div>
              <div className={`ws-item${filter==='住院'?' active':''}`} data-filter="住院" onClick={()=>handleFilter('住院')}><div className="ws-value ws-admitted">{stats.admitted}</div><div className="ws-label">住院</div></div>
            </div>
          </div>
        </div>
      </main>

      <div className="filter-bar">
        <span className="filter-label">圖例 / 過濾：</span>
        <button className={`filter-btn${filter==='all'?' active':''}`} onClick={()=>handleFilter('all')}>全部</button>
        {FILTER_BADGES.map(({f,cls,label}) => (
          <button key={f} className={`badge badge-filter ${cls}${filter===f?' active':''}`} onClick={()=>handleFilter(f)}>{label}</button>
        ))}
      </div>

      <nav className="bottom-tabs">
        {TABS.map((tab,i) => <button key={tab} className={`tab-btn${activeTab===i?' active':''}`} onClick={()=>setActiveTab(i)}>{tab}</button>)}
      </nav>

      {selectedBed && <BedModal bed={selectedBed} onClose={()=>setSelectedBed(null)} />}
    </div>
  )
}
