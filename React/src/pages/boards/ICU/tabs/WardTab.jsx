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
import { usePolling } from '../../../../hooks/usePolling'        // AICU 值班表：三班護理師輪詢
import * as wardApi from '../../../../services/wardApi'
import { getPhone } from '../../../../services/contactApi'         // 值班表聯絡電話（後台可維護）
import { ContactValue, ContactRevealModal } from '../../../../components/ContactReveal'   // 聯絡資訊個資遮蔽（>7位數→點我顯示）
import { CENSUS_MS } from '../../../../config/pollingConfig'

// AICU 值班表三班色票：大夜=n(深灰) 白班=d(藍) 小夜=e(紫)
const ICU_SHIFT_META = { '大夜': 'n', '白班': 'd', '小夜': 'e' }
// 責任護理師班別顯示/排序順序；當前時段界線：大夜00–08、白班08–16、小夜16–24
const SHIFT_ORDER = ['大夜', '白班', '小夜']
const currentShift = () => { const h = new Date().getHours(); return h < 8 ? '大夜' : h < 16 ? '白班' : '小夜' }
// 緊急應變編組 5 班（顯示順序，同 W52）
const EMERGENCY_TEAMS = ['通報班', '滅火班', '安全防護', '救護班', '避難引導']
const nnToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
// 值班表日期＝今日（民國年/MM/DD（週幾））；每次 render(輪詢)重算，跨日自動更新
const ROC_DAYS = ['日', '一', '二', '三', '四', '五', '六']
const rocDateLabel = () => { const d = new Date(); return `${d.getFullYear() - 1911}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}（${ROC_DAYS[d.getDay()]}）` }

// AICU 值班表面板（4F-01 下方 4×3 空區）。三班護理師接後台 getSchedule('ICU')；其餘先靜態
function IcuDutyPanel({ shifts, emergencyTeams = [], oncall = [], aides = [], phones = [], nightSpecialist = '' }) {
  const [reveal, setReveal] = useState(null)   // 聯絡資訊遮蔽：點「點我顯示」跳窗（{label,value}）
  return (
    <>
    <div className="icu-duty-panel">
      <div className="icu-duty-head"><span className="icu-duty-title">AICU 值班表</span><span className="icu-duty-date">{rocDateLabel()}</span></div>
      <div className="icu-duty-body">
        {/* ① 三班護理師（接後台）＋ 緊急應變編組（5 組，由排班緊急編組歸類） */}
        <div className="icu-duty-col">
          <div className="icu-duty-sec-t" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '6px' }}>
            <span>三班護理師</span>
            {nightSpecialist && <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}><span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>夜專師：</span>{nightSpecialist}</span>}
          </div>
          <div className="icu-duty-shift">
            {shifts.map(sh => {
              const names = (sh.nurses && sh.nurses.length) ? sh.nurses : ['—']
              return (
                <div className="icu-sh" key={sh.shift}>
                  <span className={`icu-sh-k ${ICU_SHIFT_META[sh.shift] || ''}`}>{sh.shift}</span>
                  {names.map((n, i) => <span className="icu-sh-n" key={i}>{n}</span>)}
                </div>
              )
            })}
          </div>
          <div className="icu-duty-sec-t">緊急應變編組</div>
          {emergencyTeams.map(t => (
            <div className="icu-duty-r" key={t.team}><span className="icu-duty-role">{t.team}</span><span className="icu-duty-name">{t.names.length ? t.names.join('、') : '—'}</span></div>
          ))}
        </div>
        {/* ② 值班醫療團隊：引用中央值班排程(當日值班，ICU 後台設定科別＋順序) */}
        <div className="icu-duty-col">
          <div className="icu-duty-sec-t">值班醫療團隊</div>
          {oncall.map(d => (
            <div className="icu-duty-r" key={d.deptCode}><span className="icu-duty-role">{d.deptName}</span><span className="icu-duty-name">{d.doctorName || '—'}</span><ContactValue className="icu-duty-ext" label={`${d.deptName || ''} ${d.doctorName || ''}`.trim()} value={d.ext} onReveal={setReveal} /></div>
          ))}
        </div>
        {/* ③ 照服員（引用後台「顯示照服員」）＋ 聯絡電話（引用後台「顯示聯絡電話」） */}
        <div className="icu-duty-col">
          <div className="icu-duty-sec-t">照服員</div>
          {aides.map(a => (
            <div className="icu-duty-r" key={a.aideId}><span className="icu-duty-name">{a.name}</span><ContactValue className="icu-duty-ext" label={a.name} value={a.contact} onReveal={setReveal} /></div>
          ))}
          <div className="icu-duty-sec-t">聯絡電話</div>
          {phones.map(p => (
            <div className="icu-duty-r" key={p.id}><span className="icu-duty-role">{p.title || ''}</span><span className="icu-duty-name">{p.name}</span><ContactValue className="icu-duty-ext" label={[p.title, p.name].filter(Boolean).join(' ')} value={p.extension} onReveal={setReveal} /></div>
          ))}
        </div>
      </div>
    </div>
    <ContactRevealModal reveal={reveal} onClose={() => setReveal(null)} />
    </>
  )
}

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
  if (patient.restraint)                                b.push('約束')
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
  // 責任護理師：只顯示「當前時段」該床的主護（班別依三班排程對應）
  const curNurses = (p.nurses ?? []).filter(n => n.shift === currentShift()).map(n => n.name).filter(Boolean)
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
      {(p.doctor || curNurses.length > 0) && (
        <div className="card-row-dr">
          {p.doctor && <span className="cd-dr">Dr {p.doctor}</span>}
          {curNurses.length > 0 && <span className="cd-nurse">{curNurses.join('、')}</span>}
        </div>
      )}
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
  // 責任護理師依 大夜→白班→小夜 排序（未排班者排最後）
  const orderedNurses = [...(p.nurses ?? [])]
    .sort((a, b) => ((SHIFT_ORDER.indexOf(a.shift) + 1) || 99) - ((SHIFT_ORDER.indexOf(b.shift) + 1) || 99))
    .map(n => n.name).filter(Boolean)
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
            <div className="modal-field"><div className="field-label">責任護理師</div><div className="field-value">{orderedNurses.length ? orderedNurses.join('、') : (p.nurse || '—')}</div></div>
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
  {f:'約束',cls:'badge-約束',label:'約束'},
]
// 依篩選鍵集合預先產生各徽章對應的 SVG 形狀樣式
const FLAG_STYLE = makeFlagStyle(FILTER_BADGES.map(x => x.f))

export default function WardTab() {
  const [filter, setFilter] = useState('all')          // 目前篩選條件
  const [selectedBed, setSelectedBed] = useState(null)  // 目前開啟詳情的床（null=未開）
  const [floor, setFloor] = useState(4)                 // 目前顯示樓層（4F 為主，可切 3F）
  const { beds, loading } = useIcuWard('ICU')           // 後端聚合看板（真實在床＋自建臨床），定時輪詢
  // AICU 值班表三班護理師：後台排班（今日），依大夜→白班→小夜分組
  const { data: schedData } = usePolling(() => wardApi.getSchedule('ICU'), { intervalMs: CENSUS_MS, deps: ['ICU-sched'] })
  const shifts = useMemo(() => {
    const byType = {}; (schedData?.shifts ?? []).forEach(s => { byType[s.shiftType] = s })
    return ['大夜', '白班', '小夜'].map(k => ({ shift: k, nurses: (byType[k]?.nurses ?? []).map(n => n.peName).filter(Boolean) }))
  }, [schedData])
  // 緊急應變編組：由當日排班護理師之「緊急編組」歸類（後台「三班護理師」設定）。目前一人一班；一人多班待後端擴充
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
  // 醫療團隊：引用中央值班排程，顯示 ICU 後台「顯示值班醫師」所選科別的當日值班（依所設順序）
  const { data: onCallData } = usePolling(() => wardApi.getOnCallBoardForUnit('ICU'), { intervalMs: CENSUS_MS, deps: ['ICU-oncall'] })
  const onCallDocs = onCallData ?? []
  // 照服員：引用後台「ICU 管理→顯示照服員」所選（依所設順序）
  const { data: aideData } = usePolling(() => wardApi.getUnitCareAides('ICU'), { intervalMs: CENSUS_MS, deps: ['ICU-aide'] })
  const aides = aideData ?? []
  // 聯絡電話：引用後台「ICU 管理→顯示聯絡電話」清單（標題＋名稱＋分機/電話，依排序）
  const { data: phoneData } = usePolling(() => getPhone('ICU'), { intervalMs: CENSUS_MS, deps: ['ICU-phone'] })
  const phones = phoneData ?? []
  // 夜專師：夜/假護理師排程之今日「小夜」值班（全院共用，顯示於三班護理師標題右方）
  const { data: nnData } = usePolling(() => wardApi.getNightNurse(nnToday(), nnToday()), { intervalMs: CENSUS_MS, deps: ['ICU-night'] })
  const nightSpecialist = useMemo(() => { const rows = nnData ?? []; return (rows.find(r => r.slot === '小夜') || rows[0])?.name || '' }, [nnData])
  // 護理行政值班（今日大夜/白班/小夜）：4F-02 右側 1×2 面板；資料來自 AdminDutyRoster（後台「護理行政值班排程」）
  const { data: adminDutyData } = usePolling(() => wardApi.getAdminDuty(nnToday(), nnToday()), { intervalMs: CENSUS_MS, deps: ['ICU-adminduty'] })
  const adminDuty = useMemo(() => {
    const ad = { 大夜: '', 白班: '', 小夜: '' }
    ;(adminDutyData ?? []).forEach(r => { if (ad[r.slot] !== undefined) ad[r.slot] = r.name || '' })
    return ad
  }, [adminDutyData])
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
              {floor === 4 && <IcuDutyPanel shifts={shifts} emergencyTeams={emergencyTeams} oncall={onCallDocs} aides={aides} phones={phones} nightSpecialist={nightSpecialist} />}
              {floor === 4 && (
                <div className="icu-admin-duty" style={{ gridColumn: '6/8', gridRow: '1' }}>
                  <div className="iad-title">護理行政值班</div>
                  <div className="iad-body">
                    {['大夜', '白班', '小夜'].map(k => (
                      <div className="iad-row" key={k}><span className="iad-label">{k}</span><span className="iad-name">{adminDuty[k] || '—'}</span></div>
                    ))}
                  </div>
                </div>
              )}
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
              <div className={`ws-item${filter==='約束'?' active':''}`} data-filter="約束" onClick={()=>handleFilter('約束')}><div className="ws-value ws-restraint">{stats.restraint}</div><div className="ws-label">約束</div></div>
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
