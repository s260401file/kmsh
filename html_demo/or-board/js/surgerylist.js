// surgerylist.js — OR「手術清單」靜態原型渲染（無 API；資料來自 surgerylistData.js）
// 對齊 React SurgeryListTab：期間標題 + 總/住/門/急 統計 + 表格（含診斷欄）+ 快速鈕/自訂範圍/匯出。

// ── Clock（與其他頁一致）──
function updateClock() {
  const now = new Date();
  const days = ["日","一","二","三","四","五","六"];
  const d = now;
  const dateStr = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")} (${days[d.getDay()]})`;
  const timeStr = `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
  document.getElementById("clock-date").textContent = dateStr;
  document.getElementById("clock-time").textContent = timeStr;
}

const typeCls = t => t === "住院" ? "sl-t-in" : t === "門診" ? "sl-t-out" : t === "急診" ? "sl-t-emg" : "";
const wardCell = r => r.sourceWard ? `${r.sourceWard}${r.sourceBed ? "-" + r.sourceBed : ""}` : (r.caseTypeText || "");

function renderList() {
  const { rows, stats } = SURGERY_LIST_DATA;

  document.getElementById("sl-stat-total").textContent = `總 ${stats.total ?? 0}`;
  document.getElementById("sl-stat-in").textContent    = `住 ${stats.inpatient ?? 0}`;
  document.getElementById("sl-stat-out").textContent   = `門 ${stats.outpatient ?? 0}`;
  document.getElementById("sl-stat-emg").textContent   = `急 ${stats.emergency ?? 0}`;

  const tbody = document.getElementById("sl-tbody");
  if (!rows.length) {
    tbody.innerHTML = `<tr class="sl-empty"><td colspan="12">本期間無手術資料</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(r => {
    const cancelled = r.statusCode === "82";
    const nameCls = r.sex === "M" ? "sl-m" : r.sex === "F" ? "sl-f" : "";
    const basic = [r.sex, r.age].filter(v => v != null && v !== "").join("/");
    return `
      <tr class="${cancelled ? "sl-row sl-cancelled" : "sl-row"}"${cancelled && r.cancelReason ? ` title="取消：${r.cancelReason}"` : ""}>
        <td class="sl-col-date">
          <div class="sl-date">${(r.opDate || "").slice(0,10)}</div>
          <div class="sl-time">${r.opTime || ""}</div>
        </td>
        <td class="sl-mono">${r.chartNo || ""}</td>
        <td>
          <span class="sl-ward">${wardCell(r)}</span>
          ${r.caseTypeText ? `<span class="sl-badge ${typeCls(r.caseTypeText)}">${r.caseTypeText}</span>` : ""}
        </td>
        <td class="sl-room">${r.roomId || r.room || ""}</td>
        <td class="sl-mono">${r.department || ""}</td>
        <td>${r.anesthesia || ""}</td>
        <td>
          <span class="sl-name ${nameCls}">${r.patientName || ""}</span>
          <span class="sl-basic">${basic}</span>
          ${cancelled ? `<span class="sl-cancel-tag">取消</span>` : ""}
        </td>
        <td>${r.surgeonName || ""}</td>
        <td class="sl-col-op">${r.surgeryName || ""}</td>
        <td>${r.diagnosis || ""}</td>
        <td>${r.note || ""}</td>
        <td>${[r.scrubNurse, r.circNurse, r.anesNurse].filter(Boolean).join(" / ")}</td>
      </tr>`;
  }).join("");
}

// ── Tabs（底部）──
function initTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("ward-director").textContent = MOCK_DATA.HospitalInfo.WardDirector;
  document.getElementById("head-nurse").textContent    = MOCK_DATA.HospitalInfo.HeadNurse;

  renderList();
  updateClock();
  setInterval(updateClock, 1000);

  // 快速鈕：靜態原型僅切換長亮狀態（資料固定為今日示範）
  document.querySelectorAll(".sl-btn[data-range]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".sl-btn[data-range]").forEach(b => b.classList.remove("sl-btn-active"));
      btn.classList.add("sl-btn-active");
    });
  });

  // 匯出：靜態原型示範提示（實際版下載 xlsx，需登入）
  document.getElementById("sl-export").addEventListener("click", () => {
    alert("靜態原型：實際版將匯出手術清單 xlsx（含完整姓名，需登入後台）。");
  });
  document.getElementById("sl-go").addEventListener("click", () => {
    alert("靜態原型：實際版依自訂日期範圍查詢後端手術清單。");
  });

  initTabs();
});
