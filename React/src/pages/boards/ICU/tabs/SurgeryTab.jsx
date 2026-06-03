import { useState, useMemo } from 'react'
import SURGERY_DATA from '../tabsData/surgeryData'
import '../tabsCss/surgery.css'

const DAYS = ['日','一','二','三','四','五','六']
const STATUS_ORDER = ['手術中','待手術','已完成','取消']

function buildDateRange() {
  const today = new Date('2026-06-03')
  const dates = []
  for (let i = -3; i <= 3; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    dates.push({ iso, label: `${d.getMonth()+1}/${d.getDate()}`, day: DAYS[d.getDay()], isToday: i === 0 })
  }
  return dates
}

export default function SurgeryTab() {
  const dates = useMemo(() => buildDateRange(), [])
  const [activeDate, setActiveDate] = useState('2026-06-03')

  const items = useMemo(() => {
    const filtered = SURGERY_DATA.data.items.filter(i => i.date === activeDate)
    return [...filtered].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
  }, [activeDate])

  return (
    <main className="main-content">
      <div className="surg-panel">
        <div className="surg-title">
          <span className="surg-title-bar"></span>
          手術資訊
        </div>

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
            <span className="surg-card-count">{items.filter(i => i.status !== '取消').length} 台</span>
          </div>
          <div className="surg-table-wrap">
            <table className="surg-table">
              <thead>
                <tr>
                  <th>刀房</th><th>排程時間</th><th>床號</th><th>姓名</th>
                  <th>術式</th><th>診斷</th><th>麻醉方式</th><th>主治醫師</th>
                  <th className="surg-th-center">狀態</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0
                  ? <tr className="surg-empty-row"><td colSpan="9">本日無手術排程</td></tr>
                  : items.map(item => (
                    <tr key={item.surgeryId} className={item.status === '取消' ? 'surg-row-cancel' : ''}>
                      <td><span className="surg-td-or">{item.orRoom}</span></td>
                      <td className="surg-td-time">{item.scheduledTime}</td>
                      <td className="surg-td-bed">{item.bedId}</td>
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
