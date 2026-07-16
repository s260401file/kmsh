// 避難圖 渲染邏輯
function updateClock() {
  const now = new Date(); const days = ["日","一","二","三","四","五","六"];
  document.getElementById("clock-date").textContent = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} (${days[now.getDay()]})`;
  document.getElementById("clock-time").textContent = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("ward-director").textContent = MOCK_DATA.HospitalInfo.WardDirector;
  document.getElementById("head-nurse").textContent    = MOCK_DATA.HospitalInfo.HeadNurse;
  updateClock(); setInterval(updateClock, 1000);
  const res = await getEvacuation("ER");
  const { EmergencyGroups } = res.Data;
  // 緊急應變編組（正式版取自三班護理師今日排班的緊急編組；此為靜態示意）
  document.getElementById("emerg-groups").innerHTML = EmergencyGroups.map(g => `
    <div class="ev-resp-row">
      <span class="ev-resp-k">${g.Group}</span>
      <span class="ev-resp-n">${g.Members && g.Members.length ? g.Members.join("、") : "—"}</span>
    </div>`).join("");
});
