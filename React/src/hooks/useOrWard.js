// useOrWard.js — OR 手術室「手術動態」資料 Hook
// 角色：定時輪詢後端聚合看板（自建刀房主檔 OrRoom 鋪房卡 ＋ Board_OR 今日手術 ＋ overlay）。
//       回傳已是 PascalCase（Rooms），可直接餵給 OR WardTab。免 F5 自動更新。
import { usePolling } from './usePolling'
import { getBoard } from '../services/wardApi'
import { CENSUS_MS } from '../config/pollingConfig'

export function useOrWard(unitCode = 'OR') {
  const { data, stale, loading } = usePolling(
    () => getBoard(unitCode),
    { intervalMs: CENSUS_MS, deps: [unitCode] },
  )
  return {
    rooms: data?.Rooms ?? [],
    count: data?.Count ?? 0,
    stale,
    loading,
  }
}
