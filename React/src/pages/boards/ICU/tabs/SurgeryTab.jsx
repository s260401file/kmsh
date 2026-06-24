// SurgeryTab.jsx — ICU 手術分頁
// 角色：頂部日期列（今天前後各 3 天共 7 天）可切換，下方表格列出該日手術排程。
//       依手術狀態排序（手術中 → 待手術 → 已完成 → 取消），取消列加刪除線樣式。
import { useState, useMemo } from 'react'
import { usePolling } from '../../../../hooks/usePolling'
import * as wardApi from '../../../../services/wardApi'
import { BULLETIN_MS } from '../../../../config/pollingConfig'
import '../tabsCss/surgery.css'

const DAYS = ['日','一','二','三','四','五','六']            // 星期顯示字
const STATUS_ORDER = ['手術中','待手術','已完成','取消']      // 表格列排序優先序

// 本地日期 → yyyy-MM-dd（避免 toISOString 的 UTC 時區位移）
const isoLocal = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

// 以「真實今天」為中心、前後各 3 天的日期列
function buildDateRange() {
  const today = new Date()
  const dates = []
  for (let i = -3; i <= 3; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    dates.push({ iso: isoLocal(d), label: `${d.getMonth()+1}/${d.getDate()}`, day: DAYS[d.getDay()], isToday: i === 0 })
  }
  return dates
}

export default function SurgeryTab() {
  const dates = useMemo(() => buildDateRange(), [])          // 日期列（只算一次）
  const [activeDate, setActiveDate] = useState(() => isoLocal(new Date())) // 預設真實今天
  // 全部 OR 手術（Board_OR），免 F5 輪詢
  const { data } = usePolling(() => wardApi.getOrSurgeries(), { intervalMs: BULLETIN_MS, deps: ['OR'] })

  // 取出選取日期的手術並依狀態排序；隨 activeDate / data 變動重算
  const items = useMemo(() => {
    const filtered = (data ?? []).filter(i => i.date === activeDate)
    return [...filtered].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
  }, [activeDate, data])

  return (
    <main className="main-content">
      <div className="surg-panel">
        <div className="surg-title">
          <span className="surg-title-bar"></span>
          手術資訊
        </div>

        {/* 日期切換列；is-today 標示今天、active 標示目前選取 */}
        <div className="sr-date-bar">
          {dates.map(d => (
            <button
              key={d.iso}
              className={`sr-date-btn${d.isToday ? ' is-today' : ''}${activeDate === d.iso ? ' active' : ''}`}
              onClick={() => setActiveDate(d.iso)}
            >
              {d.label}
              <span className="sr-date-weekday">({d.day})</span>
            </button>
          ))}
        </div>

        <div className="surg-card">
          <div className="surg-card-header">
            當日手術
            {/* 台數計算排除「取消」 */}
            <span className="surg-card-count">{items.filter(i => i.status !== '取消').length} 台</span>
          </div>
          <div className="surg-table-wrap">
            <table className="surg-table">
              <thead>
                <tr>
                  <th>刀房</th><th>排程時間</th><th>姓名</th>
                  <th>術式</th><th>診斷</th><th>麻醉方式</th><th>主治醫師</th>
                  <th className="surg-th-center">狀態</th>
                </tr>
              </thead>
              <tbody>
                {/* 無排程時顯示佔位列；取消的手術整列套用刪除線樣式 */}
                {items.length === 0
                  ? <tr className="surg-empty-row"><td colSpan="8">本日無手術排程</td></tr>
                  : items.map((item, idx) => (
                    <tr key={idx} className={item.status === '取消' ? 'surg-row-cancel' : ''}>
                      <td><span className="surg-td-or">{item.orRoom}</span></td>
                      <td className="surg-td-time">{item.scheduledTime}</td>
                      <td className="surg-td-name">
                        <span className={`surg-name surg-gender-${item.gender === 'M' ? 'm' : 'f'}`}>{item.patientName}</span>
                        <span className="surg-basic">{item.gender}/{item.age}</span>
                      </td>
                      <td className="surg-td-procedure">{item.procedure}</td>
                      <td className="surg-td-diagnosis">{item.diagnosis}</td>
                      <td className="surg-td-anesthesia">{item.anesthesiaMethod}</td>
                      <td className="surg-td-surgeon">{item.attendingSurgeon}</td>
                      <td className="surg-td-status">
                        <span className={`surg-status surg-status-${item.status}`}>{item.status}</span>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}
