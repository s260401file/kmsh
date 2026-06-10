import MOCK_DATA from '../mockData'
import '../tabsCss/mass-casualty.css'

// 檢傷分級：Triage 1-5 → A/B/C 三級（A 重症 1-2、B 中症 3、C 輕症 4-5）
const triageGrade = t => (t <= 2 ? 'A' : (t === 3 ? 'B' : 'C'))

function buildFlags(p) {
  const flags = []
  if (p.Deceased)    flags.push(<span key="死亡" className="flag-badge flag-死亡">死亡</span>)
  if (p.Mbd)         flags.push(<span key="MBD"  className="flag-badge flag-MBD">MBD</span>)
  if (p.Aad)         flags.push(<span key="AAD"  className="flag-badge flag-AAD">AAD</span>)
  if (p.Dnr)         flags.push(<span key="DNR"  className="flag-badge flag-DNR">DNR</span>)
  if (p.Observation) flags.push(<span key="留觀" className="flag-badge flag-留觀">留觀</span>)
  if (p.Admitted)    flags.push(<span key="住院" className="flag-badge flag-住院">住院{p.AdmBedNo ? ' ' + p.AdmBedNo : ''}</span>)
  if (p.TransferOut) flags.push(<span key="轉出" className="flag-badge flag-轉出">轉出</span>)
  if (p.TransferIn)  flags.push(<span key="轉入" className="flag-badge flag-轉入">轉入</span>)
  return flags
}

export default function MassCasualtyTab() {
  const patients = MOCK_DATA.Beds
    .filter(b => b.Status !== 'empty' && b.Patient)
    .map(b => ({ ...b.Patient, BedId: b.BedId }))
    .sort((a, b) => a.Triage - b.Triage)

  const sevA  = patients.filter(p => p.Triage <= 2).length
  const sevB  = patients.filter(p => p.Triage === 3).length
  const sevC  = patients.filter(p => p.Triage >= 4).length
  const dead      = patients.filter(p => p.Deceased).length
  const transfer  = patients.filter(p => p.TransferOut).length

  return (
    <main className="main-content">
      <div className="mc-panel">

        {/* 統計橫列 */}
        <div className="mc-stats-row">
          <div className="mc-stat-card">
            <div className="mc-stat-val val-total">{patients.length}</div>
            <div className="mc-stat-lbl">病患總數</div>
          </div>
          <div className="mc-stat-card">
            <div className="mc-stat-val val-critical">{sevA}</div>
            <div className="mc-stat-lbl">A級 重症</div>
          </div>
          <div className="mc-stat-card">
            <div className="mc-stat-val val-mid">{sevB}</div>
            <div className="mc-stat-lbl">B級 中症</div>
          </div>
          <div className="mc-stat-card">
            <div className="mc-stat-val val-moderate">{sevC}</div>
            <div className="mc-stat-lbl">C級 輕症</div>
          </div>
          <div className="mc-stat-card">
            <div className="mc-stat-val val-dead">{dead}</div>
            <div className="mc-stat-lbl">死亡</div>
          </div>
          <div className="mc-stat-card">
            <div className="mc-stat-val val-transfer">{transfer}</div>
            <div className="mc-stat-lbl">轉出</div>
          </div>
        </div>

        {/* 病患列表 */}
        <div className="mc-table-wrap">
          <table className="mc-table">
            <thead>
              <tr>
                <th>床號</th>
                <th>病患</th>
                <th>病歷號</th>
                <th>分級</th>
                <th>科別</th>
                <th>診斷</th>
                <th>到達</th>
                <th>病人註記</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>目前無病患資料</td></tr>
              ) : patients.map(p => (
                <tr key={p.BedId}>
                  <td className="mc-bed">{p.BedId}</td>
                  <td className="mc-patient">
                    <span className={p.Gender === 'M' ? 'gender-m' : 'gender-f'}>{p.PatientName}</span>
                    <div className="mc-basic">{p.Gender}/{p.Age}</div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-num)', fontSize: '14px', color: 'var(--text-muted)' }}>{p.MedRecord || '—'}</td>
                  <td><span className={`triage-badge tg-${triageGrade(p.Triage).toLowerCase()}`}>{triageGrade(p.Triage)}</span></td>
                  <td>{p.Department || '—'}</td>
                  <td>{p.Diagnosis  || '—'}</td>
                  <td>{p.ArrivalTime || '—'}</td>
                  <td>
                    {buildFlags(p).length > 0
                      ? <div className="flag-badges">{buildFlags(p)}</div>
                      : '—'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </main>
  )
}
