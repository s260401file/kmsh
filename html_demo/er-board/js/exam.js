// 檢查/會診 渲染邏輯
function updateClock() {
  const now = new Date(); const days = ["日","一","二","三","四","五","六"];
  document.getElementById("clock-date").textContent = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} (${days[now.getDay()]})`;
  document.getElementById("clock-time").textContent = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("ward-director").textContent = MOCK_DATA.HospitalInfo.WardDirector;
  document.getElementById("head-nurse").textContent    = MOCK_DATA.HospitalInfo.HeadNurse;
  updateClock(); setInterval(updateClock, 1000);

  const res = await getExamConsult("ER", "2026-06-03");
  const { Exams, Consults } = res.Data;

  document.getElementById("ec-exam-count").textContent   = Exams.length   ? `${Exams.length} 筆`   : "";
  document.getElementById("ec-consult-count").textContent = Consults.length ? `${Consults.length} 筆` : "";

  document.getElementById("ec-exam-list").innerHTML = Exams.map(e => `
    <tr>
      <td class="ec-bed">${e.BedId}</td>
      <td>${e.PatientName}</td>
      <td>${e.ExamName}</td>
      <td><span class="ec-status ec-status-${e.Status}">${e.Status}</span></td>
      <td>${e.TimeSlot}</td>
      <td class="ec-note">${e.Notes || "—"}</td>
    </tr>`).join("");

  document.getElementById("ec-consult-list").innerHTML = Consults.map(c => `
    <tr>
      <td class="ec-bed">${c.BedId}</td>
      <td>${c.PatientName}</td>
      <td>${c.ConsultDept}</td>
      <td>${c.ConsultDoctor}</td>
      <td><span class="ec-status ec-status-${c.Status}">${c.Status}</span></td>
      <td class="ec-note">${c.Notes || "—"}</td>
    </tr>`).join("");
});
