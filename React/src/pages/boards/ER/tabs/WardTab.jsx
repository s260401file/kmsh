// WardTab：ER 急診站「病室動態」主分頁。
// 內容：以網格繪出急診室平面圖（分區帶 zone-band + 區名 zone-name），
//   每張床卡顯示檢傷 A/B/C 徽章與病人狀態旗標；點床卡開啟病人詳情 Modal。
//   右上角有「三班醫護人員」面板；下方統計面板可點選做床位篩選。
// 床位/統計來源：後端 /api/Board/er（自建床位主檔鋪平面圖 ＋ Board_ER 真實在室 ＋ overlay；免 F5 輪詢）。
//   三班醫護人員仍暫用 MOCK_DATA.ShiftStaff（另案自建）。
import { useState, useMemo } from 'react'
import MOCK_DATA, { getStats } from '../mockData'
import { useErWard } from '../../../../hooks/useErWard'              // ER 病室動態：輪詢後端聚合看板
import BoardLoading from '../../../../components/BoardLoading'        // 院方資料載入中動畫
import { useUnitInfo } from '../../../../hooks/useUnitInfo'          // 頁首設定（含總病床數覆寫）
import { usePolling } from '../../../../hooks/usePolling'           // 各科值班醫師面板：定時輪詢自建資料
import * as wardApi from '../../../../services/wardApi'
import { BULLETIN_MS } from '../../../../config/pollingConfig'
import { FlagDot, makeFlagStyle } from '../../../../utils/flagShapes'

// 檢傷分級：院方真實值 1/2/3 → A/B/C 三級（1→A 重症、2→B 中症、3→C 輕症）
const triageGrade = t => (t === 1 ? 'A' : (t === 2 ? 'B' : 'C'))
// 各級對應的完整中文標籤（用於 Modal 顯示）
const GRADE_LABEL = { A: 'A級 重症', B: 'B級 中症', C: 'C級 輕症' }
// 各級的中文病況描述（Modal 檢傷分級徽章後的說明文字）
const GRADE_DESC = { A: '重症', B: '中症', C: '輕症' }

// 依病人各布林欄位組出要顯示的狀態旗標標籤陣列（死亡 / MBD / AAD / 轉出入 / DNR / 留觀 / 住院）
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

// 判斷某床在目前篩選條件下是否應「正常顯示」（false 會被加上 filtered-out 變淡）
// 篩選類別：檢傷 A/B/C、留觀、轉床、各類待床、以及各狀態旗標
function isBedVisible(bed, filter) {
  if (filter === 'all' || bed.Status === 'empty') return true
  const p = bed.Patient
  const badges = buildBadges(p)
  switch (filter) {
    case 'sev-a':     return p?.Triage === 1
    case 'sev-b':     return p?.Triage === 2
    case 'sev-c':     return p?.Triage === 3
    case 'obs':       return !!p?.Observation
    case 'transfer':  return !!(p?.TransferOut || p?.TransferIn)
    case 'await-gen': return p?.Awaiting && p?.AwaitingType === '一般'
    case 'await-icu': return p?.Awaiting && p?.AwaitingType === '加護'
    case 'await-iso': return p?.Awaiting && p?.AwaitingType === '隔離'
    default:          return badges.includes(filter)
  }
}

// 平面圖座標 → inline grid 定位（座標由床位主檔提供；後台新增床免改 CSS）
const bedPos = bed => (bed.GridCol && bed.GridRow) ? { gridColumn: bed.GridCol, gridRow: bed.GridRow } : undefined
// 急診手術室兩床：疊放於同一格(col6, rows7-8)並以 flex 均分等高，故不走一般平面圖座標
const OR_STACK_IDS = ['OER001', 'OER002']

// 單張床卡：空床顯示床號＋「空床」；佔床顯示檢傷級徽章、床號、姓名性別年齡、狀態旗標
function BedCard({ bed, filteredOut, onClick, inStack }) {
  const pos = inStack ? undefined : bedPos(bed)   // 疊放於 or-stack 內時不套用平面圖座標，改由 flex 均分
  if (bed.Status === 'empty') {
    return (
      <div className="bed-card empty" style={pos}>
        <div className="empty-bed-num">{bed.BedId}</div>
        <div className="empty-label">空床</div>
      </div>
    )
  }
  const p = bed.Patient
  const triageCls = p.Triage ? `triage-${p.Triage}` : ''   // 依檢傷 1/2/3 套色（CSS 配色）
  const negIsoCls = p.Isolation === '負壓隔離' ? 'neg-iso' : ''
  const deceasedCls = p.Deceased ? 'deceased' : ''
  const allBadges = buildBadges(p)
  const tg = triageGrade(p.Triage)
  return (
    <div
      className={`bed-card ${bed.Status} ${triageCls} ${negIsoCls} ${deceasedCls}${filteredOut ? ' filtered-out' : ''}`}
      style={pos}
      onClick={onClick}
    >
      <div className="card-row1">
        {/* 檢傷 A/B/C 徽章（無檢傷值則不顯示），tg-a / tg-b / tg-c 決定配色 */}
        {p.Triage ? <span className={`triage-badge tg-${tg.toLowerCase()}`}>{tg}級</span> : <span />}
        <span className="bed-num">{bed.BedId}</span>
      </div>
      <div className="card-row2">
        <span className={`patient-name ${p.Gender === 'M' ? 'gender-m' : 'gender-f'}`}>{p.PatientName}</span>
        <span className="patient-basic">{p.Gender}/{p.Age}</span>
      </div>
      {p.Doctor && <div className="card-row3">Dr {p.Doctor}</div>}
      <div className="dots-row">
        {allBadges.map(b => <FlagDot key={b} k={b} flagStyle={FLAG_STYLE} />)}
      </div>
    </div>
  )
}

// 點選床卡後彈出的病人詳情視窗（基本資料、診斷、檢傷分級、急診狀態、備註等）
function BedModal({ bed, onClose }) {
  const p = bed.Patient
  // 由院方到院時間（傳入日期）推算目前留觀時長（stayStr）；未帶則顯示 —
  const hasArr = !!(p.ArrivalDate && p.ArrivalTime)
  const arrStr = hasArr ? `${new Date().getFullYear()}-${p.ArrivalDate.replace('/', '-')}T${p.ArrivalTime}:00` : null
  const diff = hasArr ? (new Date() - new Date(arrStr)) : 0
  const stayD = Math.floor(diff / 86400000)
  const stayH = Math.floor((diff % 86400000) / 3600000)
  const stayM = Math.floor((diff % 3600000) / 60000)
  const stayStr = (hasArr && diff > 0) ? (stayD > 0 ? `${stayD}天 ${stayH}h` : stayH > 0 ? `${stayH}h ${stayM}m` : `${stayM}m`) : '—'
  // 組合急診狀態文字（死亡 / 留觀 / 待床 / AAD / MBD）供 Modal 顯示
  // 轉出/轉入/住院不列此處，改由下方「轉出醫院 / 轉入醫院 / 住院床號」欄位各別顯示
  const erStatuses = []
  if (p.Deceased)    erStatuses.push('死亡')
  if (p.Observation) erStatuses.push('留觀')
  if (p.Awaiting)    erStatuses.push(`待床${p.AwaitingType ? '（' + p.AwaitingType + '）' : ''}`)
  if (p.Aad)         erStatuses.push('AAD')
  if (p.Mbd)         erStatuses.push('MBD')
  const allBadges = buildBadges(p)
  const tg = triageGrade(p.Triage)
  return (
    <div className="modal-overlay show" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
            <span className="modal-bed-id">{bed.BedId}</span>
            <span className="modal-patient">{p.PatientName}</span>
            <span className="modal-basic">{p.Gender === 'M' ? '男' : '女'} / {p.Age}歲</span>
            <div className="modal-badges">{allBadges.map(b => <span key={b} className="badge"><FlagDot k={b} flagStyle={FLAG_STYLE} title={false} />{b}</span>)}</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-row"><div className="modal-field full"><div className="field-label">診斷</div><div className="field-value diagnosis">{p.Diagnosis || '—'}</div></div></div>
          <div className="modal-row">
            <div className="modal-field"><div className="field-label">病歷號</div><div className="field-value">{p.MedRecord || '—'}</div></div>
            <div className="modal-field"><div className="field-label">生日</div><div className="field-value">{p.BirthDate || '—'}</div></div>
            <div className="modal-field"><div className="field-label">科別</div><div className="field-value">{p.Department || '—'}</div></div>
          </div>
          <div className="modal-row">
            <div className="modal-field"><div className="field-label">主治醫師</div><div className="field-value">{p.Doctor || '—'}</div></div>
            <div className="modal-field"><div className="field-label">責任護理師</div><div className="field-value">{p.Nurse || '—'}</div></div>
          </div>
          <div className="modal-row">
            <div className="modal-field"><div className="field-label">到院時間</div><div className="field-value">{hasArr ? `2026/${p.ArrivalDate} ${p.ArrivalTime}` : '—'}</div></div>
            <div className="modal-field"><div className="field-label">留觀時間</div><div className="field-value">{stayStr}</div></div>
            <div className="modal-field"><div className="field-label">檢傷分級</div><div className="field-value">{p.Triage ? <>{p.TriageRaw ? <b style={{ marginRight: '8px' }}>{p.TriageRaw}</b> : null}<span className={`triage-badge tg-${tg.toLowerCase()}`}>{tg}級</span>　{GRADE_DESC[tg] || ''}</> : '—'}</div></div>
          </div>
          <div className="modal-row">
            <div className="modal-field"><div className="field-label">隔離狀態</div><div className="field-value">{p.Isolation || '無'}</div></div>
            <div className="modal-field"><div className="field-label">DNR</div><div className="field-value">{p.Dnr ? '是 ✓' : '否'}</div></div>
            <div className="modal-field"><div className="field-label">急診狀態</div><div className="field-value">{erStatuses.length > 0 ? erStatuses.join('、') : '看診中'}</div></div>
          </div>
          {(p.TransferHospital || p.TransferInHospital || p.Admitted) && <div className="modal-row">
            <div className="modal-field"><div className="field-label">轉出醫院</div><div className="field-value">{p.TransferHospital || '—'}</div></div>
            <div className="modal-field"><div className="field-label">轉入醫院</div><div className="field-value">{p.TransferInHospital || '—'}</div></div>
            <div className="modal-field"><div className="field-label">住院</div><div className="field-value">{p.Admitted ? (p.AdmBedNo || '是 ✓') : '否'}</div></div>
          </div>}
          <div className="modal-row"><div className="modal-field full"><div className="field-label">備註</div><div className="field-value" style={{ fontSize: '15px', fontWeight: '400' }}>{p.Notes || '無'}</div></div></div>
        </div>
        <div className="modal-footer"><button className="btn-close-modal" onClick={onClose}>關閉</button></div>
      </div>
    </div>
  )
}

// 死亡類別（Board_ER_TypeE，不佔床）彈窗：點底部「死亡」旗標開啟，列出病歷號＋轉出(死亡)時間＋病房床
function DeceasedModal({ list, onClose }) {
  const th = { textAlign: 'left', padding: '8px 12px', background: '#F4F8F6', color: '#3A5068', fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap', borderBottom: '1px solid #D6E0E8' }
  const td = { padding: '9px 12px', borderBottom: '1px solid #EEF2F5', fontSize: '15px' }
  return (
    <div className="modal-overlay show" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="modal-patient">死亡類別（不佔床）</span>
            <span className="modal-basic">共 {list.length} 筆</span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {list.length === 0
            ? <div style={{ padding: '24px', textAlign: 'center', color: '#7A8FA0' }}>目前無死亡類別資料</div>
            : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-num, inherit)' }}>
                <thead><tr>{['病歷號', '轉出日期', '轉出時間', '病房', '病床'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {list.map((d, i) => (
                    <tr key={i}>
                      <td style={{ ...td, fontWeight: 700 }}>{d.MedRecord || '—'}</td>
                      <td style={td}>{d.OutDate || '—'}</td>
                      <td style={td}>{d.OutTime || '—'}</td>
                      <td style={td}>{d.Ward || '—'}</td>
                      <td style={td}>{d.Bed || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
        <div className="modal-footer"><button className="btn-close-modal" onClick={onClose}>關閉</button></div>
      </div>
    </div>
  )
}

// 底部篩選列要顯示的旗標按鈕清單（f 為篩選 key，label 為顯示文字）
const FILTER_BADGES = [
  { f: '死亡', cls: 'badge-死亡', label: '死亡' }, { f: 'MBD', cls: 'badge-MBD', label: 'MBD' },
  { f: 'AAD',  cls: 'badge-AAD',  label: 'AAD'  }, { f: '轉出', cls: 'badge-轉出', label: '轉出' },
  { f: '轉入', cls: 'badge-轉入', label: '轉入' }, { f: 'DNR', cls: 'badge-DNR', label: 'DNR' },
  { f: 'obs',  cls: 'badge-留觀', label: '留觀'  }, { f: '住院', cls: 'badge-住院', label: '住院' },
]
const FLAG_STYLE = makeFlagStyle(FILTER_BADGES.map(x => x.label))

export default function WardTab() {
  const [filter, setFilter] = useState('all')          // 目前選取的篩選類別
  const [selectedBed, setSelectedBed] = useState(null)  // 目前開啟詳情的床位
  const [showDeceased, setShowDeceased] = useState(false)  // 死亡類別彈窗開關
  const { beds, deceasedCount, deceased, loading } = useErWard('ER')  // 後端聚合看板；死亡(不佔床)由 Board_ER_TypeE 計並帶明細
  const placedBeds = useMemo(() => beds.filter(b => !b.Unplaced), [beds])    // 有平面圖座標
  const unplacedBeds = useMemo(() => beds.filter(b => b.Unplaced), [beds])   // 不佔床病人（床碼未建主檔）→ 負1 下方面板
  const stats = useMemo(() => getStats(beds), [beds])  // 統計面板數值（由床位推導）
  const info = useUnitInfo('ER')                        // 頁首設定（總病床數覆寫）
  const totalBeds = info?.totalBeds ?? 19               // 留空→19；有值（含 0/1）→該值
  // 各科值班醫師：引用中央值班排程，只顯示本單位(ER)後台「顯示值班醫師」所選科別，依所設順序（當日值班；免 F5 自動更新）
  const { data: onCallData } = usePolling(() => wardApi.getOnCallBoardForUnit('ER'), { intervalMs: BULLETIN_MS, deps: ['ER-oncall'] })
  const onCallDocs = onCallData ?? []
  // 三班醫護人員面板：醫師/照服員＋班別結構取自「醫師/照服員設定」(ErShiftPanel)；護理師改由「三班護理師」(排班)供給
  const { data: shiftData } = usePolling(() => wardApi.getErShiftPanel('ER'), { intervalMs: BULLETIN_MS, deps: ['ER-shift'] })
  const shifts = shiftData ?? []
  const { data: schedData } = usePolling(() => wardApi.getSchedule('ER'), { intervalMs: BULLETIN_MS, deps: ['ER-sched'] })
  const normShift = s => String(s ?? '').replace(/[–—-]/g, '-')   // 吸收 en-dash/hyphen 差異（第4班 12:00–20:00）
  const nursesByShift = useMemo(() => {
    const m = {}; (schedData?.shifts ?? []).forEach(s => { m[normShift(s.shiftType)] = (s.nurses ?? []).map(n => n.peName).filter(Boolean) }); return m
  }, [schedData])
  // 急診醫師/照服員只顯示白班(白)、大夜(夜) 於標題右側
  const dayDoc = shifts.find(s => s.shift === '白班')?.doctor
  const nightDoc = shifts.find(s => s.shift === '大夜')?.doctor
  const dayAide = shifts.find(s => s.shift === '白班')?.aide
  const nightAide = shifts.find(s => s.shift === '大夜')?.aide
  // 再次點同一篩選即取消（回到 all）；點 all 維持 all
  const handleFilter = f => setFilter(prev => (prev === f && f !== 'all') ? 'all' : f)
  // 開著的詳情彈窗：每次輪詢後用 BedId 從最新 beds 重新取回，內容跟著自動更新（約20秒）；病人離床則自動關閉
  const liveSelectedBed = selectedBed ? beds.find(b => b.BedId === selectedBed.BedId) : null

  if (loading) return <main className="main-content"><BoardLoading /></main>   // 院方資料載入中

  return (
    <>
      <main className="main-content">
        <div className="beds-panel">
          <div className="ward-title">▌ 急診室　共 {totalBeds} 床</div>
          {/* 病室動態地圖：以 CSS grid 對位排出急診室平面 */}
          <div className="ward-grid">
            <div className="nursing-station">護理站</div>

            {/* 區帶背景（鋪在床位後方）：以網格座標圈出各分區色帶 */}
            <div className="zone-band" style={{gridColumn:'1/3',gridRow:'1/3'}}/>
            <div className="zone-band" style={{gridColumn:'4/6',gridRow:'2/3'}}/>
            <div className="zone-band" style={{gridColumn:'6/12',gridRow:'3/4'}}/>
            <div className="zone-band" style={{gridColumn:'5/12',gridRow:'5/6'}}/>
            <div className="zone-band" style={{gridColumn:'5/7',gridRow:'7/9'}}/>
            <div className="zone-band" style={{gridColumn:'1/4',gridRow:'7/9'}}/>

            {/* 診療區標示（R2，C6、C7）*/}
            <div className="zone-label zone-diag1">第1診療區</div>
            <div className="zone-label zone-diag2">第2診療區</div>

            {/* 區名（放在相鄰空格，疊在區帶上方）*/}
            <div className="zone-name" style={{gridColumn:'2',gridRow:'1/3'}}>負壓隔離室</div>
            <div className="zone-name" style={{gridColumn:'4/5',gridRow:'2'}}>兒科留觀區</div>
            <div className="zone-name" style={{gridColumn:'6',gridRow:'3'}}>第一留觀區</div>
            <div className="zone-name" style={{gridColumn:'5',gridRow:'5'}}>第二留觀區</div>
            <div className="zone-name" style={{gridColumn:'5/6',gridRow:'7/9'}}>急診手術室</div>
            <div className="zone-name" style={{gridColumn:'1/4',gridRow:'7'}}>急救室</div>

            {/* 三班醫護人員面板（右上空區）：列出大夜/白班/小夜各班醫師、值班護理長 */}
            <div className="staff-shifts" style={{gridColumn:'7/12',gridRow:'1/3'}}>
              <div className="ss-title">
                <span className="ss-title-docs">
                  <span className="ss-td-item"><span className="ss-td-label">白班</span>{dayDoc || '—'}</span>
                  <span className="ss-td-item"><span className="ss-td-label">夜班</span>{nightDoc || '—'}</span>
                </span>
                <span className="ss-title-docs ss-aides">
                  <span style={{ fontWeight: 700, marginRight: '2px' }}>照服員</span>
                  <span className="ss-td-item"><span className="ss-td-label">白班</span>{dayAide || '—'}</span>
                  <span className="ss-td-item"><span className="ss-td-label">夜班</span>{nightAide || '—'}</span>
                </span>
              </div>
              <div className="ss-body">
                {shifts.map(s => (
                  <div className="ss-col" key={s.shift || s.time}>
                    <div className="ss-shift">{s.shift ? <>{s.shift} <span className="ss-time">{s.time}</span></> : <span className="ss-time">{s.time}</span>}</div>
                    {(() => {
                      const schedNurses = nursesByShift[normShift(s.shift || s.time)] ?? []   // 護理師改由三班護理師(今日排班)
                      const names = (schedNurses.length ? schedNurses : ['—'])
                      const per = s.shift ? 2 : 1   // 有班別：每行 2 個；無班別(12:00–20:00)：每行 1 個
                      const rows = []
                      for (let i = 0; i < names.length; i += per) rows.push(names.slice(i, i + per).join('／'))
                      return rows.map((r, i) => <div className="ss-charge" key={i}>{r}</div>)
                    })()}
                  </div>
                ))}
              </div>
            </div>

            {/* 各科值班醫師面板（MER09 下方 5×2 空區，col7-11×row7-8）：對應實體急診白板右半，自建資料 */}
            <div className="oncall-panel" style={{ gridColumn: '7/12', gridRow: '7/9' }}>
              <div className="oc-title">各科值班醫師</div>
              <div className="oc-grid">
                {onCallDocs.map(d => (
                  <div className="oc-cell" key={d.deptCode}>
                    <div className="oc-dept">{d.deptCode}<span className="oc-deptname"> {d.deptName}</span></div>
                    <div className="oc-doc">{d.doctorName || '—'}{d.ext ? <span className="oc-ext"> #{d.ext}</span> : null}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 不佔床病人（床碼未建主檔）：放負1 下方空格（cols1-3×rows3-5），簡易清單點擊開詳情 */}
            {unplacedBeds.length > 0 && (
              <div className="unplaced-panel" style={{ gridColumn: '1/4', gridRow: '3/7' }}>
                <div className="up-panel-title">不佔床病人（{unplacedBeds.length}）</div>
                <div className="up-panel-list">
                  {unplacedBeds.map(bed => (
                    <div className="up-row" key={bed.BedId} onClick={() => setSelectedBed(bed)}>
                      <span className="up-name">{bed.Patient?.PatientName || '—'}</span>
                      <span className="up-basic">{bed.Patient?.Gender}/{bed.Patient?.Age ?? '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 依床位主檔鋪上床卡（含空床）；空床不可點，佔床點擊開啟詳情 Modal
                OER01/OER02 例外：疊放於急診手術室(col6, rows7-8)，用 flex 均分成等高兩格（OER01 在上） */}
            {placedBeds.filter(b => !OR_STACK_IDS.includes(b.BedId)).map(bed => (
              <BedCard
                key={bed.BedId}
                bed={bed}
                filteredOut={!isBedVisible(bed, filter)}
                onClick={bed.Status !== 'empty' ? () => setSelectedBed(bed) : undefined}
              />
            ))}
            {(() => {
              const orBeds = placedBeds
                .filter(b => OR_STACK_IDS.includes(b.BedId))
                .sort((a, b) => (a.BedId < b.BedId ? -1 : 1))   // OER01 在上、OER02 在下
              return orBeds.length > 0 && (
                <div className="or-stack" style={{ gridColumn: '6', gridRow: '7/9' }}>
                  {orBeds.map(bed => (
                    <BedCard
                      key={bed.BedId}
                      bed={bed}
                      inStack
                      filteredOut={!isBedVisible(bed, filter)}
                      onClick={bed.Status !== 'empty' ? () => setSelectedBed(bed) : undefined}
                    />
                  ))}
                </div>
              )
            })()}
          </div>
        </div>

        {/* 右側急診統計面板：各數字可點，等同套用對應床位篩選 */}
        <div className="stats-panel">
          <div className="stats-title">▌ 急診統計</div>
          <div className="stats-body">
            <div className="ws-row">
              <div className="ws-item"><div className="ws-value">{totalBeds}</div><div className="ws-label">總床數</div></div>
              <div className="ws-item"><div className="ws-value">{stats.attending}</div><div className="ws-label">看診中</div></div>
            </div>
            <div className="ws-row">
              <div className={`ws-item${filter==='obs'?' active':''}`} data-filter="obs" onClick={() => handleFilter('obs')}><div className="ws-value ws-obs">{stats.observation}</div><div className="ws-label">留觀</div></div>
              <div className={`ws-item${filter==='轉入'?' active':''}`} data-filter="轉入" onClick={() => handleFilter('轉入')}><div className="ws-value ws-transfer-in">{stats.transferIn}</div><div className="ws-label">轉入</div></div>
              <div className={`ws-item${filter==='轉出'?' active':''}`} data-filter="轉出" onClick={() => handleFilter('轉出')}><div className="ws-value ws-transfer-out">{stats.transferOut}</div><div className="ws-label">轉出</div></div>
            </div>
            <div className="ws-row">
              <div className={`ws-item${filter==='await-gen'?' active':''}`} data-filter="await-gen" onClick={() => handleFilter('await-gen')}><div className="ws-value ws-await-gen">{stats.awaitGen}</div><div className="ws-label">待床 一般</div></div>
              <div className={`ws-item${filter==='await-icu'?' active':''}`} data-filter="await-icu" onClick={() => handleFilter('await-icu')}><div className="ws-value ws-await-icu">{stats.awaitIcu}</div><div className="ws-label">待床 加護</div></div>
              <div className={`ws-item${filter==='await-iso'?' active':''}`} data-filter="await-iso" onClick={() => handleFilter('await-iso')}><div className="ws-value ws-await-iso">{stats.awaitIso}</div><div className="ws-label">待床 隔離</div></div>
            </div>
            <div className="ws-row">
              <div className={`ws-item${filter==='sev-a'?' active':''}`} data-filter="sev-a" onClick={() => handleFilter('sev-a')}><div className="ws-value ws-crit">{stats.sevA}</div><div className="ws-label">A級 重症</div></div>
              <div className={`ws-item${filter==='sev-b'?' active':''}`} data-filter="sev-b" onClick={() => handleFilter('sev-b')}><div className="ws-value ws-mid">{stats.sevB}</div><div className="ws-label">B級 中症</div></div>
              <div className={`ws-item${filter==='sev-c'?' active':''}`} data-filter="sev-c" onClick={() => handleFilter('sev-c')}><div className="ws-value ws-mod">{stats.sevC}</div><div className="ws-label">C級 輕症</div></div>
            </div>
            <div className="ws-row">
              <div className={`ws-item${filter==='DNR'?' active':''}`} data-filter="DNR" onClick={() => handleFilter('DNR')}><div className="ws-value ws-dnr">{stats.dnr}</div><div className="ws-label">DNR</div></div>
              <div className={`ws-item${filter==='住院'?' active':''}`} data-filter="住院" onClick={() => handleFilter('住院')}><div className="ws-value ws-admitted">{stats.admitted}</div><div className="ws-label">住院</div></div>
            </div>
          </div>
        </div>
      </main>

      {/* 底部旗標篩選列：點旗標只反白符合該狀態的床位 */}
      <div className="filter-bar">
        <button className={`filter-btn${filter==='all'?' active':''}`} onClick={() => handleFilter('all')}>全部</button>
        {FILTER_BADGES.map(({ f, label }) => (
          // 「死亡」＝不佔床類別，點擊改開明細彈窗（非床位篩選）；其餘照舊反白床位
          <button key={f} className={`badge badge-filter${f !== '死亡' && filter===f?' active':''}`}
            onClick={() => f === '死亡' ? setShowDeceased(true) : handleFilter(f)}>
            <FlagDot k={label} flagStyle={FLAG_STYLE} title={false} />{label}{f === '死亡' ? `(${deceasedCount})` : ''}
          </button>
        ))}
      </div>

      {liveSelectedBed && liveSelectedBed.Patient && <BedModal bed={liveSelectedBed} onClose={() => setSelectedBed(null)} />}
      {showDeceased && <DeceasedModal list={deceased} onClose={() => setShowDeceased(false)} />}
    </>
  )
}
