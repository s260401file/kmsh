// useErWard.js — ER 急診病室動態資料 Hook
// 角色：定時輪詢後端聚合看板（自建床位主檔 ErBed 鋪平面圖 ＋ Board_ER 真實在室病人 ＋
//       自建臨床/狀態 overlay）。回傳已是 PascalCase（Beds），可直接餵給 ER WardTab。免 F5 自動更新。
import { usePolling } from './usePolling'
import { getBoard } from '../services/wardApi'
import { CENSUS_MS } from '../config/pollingConfig'

export function useErWard(unitCode = 'ER') {
  const { data, stale } = usePolling(
    () => getBoard(unitCode),
    { intervalMs: CENSUS_MS, deps: [unitCode] },
  )
  return {
    beds: data?.Beds ?? [],
    count: data?.Count ?? 0,
    stale,
  }
}
