// useMarquee.js — 跑馬燈捲動資料 Hook
// 角色：各站白板共用，定時向後端取得「指定單位」目前啟用中的跑馬燈訊息，
//       並把多筆訊息串成單一字串供畫面捲動顯示。改用 usePolling 達成免 F5 自動更新。
// 參數：
//   unitCode — 單位代碼（W52 / ICU / OR / ER），切換時會重新取得。
//   fallback — 尚未取得資料（或讀取失敗）時顯示的預設文字。
// 回傳：string，可直接餵給跑馬燈元件顯示。
import { usePolling } from './usePolling'
import { getActive } from '../services/marqueeApi'
import { MARQUEE_MS } from '../config/pollingConfig'

export function useMarquee(unitCode, fallback = '') {
  // 定時拉取啟用中的跑馬燈；失敗時 usePolling 會保留上次資料（不清空畫面）
  const { data } = usePolling(
    () => getActive(unitCode),
    { intervalMs: MARQUEE_MS, deps: [unitCode] },
  )

  // 多筆時以分隔符串接，讓所有訊息都在跑馬燈上顯示；無資料則用 fallback
  return data?.length ? data.map(d => d.content).join('　◆　') : fallback
}
