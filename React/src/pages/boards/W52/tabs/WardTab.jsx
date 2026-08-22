// WardTab：W52 病室動態分頁（本站核心畫面）
// 角色：依房型分組（五人房/三人房/四人房…）排出 41 床的床位地圖，每床一張床卡，
//       床卡上以「SVG 形狀標記」(FlagDot) 呈現病人註記（DNR、隔離、管路…）。
//       左側統計面板可點選做床位篩選；點床卡開啟病人詳情 modal。
// 形狀指派：FILTER_BADGES 的順序決定每個註記對應哪個 SVG 形狀，由 makeFlagStyle 依固定
//           順序循環指派（圓/三角/方/愛心…，實心/空心交替）；上色由 CSS class flag-dot-KEY 控制。
import { useState, useMemo } from 'react'
import { getStats } from '../mockData'                            // 統計函式（mockData 保留備援）
import { useWard } from '../../../../hooks/useWard'               // 病室動態：Board_bed 真實在床＋自建臨床，輪詢
import { usePolling } from '../../../../hooks/usePolling'         // 值班表三班護理師：定時輪詢後台設定
import * as wardApi from '../../../../services/wardApi'
import { getPhone } from '../../../../services/contactApi'          // 值班表聯絡電話（後台可維護）
import { ContactValue, ContactRevealModal } from '../../../../components/ContactReveal'   // 聯絡資訊個資遮蔽（>7位數→點我顯示）
import { CENSUS_MS } from '../../../../config/pollingConfig'
import BoardLoading from '../../../../components/BoardLoading'     // 院方資料載入中動畫
import { FlagDot, makeFlagStyle } from '../../../../utils/flagShapes' // 共用 SVG 旗標形狀系統

// 值班表三班：班別中文 → 色塊 class ＋ 代碼字母
const SHIFT_META = { '大夜': { cls: 'sh-n', letter: 'N' }, '白班': { cls: 'sh-d', letter: 'D' }, '小夜': { cls: 'sh-e', letter: 'E' } }
// 值班表三班護理師顯示的班別（比照 ER：小夜下方多 12:00–20:00 第 4 班；破折號為 en-dash）
const W52_SHIFTS = ['大夜', '白班', '小夜', '12:00–20:00']
const normShift = s => String(s ?? '').replace(/[–—-]/g, '-')   // 吸收 en-dash/hyphen 差異
const nnToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
// 值班表日期＝今日（民國年/MM/DD（週幾））；每次 render(輪詢)重算，跨日自動更新
const ROC_DAYS = ['日', '一', '二', '三', '四', '五', '六']
const rocDateLabel = () => { const d = new Date(); return `${d.getFullYear() - 1911}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}（${ROC_DAYS[d.getDay()]}）` }
// 緊急應變編組 5 班（顯示順序）
const EMERGENCY_TEAMS = ['通報班', '滅火班', '安全防護', '救護班', '避難引導']
// 院方 Board_bed「動態」代碼 → 中文（病床卡詳情顯示）
const MOVEMENT_LABEL = { A: '住院中', D: '已出院', E: '病故', I: '通知出院', M: '允許出院', T: '轉院' }

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
  // 入院/轉入日 → MM-dd（無法解析或空值則不顯示）
  const admMd = (() => { const d = new Date(p.AdmissionDate); return isNaN(d) ? '' : `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })()
  return (
    <div
      className={`bed-card ${bed.Status} bed-${bed.BedId}${filteredOut ? ' filtered-out' : ''}`}
      onClick={onClick}
    >
      <div className="card-row1"><span className="bed-num">{bedLabel}</span></div>
      <div className="card-row2">
        <span className={`patient-name ${p.Gender === 'M' ? 'gender-m' : 'gender-f'}`}>{p.PatientName}</span>
        <span className="patient-basic">{p.Gender}/{p.Age}{admMd && `　${admMd}`}</span>
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
            <div className="modal-field"><div className="field-label">責任護理師</div><div className="field-value">{p.PrimaryNurse || '—'}</div></div>
          </div>
          <div className="modal-row">
            <div className="modal-field"><div className="field-label">入院日期</div><div className="field-value">{p.AdmissionDate || '—'}</div></div>
            <div className="modal-field"><div className="field-label">住院天數</div><div className="field-value">{daysSince >= 0 ? daysSince + ' 天' : '—'}</div></div>
            <div className="modal-field"><div className="field-label">病況等級</div><div className="field-value">{p.Condition || '—'}</div></div>
          </div>
          <div className="modal-row">
            <div className="modal-field"><div className="field-label">隔離狀態</div><div className="field-value">{p.Isolation || '無'}</div></div>
            <div className="modal-field"><div className="field-label">DNR</div><div className="field-value">{p.Dnr ? '是 ✓' : '否'}</div></div>
            <div className="modal-field"><div className="field-label">動向狀態</div><div className="field-value">{MOVEMENT_LABEL[p.Movement] || p.Movement || '—'}</div></div>
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
  const [reveal, setReveal] = useState(null)           // 聯絡資訊遮蔽：點「點我顯示」跳窗（{label,value}）
  const { beds, loading } = useWard('W52')              // 後端聚合看板（真實在床＋自建臨床），定時輪詢
  const stats = useMemo(() => getStats(beds), [beds])   // 統計面板數值（總床/住院/各類別計數）
  // 值班表三班護理師：讀「當日」排班(StaffSchedule；後台「W52 管理→三班護理師」設定)，依班別分組、SortOrder＝點選順序
  const { data: schedData } = usePolling(() => wardApi.getSchedule('W52'), { intervalMs: CENSUS_MS, deps: ['W52-sched'] })
  const shifts = useMemo(() => {
    const byType = {}; (schedData?.shifts ?? []).forEach(s => { byType[normShift(s.shiftType)] = s })
    return W52_SHIFTS.map(k => ({ shift: k, nurses: (byType[normShift(k)]?.nurses ?? []).map(n => n.peName).filter(Boolean) }))
  }, [schedData])
  // 緊急應變編組：由當日排班護理師之「緊急編組」歸類（後台「三班護理師」點名字設定）。目前一人一班；一人多班待後端擴充
  const emergencyTeams = useMemo(() => {
    const byTeam = Object.fromEntries(EMERGENCY_TEAMS.map(t => [t, []]))
    ;(schedData?.shifts ?? []).forEach(s => (s.nurses ?? []).forEach(n => {
      // 一人可屬多個編組（後台以逗號分隔存於 emergencyGroup）→ 拆解後各隊分別加入
      String(n.emergencyGroup ?? '').split(',').forEach(g0 => {
        const g = g0.trim()
        if (g && byTeam[g] && !byTeam[g].includes(n.peName)) byTeam[g].push(n.peName)
      })
    }))
    return EMERGENCY_TEAMS.map(t => ({ team: t, names: byTeam[t] }))
  }, [schedData])
  // 值班醫療團隊：引用中央值班排程，顯示本單位所選科別的「當日值班」醫師(後台「W52 管理→顯示值班醫師」設定；依所設順序)
  const { data: onCallData } = usePolling(() => wardApi.getOnCallBoardForUnit('W52'), { intervalMs: CENSUS_MS, deps: ['W52-oncall'] })
  const dutyDocs = onCallData ?? []
  // 照服員電話：引用後台「W52 管理→顯示照服員」所選之照服員（依所設順序）
  const { data: aideData } = usePolling(() => wardApi.getUnitCareAides('W52'), { intervalMs: CENSUS_MS, deps: ['W52-aide'] })
  const aides = aideData ?? []
  // 聯絡電話：引用後台「W52 管理→顯示聯絡電話」清單（標題＋名稱＋分機/電話，依排序）
  const { data: phoneData } = usePolling(() => getPhone('W52'), { intervalMs: CENSUS_MS, deps: ['W52-phone'] })
  const phones = phoneData ?? []
  // 夜專師：夜/假護理師排程之今日「小夜」值班（顯示於三班護理師標題右方）
  const { data: nnData } = usePolling(() => wardApi.getNightNurse(nnToday(), nnToday()), { intervalMs: CENSUS_MS, deps: ['W52-night'] })
  const nightSpecialist = useMemo(() => { const rows = nnData ?? []; return (rows.find(r => r.slot === '小夜') || rows[0])?.name || '' }, [nnData])
  // 護理行政值班：今日大夜/白班/小夜（後台「ER 管理→護理行政值班排程」設定，ER/ICU 共用同源資料）
  const { data: adminDutyData } = usePolling(() => wardApi.getAdminDuty(nnToday(), nnToday()), { intervalMs: CENSUS_MS, deps: ['W52-adminduty'] })
  const adminDuty = useMemo(() => { const ad = { 大夜: '', 白班: '', 小夜: '' }; (adminDutyData ?? []).forEach(r => { if (ad[r.slot] !== undefined) ad[r.slot] = r.name || '' }); return ad }, [adminDutyData])
  // 點同一篩選鈕再按一次可取消（回到 all）；'all' 鈕本身不切回
  const handleFilter = f => setFilter(prev => (prev === f && f !== 'all') ? 'all' : f)
  // 開著的詳情彈窗：每次輪詢後用 BedId 從最新 beds 重新取回，內容跟著自動更新（約20秒）；病人離床則自動關閉
  const liveSelectedBed = selectedBed ? beds.find(b => b.BedId === selectedBed.BedId) : null

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

            {/* 護理行政值班（056 床右側 3 欄×2 列空區：欄 5–7 × 列 1–2；橫向 3 班） */}
            <div className="w52-admin-duty" style={{ gridColumn: '5 / 8', gridRow: '1 / 3' }}>
              <div className="iad-title">護理行政值班</div>
              <div className="iad-body">
                {['大夜', '白班', '小夜'].map(k => (
                  <div className="iad-row" key={k}><span className="iad-label">{k}</span><span className="iad-name">{adminDuty[k] || '—'}</span></div>
                ))}
              </div>
            </div>

            {/* 值班表面板（右上 7×6 空區：欄 8–14 × 列 1–6；與統計區對調） */}
            <div className="duty-panel" style={{ gridColumn: '8 / 15', gridRow: '1 / 7' }}>
              <div className="duty-head">
                <span className="duty-title">值班表</span>
                <span className="duty-date">{rocDateLabel()}</span>
              </div>
              <div className="duty-body">
                {/* ① 三班護理師（置最上；每班可多人；資料由後台「W52 管理→三班護理師」設定） */}
                <div className="duty-sec">
                  <div className="duty-sec-t" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '6px' }}>
                    <span>三班護理師</span>
                    {nightSpecialist && <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}><span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>夜專師：</span>{nightSpecialist}</span>}
                  </div>
                  <div className="duty-shift">
                    {shifts.map(sh => {
                      const meta = SHIFT_META[sh.shift]   // 12:00–20:00 無對應 → 顯示時間字串（中性樣式）
                      const names = (sh.nurses && sh.nurses.length) ? sh.nurses : ['—']
                      return (
                        <div className="duty-sh" key={sh.shift}>
                          <span className={`duty-sh-k ${meta ? meta.cls : 'sh-t'}`}>{meta ? `${sh.shift} ${meta.letter}` : sh.shift}</span>
                          {names.map((n, i) => <span className="duty-sh-n" key={i}>{n}</span>)}
                        </div>
                      )
                    })}
                  </div>
                  {/* 緊急應變編組（5 班；由排班護理師的緊急編組歸類。一人多班待後端擴充） */}
                  <div className="duty-sec-t" style={{ marginTop: '10px' }}>緊急應變編組</div>
                  <div className="duty-rows">
                    {emergencyTeams.map(t => (
                      <div className="duty-r" key={t.team}><span className="duty-role">{t.team}</span><span className="duty-name">{t.names.length ? t.names.join('、') : '—'}</span></div>
                    ))}
                  </div>
                </div>
                {/* ② 值班醫療團隊：醫師各列引用中央值班排程(當日值班，後台設定科別＋順序)；書記維持靜態 */}
                <div className="duty-sec">
                  <div className="duty-sec-t">值班醫療團隊</div>
                  <div className="duty-rows">
                    {dutyDocs.map(d => (
                      <div className="duty-r" key={d.deptCode}><span className="duty-role">{d.deptName}</span><span className="duty-name">{d.doctorName || '—'}</span><ContactValue className="duty-ext" label={`${d.deptName || ''} ${d.doctorName || ''}`.trim()} value={d.ext} onReveal={setReveal} /></div>
                    ))}
                  </div>
                </div>
                {/* ③ 照服員（引用後台「顯示照服員」所選）＋ 聯絡電話（靜態，可後台化） */}
                <div className="duty-sec">
                  <div className="duty-sec-t">照服員</div>
                  <div className="duty-aides">
                    {aides.map(a => (
                      <span className="duty-aide" key={a.aideId}><b>{a.name}</b><ContactValue label={a.name} value={a.contact} onReveal={setReveal} /></span>
                    ))}
                  </div>
                  <div className="duty-sec-t" style={{ marginTop: '10px' }}>聯絡電話</div>
                  <div className="duty-aides">
                    {phones.map(p => (
                      <span className="duty-aide" key={p.id}><b>{[p.title, p.name].filter(Boolean).join(' ')}</b><ContactValue label={[p.title, p.name].filter(Boolean).join(' ')} value={p.extension} onReveal={setReveal} /></span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
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
      {liveSelectedBed && liveSelectedBed.Patient && <BedModal bed={liveSelectedBed} onClose={()=>setSelectedBed(null)} />}
      <ContactRevealModal reveal={reveal} onClose={() => setReveal(null)} />
    </>
  )
}
