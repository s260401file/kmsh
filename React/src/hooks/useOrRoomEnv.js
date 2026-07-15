// useOrRoomEnv.js — OR 手術室「今日各刀房溫溼度」資料 Hook
// 角色：定時輪詢後端 GET /api/Board/or/temphumidity?date=（自建 OrRoomEnv 表），
//       供 OR WardTab 第 8 格顯示。todayStr 每次呼叫即時計算，跨午夜自動換日。免 F5 自動更新。
import { usePolling } from './usePolling'
import { getOrRoomEnv } from '../services/wardApi'
import { CENSUS_MS } from '../config/pollingConfig'

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function useOrRoomEnv() {
  const { data, loading } = usePolling(
    () => getOrRoomEnv(todayStr()),
    { intervalMs: CENSUS_MS, deps: [] },
  )
  return {
    env: data ?? [],
    loading,
  }
}
