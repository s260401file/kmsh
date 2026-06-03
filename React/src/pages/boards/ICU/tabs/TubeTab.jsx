import { useMemo } from 'react'
import MOCK_DATA from '../mockData'

export default function TubeTab() {
  const patients = useMemo(() =>
    MOCK_DATA.beds.filter(b => b.status !== 'empty' && b.patient),
    []
  )

  const stats = useMemo(() => ({
    ett:   patients.filter(b => b.patient.ventilator).length,
    ng:    patients.filter(b => b.patient.ng).length,
    foley: patients.filter(b => b.patient.foley).length,
    cvc:   patients.filter(b => b.patient.cvc).length,
    crrt:  patients.filter(b => b.patient.crrt).length,
  }), [patients])

  const Check = () => <span className="tb-check">✓</span>
  const None  = () => <span className="tb-none">—</span>

  return (
    <main className="main-content">
      <div className="tb-panel">
        <div className="tb-title">
          <span className="tb-title-bar"></span>
          管路狀態
        </div>

        <div className="tb-table-wrap">
          <table className="tb-table">
            <thead>
              <tr>
                <th>床號</th><th>病患</th>
                <th>呼吸器<br/>(ETT)</th>
                <th>鼻胃管<br/>(NG)</th>
                <th>導尿管<br/>(Foley)</th>
                <th>中心靜脈<br/>(CVC)</th>
                <th>CRRT</th>
              </tr>
            </thead>
            <tbody>
              {patients.map(bed => {
                const p = bed.patient
                const bedLabel = `${bed.floor}F-${String(bed.num).padStart(2,'0')}`
                return (
                  <tr key={bed.id}>
                    <td className="tb-td-bed">{bedLabel}</td>
                    <td className="tb-td-name">
                      <span style={{color: p.gender === 'M' ? '#1565C0' : '#AD1457', fontWeight:700}}>{p.name}</span>
                      <span style={{fontSize:'13px',color:'#7A8FA0',marginLeft:'6px'}}>{p.gender}/{p.age}</span>
                    </td>
                    <td>{p.ventilator ? <Check/> : <None/>}</td>
                    <td>{p.ng        ? <Check/> : <None/>}</td>
                    <td>{p.foley     ? <Check/> : <None/>}</td>
                    <td>{p.cvc       ? <Check/> : <None/>}</td>
                    <td>{p.crrt      ? <Check/> : <None/>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="tb-stats">
          <div className="tb-stat-item tb-stat-ett">
            <span className="tb-stat-label">呼吸器</span>
            <span className="tb-stat-value">{stats.ett}</span>
          </div>
          <div className="tb-stat-item tb-stat-ng">
            <span className="tb-stat-label">鼻胃管</span>
            <span className="tb-stat-value">{stats.ng}</span>
          </div>
          <div className="tb-stat-item tb-stat-foley">
            <span className="tb-stat-label">導尿管</span>
            <span className="tb-stat-value">{stats.foley}</span>
          </div>
          <div className="tb-stat-item tb-stat-cvc">
            <span className="tb-stat-label">中心靜脈</span>
            <span className="tb-stat-value">{stats.cvc}</span>
          </div>
          <div className="tb-stat-item tb-stat-crrt">
            <span className="tb-stat-label">CRRT</span>
            <span className="tb-stat-value">{stats.crrt}</span>
          </div>
        </div>
      </div>
    </main>
  )
}
