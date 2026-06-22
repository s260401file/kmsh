// useWard.js — 病室動態資料 Hook
// 角色：定時輪詢後端聚合看板（Board_bed 真實在床 ＋ 自建臨床補充），供 WardTab 顯示；
//       回傳已是 PascalCase（Beds/HospitalInfo），可直接餵給既有 WardTab。免 F5 自動更新。
import { usePolling } from './usePolling'
import { getBoard } from '../services/wardApi'
import { CENSUS_MS } from '../config/pollingConfig'

export function useWard(unitCode) {
  const { data, stale } = usePolling(
    () => getBoard(unitCode),
    { intervalMs: CENSUS_MS, deps: [unitCode] },
  )
  return {
    beds: data?.Beds ?? [],
    hospitalInfo: data?.HospitalInfo ?? null,
    stale,
  }
}
