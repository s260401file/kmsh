// HandoverTab：護理交班分頁
// 角色：頂部橫條顯示交班→接班的班別、時間與交/接班護理師；
//       下方為各病患交班卡，依優先序（高/中/一般）標示色條，逐項列出交班事項（管路/用藥/警示…）。
import { usePolling } from '../../../../hooks/usePolling'
import * as wardApi from '../../../../services/wardApi'
import { CENSUS_MS } from '../../../../config/pollingConfig'
import '../tabsCss/handover.css'

export default function HandoverTab() {
  // 後端 /api/Board/W52/handover（自建交班 header＋病人卡＋事項；免 F5 輪詢）
  const { data } = usePolling(() => wardApi.getHandover('W52'), { intervalMs: CENSUS_MS, deps: ['W52-ho'] })
  const HandoverInfo = data?.handoverInfo ?? null
  const Patients = data?.patients ?? []

  if (!HandoverInfo) {
    return <main className="main-content"><div className="ho-panel"><div className="ho-title"><span className="ho-title-bar"></span>護理交班</div><div style={{padding:'40px',textAlign:'center',color:'#90A4AE'}}>本日尚無交班資料</div></div></main>
  }
  // 依交/接班別組出色票 class（ho-pill-白班 等）
  const fromPill = `ho-pill-${HandoverInfo.fromShift}`
  const toPill   = `ho-pill-${HandoverInfo.toShift}`
  return (
    <main className="main-content">
      <div className="ho-panel">
        <div className="ho-title">
          <span className="ho-title-bar"></span>
          護理交班
          <span className="ho-title-meta">{HandoverInfo.fromShift} → {HandoverInfo.toShift}</span>
        </div>

        {/* 交班資訊橫條 */}
        <div className="ho-meta-bar">
          <div className="ho-meta-block">
            <span className="ho-meta-label">交班</span>
            <span className={`ho-meta-pill ${fromPill}`}>{HandoverInfo.fromShift}</span>
            <span className="ho-meta-arrow">→</span>
            <span className={`ho-meta-pill ${toPill}`}>{HandoverInfo.toShift}</span>
          </div>
          <div className="ho-meta-block">
            <span className="ho-meta-label">時間</span>
            <span className="ho-meta-time">{HandoverInfo.handoverTime}</span>
          </div>
          <div className="ho-meta-block">
            <span className="ho-meta-label">交班</span>
            <span className="ho-meta-nurses">{(HandoverInfo.fromNurses ?? []).join('、')}</span>
          </div>
          <div className="ho-meta-block">
            <span className="ho-meta-label">接班</span>
            <span className="ho-meta-nurses">{(HandoverInfo.toNurses ?? []).join('、')}</span>
          </div>
        </div>

        {/* 病患交班卡片 */}
        <div className="ho-list">
          {Patients.map(p => (
            <div key={p.handoverId} className="ho-card">
              <div className={`ho-priority-bar ho-bar-${p.priority}`} />
              <div className="ho-card-body">
                <div className="ho-card-top">
                  <span className="ho-bed-label">床</span>
                  <span className="ho-bed-no">{p.bedNo}</span>
                  <span className={`ho-patient-name ho-gender-${p.gender === 'M' ? 'm' : 'f'}`}>{p.patientName}</span>
                  <span className="ho-basic">{p.gender}/{p.age}</span>
                  <span className={`ho-priority-badge ho-pri-${p.priority}`}>{p.priority}</span>
                </div>
                <div className="ho-diagnosis">{p.diagnosis}</div>
                <div className="ho-items">
                  {(p.items ?? []).map((item, i) => (
                    <div key={i} className="ho-item">
                      <span className={`ho-cat-badge ho-cat-${item.category}`}>{item.category}</span>
                      <span className="ho-item-content">{item.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
