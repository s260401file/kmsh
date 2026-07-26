// TeamTab：照護團隊分頁
// 角色：帶入「值班醫師」（今日 on-call）與「W52 護理人員」（人員管理名冊），
//       欄位：科別／職別／姓名／電話·分機。手機號沿用 ContactReveal 遮蔽（>9 位→點我顯示）。
import { useState } from 'react'
import { usePolling } from '../../../../hooks/usePolling'
import * as wardApi from '../../../../services/wardApi'
import { CENSUS_MS } from '../../../../config/pollingConfig'
import { ContactValue, ContactRevealModal } from '../../../../components/ContactReveal'
import '../tabsCss/team.css'

export default function TeamTab() {
  const [reveal, setReveal] = useState(null)   // 聯絡資訊遮蔽：點「點我顯示」跳窗
  // 值班醫師：今日 on-call（後台「顯示值班醫師」所選科別當日值班）
  const { data: onCall } = usePolling(() => wardApi.getOnCallBoardForUnit('W52'), { intervalMs: CENSUS_MS, deps: ['W52-team-oncall'] })
  // 護理人員：W52 全部護理人員名冊（人員管理）
  const { data: roles } = usePolling(() => wardApi.getUnitRoles(null, 'W52', false), { intervalMs: CENSUS_MS, deps: ['W52-team-roles'] })

  const docs = (onCall ?? []).filter(d => d.doctorName)
    .map((d, i) => ({ teamId: `doc-${d.deptCode || i}`, dept: d.deptName, role: '值班醫師', name: d.doctorName, ext: d.ext, mobile: d.mobile }))
  const seen = new Set()
  const nurses = (roles ?? []).filter(r => (r.role || '').includes('護理') && !seen.has(r.staffId) && seen.add(r.staffId))
    .map(r => ({ teamId: `nur-${r.staffId}`, dept: r.department, role: r.role, name: r.name, ext: r.ext, mobile: r.mobile }))
  const teamGroups = [
    { groupKey: 'attending', groupName: '值班醫師', members: docs },
    { groupKey: 'nurse', groupName: '護理人員', members: nurses },
  ]
  const totalMembers = teamGroups.reduce((sum, g) => sum + g.members.length, 0)

  return (
    <>
      <main className="main-content">
        <div className="tm-panel">
          <div className="tm-title">
            <span className="tm-title-bar"></span>
            照護團隊
            <span className="tm-title-meta">共 {totalMembers} 人</span>
          </div>
          <div className="tm-grid">
            {teamGroups.map(group => (
              <div key={group.groupKey} className="tm-card">
                <div className="tm-card-header">
                  <span className={`tm-card-accent tm-accent-${group.groupKey}`}></span>
                  <span className="tm-card-title">{group.groupName}</span>
                  <span className="tm-card-count">{group.members.length} 人</span>
                </div>
                <table className="tm-table">
                  <thead>
                    <tr><th>科別</th><th>職別</th><th>姓名</th><th>電話/分機</th></tr>
                  </thead>
                  <tbody>
                    {group.members.length === 0
                      ? <tr className="tm-empty-row"><td colSpan="4">—</td></tr>
                      : group.members.map(m => {
                        const contacts = [m.ext, m.mobile].filter(Boolean)
                        return (
                          <tr key={m.teamId}>
                            <td className="tm-td-dept">{m.dept || '—'}</td>
                            <td className="tm-td-role">{m.role}</td>
                            <td>{m.name}</td>
                            <td className="tm-td-ext">
                              {contacts.length === 0 ? '—' : contacts.map((v, i) => (
                                <span key={i}>
                                  {i > 0 && <span style={{ margin: '0 6px', color: 'var(--divider)' }}>·</span>}
                                  <ContactValue label={`${m.role || ''} ${m.name || ''}`.trim()} value={v} onReveal={setReveal} />
                                </span>
                              ))}
                            </td>
                          </tr>
                        )
                      })
                    }
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      </main>
      <ContactRevealModal reveal={reveal} onClose={() => setReveal(null)} />
    </>
  )
}
