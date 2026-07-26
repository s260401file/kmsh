// ──────────────────────────────────────────────────────────────
// reveal.js — 值班表聯絡資訊個資遮蔽（對應 React components/ContactReveal.jsx）
// 常開大螢幕上，凡聯絡資訊「數字位數 > 9」（手機 10 碼）即改顯示「點我顯示」，
// 點擊跳窗顯示完整聯絡資訊；9 位數以內（分機、市話含區碼）照常顯示。
// ──────────────────────────────────────────────────────────────

// 數字字元數 > 9 視為敏感（只算 0-9，忽略 #、-、空白）
function isSensitiveContact(v) {
  return (String(v == null ? "" : v).match(/\d/g) || []).length > 9;
}

// 單一聯絡值 HTML：敏感→「點我顯示」按鈕；否則原樣顯示（保留傳入 className）
function contactValueHTML(label, value, className) {
  const v   = value == null ? "" : String(value);
  const cls = `cr-reveal ${className || ""}`.trim();
  if (isSensitiveContact(v)) {
    return `<button type="button" class="${cls}" data-label="${label || ""}" data-value="${v}">點我顯示</button>`;
  }
  return `<span class="${className || ""}">${v}</span>`;
}

// 彈窗（自包含，掛到 document.body）
function ensureRevealModal() {
  if (document.getElementById("cr-overlay")) return;
  const ov = document.createElement("div");
  ov.id = "cr-overlay";
  ov.className = "cr-overlay";
  ov.style.display = "none";
  ov.innerHTML =
    '<div class="cr-box" role="dialog" aria-modal="true">' +
    '<div class="cr-label" id="cr-label"></div>' +
    '<div class="cr-value" id="cr-value"></div>' +
    '<button type="button" class="cr-close" id="cr-close">關閉</button>' +
    '</div>';
  document.body.appendChild(ov);
  ov.addEventListener("click", e => { if (e.target === ov) closeReveal(); });
  document.getElementById("cr-close").addEventListener("click", closeReveal);
}

function openReveal(label, value) {
  ensureRevealModal();
  const l = document.getElementById("cr-label");
  l.textContent = label || "";
  l.style.display = label ? "" : "none";
  document.getElementById("cr-value").textContent = value;
  document.getElementById("cr-overlay").style.display = "flex";
}

function closeReveal() {
  const ov = document.getElementById("cr-overlay");
  if (ov) ov.style.display = "none";
}

// 事件委派：任何 .cr-reveal 點擊皆跳窗（含動態渲染出的按鈕）
document.addEventListener("click", e => {
  const btn = e.target.closest && e.target.closest(".cr-reveal");
  if (btn) { e.stopPropagation(); openReveal(btn.dataset.label, btn.dataset.value); }
});
