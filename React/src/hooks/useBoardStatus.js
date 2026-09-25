// useBoardStatus.js — 各站「本地快照新鮮度」輕量輪詢
// 角色：頁首顯示「資料可能延遲」用。只打輕量 /Board/{unit}/status（不建 census），
//       回傳 { dataStale, syncedAt }。與各站 Layout 搭配，正常時不顯示、過舊才顯示。
import { usePolling } from './usePolling'
import { getBoardStatus } from '../services/wardApi'
import { CENSUS_MS } from '../config/pollingConfig'

export function useBoardStatus(unitCode) {
  const { data } = usePolling(
    () => getBoardStatus(unitCode),
    { intervalMs: CENSUS_MS, deps: [unitCode] },
  )
  return {
    dataStale: data?.dataStale ?? false,
    syncedAt: data?.syncedAt ?? null,
  }
}
