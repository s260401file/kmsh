// MassCasualtyTab：ER 急診站「大量傷患」分頁。
// 將目前所有佔床病人攤平成一張總表，依檢傷級別排序，並於上方顯示各級人數統計，
// 供大量傷患（MCI）情境快速掌握全院急診收治狀況。
// 資料來源：後端 /api/Board/er（自建床位主檔 ＋ Board_ER 真實在室 ＋ overlay；免 F5 輪詢）。
import { useState } from 'react'
import { useErWard } from '../../../../hooks/useErWard'
import BoardLoading from '../../../../components/BoardLoading'   // 院方資料載入中動畫
import '../tabsCss/mass-casualty.css'

// 檢傷分級：院方真實值 1/2/3 → A/B/C 三級（1→A 重症、2→B 中症、3→C 輕症）
const triageGrade = t => (t === 1 ? 'A' : (t === 2 ? 'B' : 'C'))

// 依病人狀態產生「病人註記」旗標元素陣列（死亡 / MBD / AAD / DNR / 留觀 / 住院 / 轉出入）
function buildFlags(p) {
  const flags = []
  if (p.Deceased)    flags.push(<span key="死亡" className="flag-badge flag-死亡">死亡</span>)
  if (p.Mbd)         flags.push(<span key="MBD"  className="flag-badge flag-MBD">MBD</span>)
  if (p.Aad)         flags.push(<span key="AAD"  className="flag-badge flag-AAD">AAD</span>)
  if (p.Dnr)         flags.push(<span key="DNR"  className="flag-badge flag-DNR">DNR</span>)
  if (p.Observation) flags.push(<span key="留觀" className="flag-badge flag-留觀">留觀</span>)
  if (p.Admitted)    flags.push(<span key="住院" className="flag-badge flag-住院">住院{p.AdmBedNo ? ' ' + p.AdmBedNo : ''}</span>)
  if (p.TransferOut) flags.push(<span key="轉出" className="flag-badge flag-轉出">轉出{p.TransferHospital ? `（${p.TransferHospital}）` : ''}</span>)
  if (p.TransferIn)  flags.push(<span key="轉入" className="flag-badge flag-轉入">轉入{p.TransferInHospital ? `（${p.TransferInHospital}）` : ''}</span>)
  return flags
}

// 篩選鍵 → 判定函式（'all' 顯示全部）
const MATCHERS = {
  all:         () => true,
  sevA:        p => p.Triage === 1,
  sevB:        p => p.Triage === 2,
  sevC:        p => p.Triage === 3,
  dead:        p => p.Deceased,
  transferOut: p => p.TransferOut,
  transferIn:  p => p.TransferIn,
}

export default function MassCasualtyTab() {
  const { beds, loading } = useErWard('ER')
  const [filter, setFilter] = useState('all')   // 目前選取的統計篩選（點統計卡切換）
  // 取出所有佔床病人（含未配置床），攤平為含床號的病人陣列，並依檢傷級別（數字小=重）排序
  const patients = beds
    .filter(b => b.Status !== 'empty' && b.Patient)
    .map(b => ({ ...b.Patient, BedId: b.BedId }))
    .sort((a, b) => (a.Triage ?? 99) - (b.Triage ?? 99))

  // 各統計數：A 重症、B 中症、C 輕症、死亡、轉出、轉入
  const sevA  = patients.filter(p => p.Triage === 1).length
  const sevB  = patients.filter(p => p.Triage === 2).length
  const sevC  = patients.filter(p => p.Triage === 3).length
  const dead        = patients.filter(p => p.Deceased).length
  const transferOut = patients.filter(p => p.TransferOut).length
  const transferIn  = patients.filter(p => p.TransferIn).length

  // 點同一張卡再按一次 → 取消回全部；點「病患總數」亦回全部
  const handleFilter = k => setFilter(f => (f === k ? 'all' : k))
  const shown = patients.filter(MATCHERS[filter] ?? MATCHERS.all)

  if (loading) return <main className="main-content"><BoardLoading /></main>   // 院方資料載入中

  return (
    <main className="main-content">
      <div className="mc-panel">

        {/* 統計橫列（點卡片可篩選下方清單，再點一次取消） */}
        <div className="mc-stats-row">
          <div className={`mc-stat-card${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>
            <div className="mc-stat-val val-total">{patients.length}</div>
            <div className="mc-stat-lbl">病患總數</div>
          </div>
          <div className={`mc-stat-card${filter === 'sevA' ? ' active' : ''}`} onClick={() => handleFilter('sevA')}>
            <div className="mc-stat-val val-critical">{sevA}</div>
            <div className="mc-stat-lbl">A級 重症</div>
          </div>
          <div className={`mc-stat-card${filter === 'sevB' ? ' active' : ''}`} onClick={() => handleFilter('sevB')}>
            <div className="mc-stat-val val-mid">{sevB}</div>
            <div className="mc-stat-lbl">B級 中症</div>
          </div>
          <div className={`mc-stat-card${filter === 'sevC' ? ' active' : ''}`} onClick={() => handleFilter('sevC')}>
            <div className="mc-stat-val val-moderate">{sevC}</div>
            <div className="mc-stat-lbl">C級 輕症</div>
          </div>
          <div className={`mc-stat-card${filter === 'dead' ? ' active' : ''}`} onClick={() => handleFilter('dead')}>
            <div className="mc-stat-val val-dead">{dead}</div>
            <div className="mc-stat-lbl">死亡</div>
          </div>
          <div className={`mc-stat-card${filter === 'transferOut' ? ' active' : ''}`} onClick={() => handleFilter('transferOut')}>
            <div className="mc-stat-val val-transfer">{transferOut}</div>
            <div className="mc-stat-lbl">轉出</div>
          </div>
          <div className={`mc-stat-card${filter === 'transferIn' ? ' active' : ''}`} onClick={() => handleFilter('transferIn')}>
            <div className="mc-stat-val val-transfer-in">{transferIn}</div>
            <div className="mc-stat-lbl">轉入</div>
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
              {shown.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>{patients.length === 0 ? '目前無病患資料' : '無符合此篩選的病患'}</td></tr>
              ) : shown.map(p => (
                <tr key={p.BedId}>
                  <td className="mc-bed">{p.BedId}</td>
                  <td className="mc-patient">
                    <span className={p.Gender === 'M' ? 'gender-m' : 'gender-f'}>{p.PatientName}</span>
                    <div className="mc-basic">{p.Gender}/{p.Age}</div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-num)', fontSize: '14px', color: 'var(--text-muted)' }}>{p.MedRecord || '—'}</td>
                  <td>{p.Triage ? <span className={`triage-badge tg-${triageGrade(p.Triage).toLowerCase()}`}>{triageGrade(p.Triage)}</span> : '—'}</td>
                  <td>{p.Department || '—'}</td>
                  <td>{p.Diagnosis  || '—'}</td>
                  <td>{(p.ArrivalDate || p.ArrivalTime) ? `${p.ArrivalDate || ''} ${p.ArrivalTime || ''}`.trim() : '—'}</td>
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
