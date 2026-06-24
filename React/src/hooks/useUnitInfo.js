// useUnitInfo.js — 各站白板頁首單位資訊（主任/護理 標籤＋姓名）
// 自建、後台可編輯；低頻輪詢，免 F5 自動更新。回 null 時由 Layout 以 mock 備援。
import { usePolling } from './usePolling'
import { getUnitInfo } from '../services/wardApi'
import { BULLETIN_MS } from '../config/pollingConfig'

export function useUnitInfo(unitCode) {
  const { data } = usePolling(() => getUnitInfo(unitCode), { intervalMs: BULLETIN_MS, deps: [unitCode] })
  return data || null
}
