// HandoverTab：OR 手術室站「術後特殊交班」分頁
// 以表格列出術後需特別交班的病患：刀房/來源、病患、術式、主刀、轉往病房床位、
// 出血/輸血量、引流管、特殊照護注意事項。供接手單位掌握重點。
// 資料來源：後端 /api/Board/or/handover（自建 OrHandover；免 F5 輪詢）。無資料時顯示「今日無特殊交班事項」。
import { usePolling } from '../../../../hooks/usePolling'
import * as wardApi from '../../../../services/wardApi'
import { BULLETIN_MS } from '../../../../config/pollingConfig'
import '../tabsCss/handover.css'

export default function HandoverTab() {
  const { data } = usePolling(() => wardApi.getOrHandover(), { intervalMs: BULLETIN_MS, deps: ['OR'] })
  const items = data?.Data?.Items ?? []   // 特殊交班項目清單

  return (
    <main className="main-content">
      <div className="ho-panel">

        <div className="ho-header-row">
          <div className="ho-title">特殊交班事項</div>
          <span className="ho-count-badge">{items.length} 筆</span>
        </div>

        <div className="ho-table-wrap">
          <table className="ho-table">
            <thead>
              <tr>
                <th>刀房 / 來源</th>
                <th>病患</th>
                <th>術式</th>
                <th>手術醫師</th>
                <th>轉往</th>
                <th>出血 / 輸血</th>
                <th>引流管</th>
                <th>特殊事項</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr className="ho-empty-row"><td colSpan={8}>今日無特殊交班事項</td></tr>
              ) : items.map(item => (
                <tr key={item.HandoverId} className="ho-row">
                  <td className="ho-td-room">
                    <span className="ho-room-badge">{item.RoomId}</span>
                    <span className={`badge badge-${item.SurgerySource} ho-src-badge`}>{item.SurgerySource}</span>
                  </td>
                  <td className="ho-td-patient">
                    <div className={`ho-patient-name ${item.Gender === 'M' ? 'gender-m' : 'gender-f'}`}>{item.PatientName}</div>
                    <div className="ho-basic">{item.Gender}/{item.Age}　{item.MedRecord}</div>
                  </td>
                  <td className="ho-td-surgery">{item.SurgeryName}</td>
                  <td className="ho-td-surgeon">{item.SurgeonName}</td>
                  <td className="ho-td-dest">
                    <div className="ho-dest-ward">{item.DestWard}</div>
                    <div className="ho-dest-bed">{item.DestBed}</div>
                  </td>
                  <td className="ho-td-blood">
                    {item.BloodLoss ? `出血 ${item.BloodLoss} mL` : '—'}
                    <br />
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {item.BloodTransfusion ? `輸血 ${item.BloodTransfusion} 單位` : '無'}
                    </span>
                  </td>
                  <td className="ho-td-drain">{item.DrainDetails}</td>
                  <td className="ho-td-notes">{item.SpecialNotes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </main>
  )
}
