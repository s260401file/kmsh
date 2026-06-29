// TeamTab：照護團隊分頁
// 角色：依角色分組（病房主管/主治/住院醫師/專師/護理師/醫事人員）以卡片＋表格列出成員與分機。
import { usePolling } from '../../../../hooks/usePolling'
import * as wardApi from '../../../../services/wardApi'
import { CENSUS_MS } from '../../../../config/pollingConfig'
import '../tabsCss/team.css'

export default function TeamTab() {
  // 後端 /api/Board/W52/team（人員管理依 GroupKey 分組；免 F5 輪詢）
  const { data } = usePolling(() => wardApi.getTeam('W52'), { intervalMs: CENSUS_MS, deps: ['W52-team'] })
  const TeamGroups = data?.teamGroups ?? []
  // 加總各組人數，顯示於標題（共 N 人）
  const totalMembers = TeamGroups.reduce((sum, g) => sum + g.members.length, 0)
  return (
    <main className="main-content">
      <div className="tm-panel">
        <div className="tm-title">
          <span className="tm-title-bar"></span>
          照護團隊
          <span className="tm-title-meta">共 {totalMembers} 人</span>
        </div>
        <div className="tm-grid">
          {TeamGroups.map(group => (
            <div key={group.groupKey} className="tm-card">
              <div className="tm-card-header">
                <span className={`tm-card-accent tm-accent-${group.groupKey}`}></span>
                <span className="tm-card-title">{group.groupName}</span>
                <span className="tm-card-count">{group.members.length} 人</span>
              </div>
              <table className="tm-table">
                <thead>
                  <tr><th>職別</th><th>姓名</th><th>科別/專長</th><th>分機</th></tr>
                </thead>
                <tbody>
                  {group.members.length === 0
                    ? <tr className="tm-empty-row"><td colSpan="4">—</td></tr>
                    : group.members.map(m => (
                      <tr key={m.teamId} className={group.groupKey === 'leader' ? 'tm-row-leader' : ''}>
                        <td className="tm-td-role">{m.role}</td>
                        <td>{m.name}</td>
                        <td className="tm-td-dept">{m.department}</td>
                        <td className="tm-td-ext">{m.ext}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
