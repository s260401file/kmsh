// 特殊交班 渲染邏輯
function updateClock() {
  const now = new Date(); const days = ["日","一","二","三","四","五","六"];
  document.getElementById("clock-date").textContent = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} (${days[now.getDay()]})`;
  document.getElementById("clock-time").textContent = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("ward-director").textContent = MOCK_DATA.HospitalInfo.WardDirector;
  document.getElementById("head-nurse").textContent    = MOCK_DATA.HospitalInfo.HeadNurse;
  updateClock(); setInterval(updateClock, 1000);

  const res = await getHandover("OR", "2026-06-03");
  const items = res.Data.Items;

  document.getElementById("ho-count").textContent = items.length + " 筆";

  const tbody = document.getElementById("ho-list");
  if (!items.length) {
    tbody.innerHTML = `<tr class="ho-empty-row"><td colspan="8">今日無特殊交班事項</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(item => {
    const srcCls = item.SurgerySource === "急診刀" ? "src-er" : item.SurgerySource === "門診刀" ? "src-op" : "src-inp";
    const statusStr = item.EndTime ? `完成 ${item.EndTime}` : "進行中";
    const blood = item.BloodLoss ? `出血 ${item.BloodLoss} mL` : "—";
    const transfusion = item.BloodTransfusion ? `輸血 ${item.BloodTransfusion} 單位` : "無";
    return `<tr class="ho-row">
      <td class="ho-td-room">
        <span class="ho-room-badge">${item.RoomId}</span>
        <span class="badge badge-${item.SurgerySource} ho-src-badge">${item.SurgerySource}</span>
      </td>
      <td class="ho-td-patient">
        <div class="ho-patient-name ${item.Gender==='M'?'gender-m':'gender-f'}">${item.PatientName}</div>
        <div class="ho-basic">${item.Gender}/${item.Age}　${item.MedRecord}</div>
      </td>
      <td class="ho-td-surgery">${item.SurgeryName}</td>
      <td class="ho-td-surgeon">${item.SurgeonName}</td>
      <td class="ho-td-dest">
        <div class="ho-dest-ward">${item.DestWard}</div>
        <div class="ho-dest-bed">${item.DestBed}</div>
      </td>
      <td class="ho-td-blood">${blood}<br><span style="font-size:12px;color:var(--text-muted)">${transfusion}</span></td>
      <td class="ho-td-drain">${item.DrainDetails}</td>
      <td class="ho-td-notes">${item.SpecialNotes}</td>
    </tr>`;
  }).join("");
});
