// AntibioticTab.jsx — ICU 抗生素分頁
// 角色：床位格狀圖標示哪些病人正使用抗生素（有用藥者床卡加紅框並顯示筆數徽章），
//       點擊床位開啟該病人的抗生素清單彈窗；底部為各類抗生素統計面板。
import { useState, useMemo } from 'react'
import MOCK_DATA from '../mockData'
import { getAbxByBedId, getAbxStats } from '../tabsData/antibioticData'

// 單張床位卡片。props：bed 床資料、onClick 點擊（空床不傳）
function BedCard({ bed, onClick }) {
  const bedLabel = `${bed.floor}F-${String(bed.num).padStart(2, '0')}`
  const abxList = getAbxByBedId(bed.id) // 該床的抗生素紀錄
  const hasAbx = abxList.length > 0     // 是否有用藥（決定紅框與筆數徽章）

  if (bed.status === 'empty') {
    return (
      <div className={`bed-card empty bed-${bed.id}`}>
        <div className="empty-bed-num">{bedLabel}</div>
        <div className="empty-label">空床</div>
      </div>
    )
  }
  const p = bed.patient
  return (
    <div
      className={`bed-card ${bed.status} bed-${bed.id}${hasAbx ? ' ab-has-abx' : ''}`}
      onClick={onClick}
    >
      <div className="card-row1">
        <span className="bed-num">{bedLabel}</span>
        {hasAbx && <span className="ab-count-badge">{abxList.length}</span>}
      </div>
      <div className="card-row2">
        <span className={`patient-name ${p.gender === 'M' ? 'gender-m' : 'gender-f'}`}>{p.name}</span>
        <span className="patient-basic">{p.gender}/{p.age}</span>
      </div>
    </div>
  )
}

// 抗生素清單彈窗。props：bed 該床資料、onClose 關閉回呼
function AbxModal({ bed, onClose }) {
  const bedLabel = `${bed.floor}F-${String(bed.num).padStart(2, '0')}`
  const p = bed.patient
  const abxList = getAbxByBedId(bed.id) // 表格列出每筆藥品的起訖與首次給藥時間
  return (
    <div className="ab-modal-overlay show" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ab-modal-box">
        <div className="ab-modal-header">
          <div style={{display:'flex',alignItems:'baseline',gap:'8px',flexWrap:'wrap'}}>
            <span className="ab-modal-bed">{bedLabel}</span>
            <span className="ab-modal-name">{p.name}</span>
            <span className="ab-modal-rec">病歷號：{p.medRecord}</span>
          </div>
          <button className="ab-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="ab-modal-body">
          {abxList.length === 0
            ? <div className="ab-modal-empty">此病人目前無抗生素使用紀錄</div>
            : (
              <table className="ab-table">
                <thead>
                  <tr><th>藥品名稱</th><th>開始時間</th><th>首次給藥時間</th><th>結束時間</th></tr>
                </thead>
                <tbody>
                  {abxList.map(ab => (
                    <tr key={ab.antibioticId}>
                      <td className="ab-td-drug">{ab.drugName}</td>
                      <td className="ab-td-time">{ab.startDateTime}</td>
                      <td className="ab-td-time">{ab.firstDoseDateTime}</td>
                      <td className="ab-td-time">{ab.endDateTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
        <div className="ab-modal-footer">
          <button className="ab-btn-close" onClick={onClose}>關閉</button>
        </div>
      </div>
    </div>
  )
}

export default function AntibioticTab() {
  const [selectedBed, setSelectedBed] = useState(null)   // 目前開啟清單的床（null=未開）
  const stats = useMemo(() => getAbxStats(), [])          // 抗生素統計（資料固定，只算一次）
  const f4beds = MOCK_DATA.beds.filter(b => b.floor === 4) // 4F 床位
  const f3beds = MOCK_DATA.beds.filter(b => b.floor === 3) // 3F 床位

  return (
    <main className="main-content">
      <div className="floor-section floor-4f">
        <div className="floor-title">▌ 4F　共 20 床</div>
        <div className="floor-beds">
          <div className="grid-4f">
            {f4beds.map(bed => (
              <BedCard key={bed.id} bed={bed}
                onClick={bed.status !== 'empty' ? () => setSelectedBed(bed) : undefined} />
            ))}
          </div>
        </div>
      </div>

      <div className="floor-section floor-3f">
        <div className="floor-title">▌ 3F　共 5 床</div>
        <div className="floor-beds">
          <div className="grid-3f">
            {f3beds.map(bed => (
              <BedCard key={bed.id} bed={bed}
                onClick={bed.status !== 'empty' ? () => setSelectedBed(bed) : undefined} />
            ))}
          </div>
        </div>
        {/* 抗生素統計面板 */}
        <div className="ward-stats">
          <div className="ws-row">
            <div className="ws-item"><div className="ws-value">{stats.total}</div><div className="ws-label">抗生素總筆</div></div>
            <div className="ws-item"><div className="ws-value ws-abx-4f">{stats.f4}</div><div className="ws-label">4F 筆數</div></div>
            <div className="ws-item"><div className="ws-value ws-abx-3f">{stats.f3}</div><div className="ws-label">3F 筆數</div></div>
            <div className="ws-item"><div className="ws-value ws-abx-beds">{stats.beds}</div><div className="ws-label">使用床位</div></div>
          </div>
          <div className="ws-row">
            <div className="ws-item"><div className="ws-value ws-abx-vanc">{stats.vanc}</div><div className="ws-label">Vancomycin</div></div>
            <div className="ws-item"><div className="ws-value ws-abx-mero">{stats.mero}</div><div className="ws-label">Meropenem</div></div>
            <div className="ws-item"><div className="ws-value ws-abx-pip">{stats.pip}</div><div className="ws-label">Pip/Tazo</div></div>
            <div className="ws-item"><div className="ws-value ws-abx-other">{stats.other}</div><div className="ws-label">其他</div></div>
          </div>
        </div>
      </div>

      {/* 有選取床位時才渲染抗生素清單彈窗 */}
      {selectedBed && <AbxModal bed={selectedBed} onClose={() => setSelectedBed(null)} />}
    </main>
  )
}
