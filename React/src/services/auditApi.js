// auditApi.js — 操作稽核 API 客戶端
// 角色：查詢後端 /api/Audit/operations（僅系統管理員）。
// 稽核「寫入」不經前端——後端全域 OperationAuditFilter 對所有修改類請求自動記錄。
import { apiFetch } from './http'

const BASE = '/api/Audit'

// 統一處理回應：非 2xx 丟出錯誤；其餘解析 JSON
async function handle(res) {
  if (!res.ok) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`) }
  return res.json()
}

// GET /api/Audit/operations?from=&to=&empNo=&page=&pageSize= → { total, page, pageSize, rows[] }
// 注意：to 為「排除上界」（查 7/4 一整天 → from=2026-07-04、to=2026-07-05），由呼叫端換算。
export async function getOperations({ from, to, empNo, page = 1, pageSize = 50 } = {}) {
  const p = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (from) p.set('from', from)
  if (to) p.set('to', to)
  if (empNo) p.set('empNo', empNo)
  return handle(await apiFetch(`${BASE}/operations?${p}`))
}
