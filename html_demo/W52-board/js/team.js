// ──────────────────────────────────────────────────────────────
// 照護團隊 渲染邏輯
// §7.1.2 (12) 照護團隊：科別、職別、姓名、電話/分機
// React 對應：<TeamGrid /> → 多個 <TeamGroupCard />
// ──────────────────────────────────────────────────────────────

function updateClock() {
  const now  = new Date();
  const days = ["日","一","二","三","四","五","六"];
  const dateStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} (${days[now.getDay()]})`;
  const timeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
  document.getElementById("clock-date").textContent = dateStr;
  document.getElementById("clock-time").textContent = timeStr;
}

// ── 單一群組卡片 ──
// React 對應：<TeamGroupCard group={group} />
function renderTeamGroupCard(group) {
  const rowsHtml = group.Members.map(m => {
    const isLeader = group.GroupKey === "leader";
    return `
      <tr class="${isLeader ? "tm-row-leader" : ""}">
        <td class="tm-td-role">${m.Role}</td>
        <td>${m.Name}</td>
        <td class="tm-td-dept">${m.Department}</td>
        <td class="tm-td-ext">${m.Ext}</td>
        <td class="tm-td-mobile">${m.Mobile || "—"}</td>
      </tr>`;
  }).join("");

  return `
    <div class="tm-card">
      <div class="tm-card-header">
        <span class="tm-card-accent tm-accent-${group.GroupKey}"></span>
        <span class="tm-card-title">${group.GroupName}</span>
        <span class="tm-card-count">${group.Members.length} 人</span>
      </div>
      <table class="tm-table">
        <thead>
          <tr>
            <th>職別</th>
            <th>姓名</th>
            <th>科別 / 專長</th>
            <th>分機</th>
            <th>手機</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;
}

// ── 照護團隊列表 ──
// React 對應：<TeamGrid groups={groups} />
function renderTeamGrid(groups) {
  const el = document.getElementById("team-grid");

  if (!groups.length) {
    el.innerHTML = `<div style="grid-column:1/-1;padding:32px;text-align:center;color:var(--text-muted);font-size:17px;">無照護團隊資料</div>`;
    return;
  }

  el.innerHTML = groups.map(renderTeamGroupCard).join("");

  // 標題列總人數
  const total = groups.reduce((sum, g) => sum + g.Members.length, 0);
  const groupCount = groups.length;
  document.getElementById("tm-total").textContent = `共 ${groupCount} 群組・${total} 位成員`;
}

// ── 入口 ──
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("ward-director").textContent = "吳○明";
  document.getElementById("head-nurse").textContent    = "林○芳";

  updateClock();
  setInterval(updateClock, 1000);

  const res = await getTeam("W52");
  if (!res.Success) {
    document.getElementById("team-grid").innerHTML =
      `<div style="grid-column:1/-1;padding:32px;text-align:center;color:var(--text-muted);">資料載入失敗</div>`;
    return;
  }

  renderTeamGrid(res.Data.TeamGroups);
});
