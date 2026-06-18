// useBulletin.js — 佈告欄公告資料 Hook（各站白板共用）
// 角色：定時向後端取得「本單位公告(bulletin_unit)」與「院方公告(ALL/bulletin_hosp)」，
//       排序後回傳供佈告欄分頁顯示；以 usePolling 達成免 F5 自動更新。
// 參數：unitCode — 單位代碼（W52 / ICU / OR / ER）。
// 回傳：{ unitItems, hospItems, stale }
import { usePolling } from './usePolling'
import * as textApi from '../services/textApi'
import { BULLETIN_MS } from '../config/pollingConfig'

// 是否在顯示期間內：startAt/endAt 為 null 表該端不限；白板只顯示「現在落在區間內」者
function isWithinWindow(item, now) {
  if (item.startAt && new Date(item.startAt) > now) return false
  if (item.endAt && new Date(item.endAt) < now) return false
  return true
}

// 公告排序：重要優先，其次依建立時間由新到舊
function sortItems(items) {
  return [...items].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === '重要' ? -1 : 1
    return (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
  })
}

// 過濾顯示期間 + 排序（每次輪詢以當下時間判斷，過期/未開始自動進出）
function prepare(items) {
  const now = new Date()
  return sortItems((items ?? []).filter(it => isWithinWindow(it, now)))
}

export function useBulletin(unitCode) {
  const { data, stale } = usePolling(
    async () => {
      const [unit, hosp] = await Promise.all([
        textApi.getAll(unitCode, 'bulletin_unit'),
        textApi.getAll('ALL', 'bulletin_hosp'),
      ])
      return { unitItems: prepare(unit), hospItems: prepare(hosp) }
    },
    { intervalMs: BULLETIN_MS, deps: [unitCode] },
  )

  return {
    unitItems: data?.unitItems ?? [],
    hospItems: data?.hospItems ?? [],
    stale,
  }
}
