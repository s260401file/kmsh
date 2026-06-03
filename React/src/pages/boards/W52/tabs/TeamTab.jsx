import TEAM_DATA from '../tabsData/teamData'
import '../tabsCss/team.css'

export default function TeamTab() {
  const { TeamGroups } = TEAM_DATA.Data
  const totalMembers = TeamGroups.reduce((sum, g) => sum + g.Members.length, 0)
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
            <div key={group.GroupKey} className="tm-card">
              <div className="tm-card-header">
                <span className={`tm-card-accent tm-accent-${group.GroupKey}`}></span>
                <span className="tm-card-title">{group.GroupName}</span>
                <span className="tm-card-count">{group.Members.length} 人</span>
              </div>
              <table className="tm-table">
                <thead>
                  <tr><th>職別</th><th>姓名</th><th>科別/專長</th><th>分機</th></tr>
                </thead>
                <tbody>
                  {group.Members.length === 0
                    ? <tr className="tm-empty-row"><td colSpan="4">—</td></tr>
                    : group.Members.map(m => (
                      <tr key={m.TeamId} className={group.GroupKey === 'leader' ? 'tm-row-leader' : ''}>
                        <td className="tm-td-role">{m.Role}</td>
                        <td>{m.Name}</td>
                        <td className="tm-td-dept">{m.Department}</td>
                        <td className="tm-td-ext">{m.Ext}</td>
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
