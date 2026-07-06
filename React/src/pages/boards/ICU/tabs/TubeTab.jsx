// TubeTab.jsx — ICU 管路分頁
// 角色：以表格逐床列出各類管路使用狀態，每欄打勾(✓)或槓號(—)；底部彙整各管路使用人數。
//   管路類別：呼吸器(ETT 氣管內管)、鼻胃管(NG)、導尿管(Foley)、中心靜脈導管(CVC)、CRRT(連續性腎臟替代療法)。
import { useMemo } from 'react'
import { useIcuWard } from '../../../../hooks/useIcuWard'   // 與病室動態同源（真實在床＋後台管路勾選）
import BoardLoading from '../../../../components/BoardLoading'   // 院方資料載入中動畫（同病室動態）

export default function TubeTab() {
  const { beds, loading } = useIcuWard('ICU')   // 管路旗標來自後台「病人臨床補充」overlay，免 F5 輪詢
  // 取出所有非空床且有病人的床位
  const patients = useMemo(() =>
    beds.filter(b => b.status !== 'empty' && b.patient),
    [beds]
  )

  // 各管路使用人數統計，供底部彙總列顯示
  const stats = useMemo(() => ({
    ett:   patients.filter(b => b.patient.ventilator).length,
    ng:    patients.filter(b => b.patient.ng).length,
    foley: patients.filter(b => b.patient.foley).length,
    cvc:   patients.filter(b => b.patient.cvc).length,
    crrt:  patients.filter(b => b.patient.crrt).length,
  }), [patients])

  // 表格中表示「有/無」的小元件
  const Check = () => <span className="tb-check">✓</span>
  const None  = () => <span className="tb-none">—</span>

  if (loading) return <main className="main-content"><BoardLoading /></main>   // 院方資料載入中（同病室動態）

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
              {/* 逐床一列；姓名依性別著色（男藍、女桃紅） */}
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

        {/* 底部彙總：各管路目前使用人數 */}
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
