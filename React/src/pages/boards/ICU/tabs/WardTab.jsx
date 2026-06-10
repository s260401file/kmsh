import { useState, useMemo } from 'react'
import MOCK_DATA, { getStats } from '../mockData'
import { FlagDot, makeFlagStyle } from '../../../../utils/flagShapes'

const CONDITION_LABEL = { '穩定': 'C級', '重症': 'B級', '危急': 'A級' }

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

function BedCard({ bed, filteredOut, onClick }) {
  const bedLabel = `${bed.floor}F-${String(bed.num).padStart(2, '0')}`
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
      <div className="dots-row">
        {allBadges.map(b => <FlagDot key={b} k={b} flagStyle={FLAG_STYLE} />)}
      </div>
    </div>
  )
}

function BedModal({ bed, onClose }) {
  const p = bed.patient
  const bedLabel = `${bed.floor}F-${String(bed.num).padStart(2, '0')}`
  const daysSince = Math.floor((new Date() - new Date('2026/' + p.admission)) / 86400000)
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
            <div className="modal-field"><div className="field-label">生日</div><div className="field-value">{p.birthDate || '—'}</div></div>
            <div className="modal-field"><div className="field-label">科別</div><div className="field-value">{p.department || '—'}</div></div>
          </div>
          <div className="modal-row">
            <div className="modal-field"><div className="field-label">主治醫師</div><div className="field-value">{p.doctor}</div></div>
            <div className="modal-field"><div className="field-label">責任護理師</div><div className="field-value">{p.nurse}</div></div>
          </div>
          <div className="modal-row">
            <div className="modal-field"><div className="field-label">入院日期</div><div className="field-value">2026/{p.admission}</div></div>
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
const FLAG_STYLE = makeFlagStyle(FILTER_BADGES.map(x => x.f))

export default function WardTab() {
  const [filter, setFilter] = useState('all')
  const [selectedBed, setSelectedBed] = useState(null)
  const stats = useMemo(() => getStats(MOCK_DATA.beds), [])
  const handleFilter = f => setFilter(prev => (prev === f && f !== 'all') ? 'all' : f)

  const f4beds = MOCK_DATA.beds.filter(b => b.floor === 4)
  const f3beds = MOCK_DATA.beds.filter(b => b.floor === 3)

  return (
    <>
      <main className="main-content">
        <div className="floor-section floor-4f">
          <div className="floor-title">▌ 4F　共 20 床</div>
          <div className="floor-beds">
            <div className="grid-4f">
              {f4beds.map(bed => (
                <BedCard key={bed.id} bed={bed} filteredOut={!isBedVisible(bed, filter)}
                  onClick={bed.status !== 'empty' ? () => setSelectedBed(bed) : undefined} />
              ))}
            </div>
          </div>
        </div>

        <div className="floor-section floor-3f">
          <div className="floor-title">▌ 3F　共 5 床</div>
          <div className="floor-beds">
            <div className="grid-3f">
              {f3beds.map(bed => (
                <BedCard key={bed.id} bed={bed} filteredOut={!isBedVisible(bed, filter)}
                  onClick={bed.status !== 'empty' ? () => setSelectedBed(bed) : undefined} />
              ))}
            </div>
          </div>
          <div className="ward-stats">
            <div className="ws-row">
              <div className="ws-item"><div className="ws-value">{stats.total}</div><div className="ws-label">總床數</div></div>
              <div className="ws-item"><div className="ws-value">{stats.occupied}</div><div className="ws-label">住院</div></div>
              <div className={`ws-item${filter==='surgery'?' active':''}`} data-filter="surgery" onClick={()=>handleFilter('surgery')}><div className="ws-value ws-surgery">{stats.surgery}</div><div className="ws-label">手術</div></div>
              <div className={`ws-item${filter==='exam'?' active':''}`} data-filter="exam" onClick={()=>handleFilter('exam')}><div className="ws-value ws-exam">{stats.exam}</div><div className="ws-label">檢查</div></div>
              <div className={`ws-item${filter==='consult'?' active':''}`} data-filter="consult" onClick={()=>handleFilter('consult')}><div className="ws-value ws-consult">{stats.consult}</div><div className="ws-label">會診</div></div>
            </div>
            <div className="ws-row">
              <div className={`ws-item${filter==='cond-a'?' active':''}`} data-filter="cond-a" onClick={()=>handleFilter('cond-a')}><div className="ws-value ws-sev-a">{stats.sevA}</div><div className="ws-label"><span className="sev-dot sev-dot-a"/>C級</div></div>
              <div className={`ws-item${filter==='cond-b'?' active':''}`} data-filter="cond-b" onClick={()=>handleFilter('cond-b')}><div className="ws-value ws-sev-b">{stats.sevB}</div><div className="ws-label"><span className="sev-dot sev-dot-b"/>B級</div></div>
              <div className={`ws-item${filter==='cond-c'?' active':''}`} data-filter="cond-c" onClick={()=>handleFilter('cond-c')}><div className="ws-value ws-sev-c">{stats.sevC}</div><div className="ws-label"><span className="sev-dot sev-dot-c"/>A級</div></div>
              <div className={`ws-item${filter==='iso'?' active':''}`} data-filter="iso" onClick={()=>handleFilter('iso')}><div className="ws-value ws-iso">{stats.isolation}</div><div className="ws-label">隔離</div></div>
              <div className={`ws-item${filter==='DNR'?' active':''}`} data-filter="DNR" onClick={()=>handleFilter('DNR')}><div className="ws-value ws-dnr">{stats.dnr}</div><div className="ws-label">DNR</div></div>
              <div className={`ws-item${filter==='RRT'?' active':''}`} data-filter="RRT" onClick={()=>handleFilter('RRT')}><div className="ws-value ws-rrt">{stats.rrt}</div><div className="ws-label">RRT</div></div>
            </div>
            <div className="ws-row">
              <div className={`ws-item${filter==='tube-ett'?' active':''}`} data-filter="tube-ett" onClick={()=>handleFilter('tube-ett')}><div className="ws-value ws-ett">{stats.ett}</div><div className="ws-label">氣管內管 ▾</div></div>
              <div className={`ws-item${filter==='tube-ng'?' active':''}`} data-filter="tube-ng" onClick={()=>handleFilter('tube-ng')}><div className="ws-value ws-ng">{stats.ng}</div><div className="ws-label">鼻胃管 ▾</div></div>
              <div className={`ws-item${filter==='tube-foley'?' active':''}`} data-filter="tube-foley" onClick={()=>handleFilter('tube-foley')}><div className="ws-value ws-foley">{stats.foley}</div><div className="ws-label">導尿管 ▾</div></div>
              <div className={`ws-item${filter==='tube-cvc'?' active':''}`} data-filter="tube-cvc" onClick={()=>handleFilter('tube-cvc')}><div className="ws-value ws-cvc">{stats.cvc}</div><div className="ws-label">中心靜脈 ▾</div></div>
            </div>
          </div>
        </div>
      </main>

      <div className="filter-bar">
        <button className={`filter-btn${filter==='all'?' active':''}`} onClick={()=>handleFilter('all')}>全部</button>
        {FILTER_BADGES.map(({f,label}) => (
          <button key={f} className={`badge badge-filter${filter===f?' active':''}`} onClick={()=>handleFilter(f)}>
            <FlagDot k={f} flagStyle={FLAG_STYLE} title={false} />{label}
          </button>
        ))}
      </div>

      {selectedBed && <BedModal bed={selectedBed} onClose={()=>setSelectedBed(null)} />}
    </>
  )
}
