import { useState, useEffect } from 'react'
import { getDuty, getCommon } from '../../../../services/contactApi'
import '../tabsCss/contact.css'

// ER 板按班別（shiftType）分組顯示
function groupByShift(duty) {
  const order = ['白班', '小夜', '大夜']
  const groups = {}
  duty.forEach(c => {
    const key = c.shiftType || '其他'
    if (!groups[key]) groups[key] = []
    groups[key].push(c)
  })
  return order.filter(k => groups[k]).map(k => ({ shift: k, items: groups[k] }))
    .concat(Object.keys(groups).filter(k => !order.includes(k)).map(k => ({ shift: k, items: groups[k] })))
}

export default function ContactTab() {
  const [duty,   setDuty]   = useState([])
  const [common, setCommon] = useState([])

  useEffect(() => {
    getDuty('ER').then(d => setDuty(d ?? [])).catch(() => {})
    getCommon('ER').then(d => setCommon(d ?? [])).catch(() => {})
  }, [])

  const shiftGroups = groupByShift(duty)

  return (
    <main className="main-content">
      <div className="ct-panel">
        <div className="ct-page-title">
          <span className="ct-title-accent"></span>
          連絡電話
          <span className="ct-title-caption">當日值班＋常用</span>
        </div>
        <div className="ct-columns">
          <div className="ct-card ct-card-duty">
            <div className="ct-card-header">當日值班</div>
            <div className="ct-table-wrap">
              <table className="ct-table">
                <thead><tr><th>職務</th><th>姓名</th><th>院內分機</th><th>手機</th><th>班別</th></tr></thead>
                <tbody>
                  {duty.length === 0
                    ? <tr className="ct-empty-row"><td colSpan={5}>尚無值班資料</td></tr>
                    : shiftGroups.flatMap(g => [
                        <tr key={`h-${g.shift}`} style={{ background: '#E8F5EE' }}>
                          <td colSpan={5} style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-green)', padding: '5px 18px', letterSpacing: '1px' }}>
                            {g.shift}　{g.items[0]?.timeSlot || ''}
                          </td>
                        </tr>,
                        ...g.items.map(c => (
                          <tr key={c.id}>
                            <td>{c.dutyTitle}</td>
                            <td>{c.name}</td>
                            <td className="ct-ext">{c.extension || '—'}</td>
                            <td className="ct-mobile">{c.mobile || '—'}</td>
                            <td className="ct-slot">{c.shiftType}</td>
                          </tr>
                        ))
                      ])
                  }
                </tbody>
              </table>
            </div>
          </div>
          <div className="ct-card ct-card-common">
            <div className="ct-card-header">常用連絡電話</div>
            <div className="ct-table-wrap">
              <table className="ct-table">
                <thead><tr><th>單位 / 科室</th><th className="ct-col-ext">分機</th></tr></thead>
                <tbody>
                  {common.length === 0
                    ? <tr className="ct-empty-row"><td colSpan={2}>尚無常用電話</td></tr>
                    : common.map(c => (
                      <tr key={c.id}>
                        <td>{c.name}</td>
                        <td className="ct-col-ext ct-ext">{c.extension}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
