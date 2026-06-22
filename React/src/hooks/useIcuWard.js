// useIcuWard.js — ICU 病室動態資料 Hook
// 角色：定時輪詢後端聚合看板（Board_bed AICU/CICU 真實在床 ＋ 自建臨床補充），供 ICU WardTab 顯示。
//       回傳已是 camelCase（beds/hospitalInfo），可直接餵給既有 ICU WardTab。免 F5 自動更新。
import { usePolling } from './usePolling'
import { getBoard } from '../services/wardApi'
import { CENSUS_MS } from '../config/pollingConfig'

export function useIcuWard(unitCode = 'ICU') {
  const { data, stale } = usePolling(
    () => getBoard(unitCode),
    { intervalMs: CENSUS_MS, deps: [unitCode] },
  )
  return {
    beds: data?.beds ?? [],
    hospitalInfo: data?.hospitalInfo ?? null,
    stale,
  }
}
