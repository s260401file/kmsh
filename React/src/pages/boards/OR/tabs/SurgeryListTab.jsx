// SurgeryListTab：OR 手術室站「手術清單」分頁（第 7 頁籤）
// 資料來源：後端 /api/Board/or/surgerylist（讀本地清洗表 OrSurgery，由 WhiteboardSync ETL 落地）。
// 預設本月；「補充」＝備註、「刷手/流動」欄由「刷手/流動設定」(OrSurgeryNurse) 逐台刀合併帶入。
// 上方顯示 總/住/門/急 統計；下方提供 上個月/本月/下個月/今日 快速鈕與自訂日期範圍查詢。
import { useState } from 'react'
import { usePolling } from '../../../../hooks/usePolling'
import * as wardApi from '../../../../services/wardApi'
import { BULLETIN_MS } from '../../../../config/pollingConfig'
import '../tabsCss/surgerylist.css'

const pad2 = n => String(n).padStart(2, '0')
const fmt = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
const monthRange = (y, m) => ({ from: fmt(new Date(y, m, 1)), to: fmt(new Date(y, m + 1, 0)) })  // m: 0-index

const today = new Date()
const DEFAULT = { from: fmt(today), to: fmt(today) }   // 預設停在今日

export default function SurgeryListTab() {
  const [range, setRange] = useState(DEFAULT)          // { from, to } yyyy-MM-dd（皆含）
  const [cf, setCf] = useState(DEFAULT.from)           // 自訂起
  const [ct, setCt] = useState(DEFAULT.to)             // 自訂訖

  const { data, loading } = usePolling(
    () => wardApi.getOrSurgeryList(range.from, range.to),
    { intervalMs: BULLETIN_MS, deps: [range.from, range.to] }
  )
  const rows = data?.rows ?? []
  const stats = data?.stats ?? {}

  // 月份導覽（以目前起日所在月份為基準）
  const shiftMonth = delta => {
    const [y, m] = range.from.split('-').map(Number)
    const d = new Date(y, (m - 1) + delta, 1)
    setRange(monthRange(d.getFullYear(), d.getMonth()))
  }
  const thisMonth = () => setRange(monthRange(today.getFullYear(), today.getMonth()))
  const dayOffset = n => { const d = new Date(today); d.setDate(d.getDate() + n); const t = fmt(d); setRange({ from: t, to: t }) }
  const applyCustom = () => { if (cf && ct) setRange({ from: cf, to: ct }) }

  // 期間標題：整月→「YYYY-MM 手術清單」，否則顯示區間
  const [fy, fm, fd] = range.from.split('-').map(Number)
  const isWholeMonth = fd === 1 && range.to === monthRange(fy, fm - 1).to
  const periodLabel = isWholeMonth ? `${fy}-${pad2(fm)} 手術清單` : `${range.from} ~ ${range.to} 手術清單`

  // 目前選中的快速鈕（長亮）
  const fmtOff = n => { const d = new Date(today); d.setDate(d.getDate() + n); return fmt(d) }
  const monthOff = delta => { const d = new Date(today.getFullYear(), today.getMonth() + delta, 1); return monthRange(d.getFullYear(), d.getMonth()) }
  const eqR = r => range.from === r.from && range.to === r.to
  const isDay = range.from === range.to
  const activeBtn = isDay && range.from === fmtOff(-1) ? 'd-1'
    : isDay && range.from === fmtOff(0) ? 'd0'
    : isDay && range.from === fmtOff(1) ? 'd1'
    : eqR(monthOff(-1)) ? 'm-1'
    : eqR(monthOff(0)) ? 'm0'
    : eqR(monthOff(1)) ? 'm1' : ''
  const btnCls = k => `sl-btn${activeBtn === k ? ' sl-btn-active' : ''}`

  const wardCell = r => r.sourceWard ? `${r.sourceWard}${r.sourceBed ? '-' + r.sourceBed : ''}` : (r.caseTypeText || '')
  const typeCls = t => t === '住院' ? 'sl-t-in' : t === '門診' ? 'sl-t-out' : t === '急診' ? 'sl-t-emg' : ''

  return (
    <main className="main-content">
      <div className="sl-panel">

        {/* 上方：期間 + 統計摘要 */}
        <div className="sl-header">
          <div className="sl-title">{periodLabel}</div>
          <div className="sl-stats">
            <span className="sl-stat sl-stat-total">總 {stats.total ?? 0}</span>
            <span className="sl-stat sl-t-in">住 {stats.inpatient ?? 0}</span>
            <span className="sl-stat sl-t-out">門 {stats.outpatient ?? 0}</span>
            <span className="sl-stat sl-t-emg">急 {stats.emergency ?? 0}</span>
          </div>
        </div>

        {/* 中間：清單表格（欄位參考紙本；補充/護士欄暫空）*/}
        <div className="sl-table-wrap">
          <table className="sl-table">
            <thead>
              <tr>
                <th className="sl-col-date">手術日期</th>
                <th>病歷號</th>
                <th>病房</th>
                <th>房間</th>
                <th>麻醉</th>
                <th>姓名</th>
                <th>主刀醫師</th>
                <th className="sl-col-op">手術名稱</th>
                <th>診斷</th>
                <th>補充</th>
                <th>刷手 / 流動 / 麻醉</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr className="sl-empty"><td colSpan={11}>{loading ? '載入中…' : '本期間無手術資料'}</td></tr>
              ) : rows.map((r, i) => {
                const cancelled = r.statusCode === '82'
                return (
                  <tr key={i} className={cancelled ? 'sl-row sl-cancelled' : 'sl-row'}
                      title={cancelled && r.cancelReason ? `取消：${r.cancelReason}` : undefined}>
                    <td className="sl-col-date">
                      <div className="sl-date">{(r.opDate || '').slice(0, 10)}</div>
                      <div className="sl-time">{r.opTime}</div>
                    </td>
                    <td className="sl-mono">{r.chartNo}</td>
                    <td>
                      <span className="sl-ward">{wardCell(r)}</span>
                      {r.caseTypeText && <span className={`sl-badge ${typeCls(r.caseTypeText)}`}>{r.caseTypeText}</span>}
                    </td>
                    <td className="sl-room">{r.roomId || r.room}</td>
                    <td>{r.anesthesia}</td>
                    <td>
                      <span className={`sl-name ${r.sex === 'M' ? 'sl-m' : r.sex === 'F' ? 'sl-f' : ''}`}>{r.patientName}</span>
                      <span className="sl-basic">{[r.sex, r.age].filter(v => v != null && v !== '').join('/')}</span>
                      {cancelled && <span className="sl-cancel-tag">取消</span>}
                    </td>
                    <td>{r.surgeonName}</td>
                    <td className="sl-col-op">{r.surgeryName}</td>
                    <td className="sl-mono">{r.icdCodes}</td>
                    <td>{r.note}</td>
                    <td>{[r.scrubNurse, r.circNurse, r.anesNurse].filter(Boolean).join(' / ')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* 下方：快速鈕 + 自訂範圍查詢 */}
        <div className="sl-controls">
          <button className={btnCls('m-1')} onClick={() => shiftMonth(-1)}>上個月</button>
          <button className={btnCls('m0')} onClick={thisMonth}>本月</button>
          <button className={btnCls('m1')} onClick={() => shiftMonth(1)}>下個月</button>
          <button className={btnCls('d-1')} onClick={() => dayOffset(-1)}>昨日</button>
          <button className={btnCls('d0')} onClick={() => dayOffset(0)}>今日</button>
          <button className={btnCls('d1')} onClick={() => dayOffset(1)}>明日</button>
          <span className="sl-sep" />
          <span className="sl-custom-label">自訂：</span>
          <input type="date" className="sl-date-input" value={cf} onChange={e => setCf(e.target.value)} />
          <span className="sl-tilde">～</span>
          <input type="date" className="sl-date-input" value={ct} onChange={e => setCt(e.target.value)} />
          <button className="sl-btn sl-btn-go" onClick={applyCustom}>查詢</button>
        </div>

      </div>
    </main>
  )
}
