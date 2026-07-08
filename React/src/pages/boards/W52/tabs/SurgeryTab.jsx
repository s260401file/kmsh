// SurgeryTab：W52 手術資訊分頁
// 角色：列出「目前 W52 在床病人」當日的手術，依狀態排序（只顯示當日、無日期切換）。
// 資料來源：後端 /api/Board/W52/surgeries（讀本地 OrSurgery，比對 W52 在床病歷號；免 F5 輪詢）。
import { useMemo } from 'react'
import { usePolling } from '../../../../hooks/usePolling'
import * as wardApi from '../../../../services/wardApi'
import { CENSUS_MS } from '../../../../config/pollingConfig'
import '../tabsCss/surgery.css'

const STATUS_ORDER = ['手術中','待手術','已完成','取消']      // 列表排序優先序

export default function SurgeryTab() {
  // 後端已只回「W52 在床病人當日手術」，前端不再做日期過濾；與病室動態在床名單同頻(20s)輪詢
  const { data } = usePolling(() => wardApi.getUnitSurgeries('W52'), { intervalMs: CENSUS_MS, deps: ['W52'] })

  const items = useMemo(() =>
    [...(data ?? [])].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)),
    [data])

  return (
    <main className="main-content">
      <div className="surg-panel">
        <div className="surg-title">
          <span className="surg-title-bar"></span>
          手術資訊
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
                  <th>刀房</th><th>排程時間</th><th>姓名</th>
                  <th>術式</th><th>診斷</th><th>麻醉方式</th><th>主治醫師</th>
                  <th className="surg-th-center">狀態</th>
                </tr>
              </thead>
              <tbody>
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
