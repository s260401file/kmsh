// usePolling.js — 通用定時輪詢 Hook
// 角色：白板「免 F5 自動更新」的基礎建設。掛載時先抓一次，之後每 intervalMs 重抓，
//       元件卸載時清除計時器。為各白板資料 hook（如 useMarquee / useBulletin）共用。
// 參數：
//   fetcher    — 回傳 Promise 的取資料函式（呼叫端自行帶參數，如 () => getActive(unitCode)）。
//   intervalMs — 輪詢間隔（毫秒），建議取自 config/pollingConfig.js。
//   deps       — 相依陣列；其值改變（如 unitCode 切換）時重啟輪詢。
// 回傳：{ data, stale, loading }
//   data    — 最近一次成功取得的資料（尚未取得前為 null）。
//   stale   — 最近一次輪詢失敗時為 true；此時 data 維持上一次成功值（白板不清空）。
//   loading — 首次成功取得前為 true（含失敗重試期間），供畫面顯示載入中動畫；成功後為 false。
// 設計：失敗只標記 stale、不覆寫 data，避免單次網路抖動讓大螢幕瞬間空白。
import { useState, useEffect, useRef } from 'react'

export function usePolling(fetcher, { intervalMs = 30000, deps = [] } = {}) {
  const [data, setData] = useState(null)
  const [stale, setStale] = useState(false)
  const [loading, setLoading] = useState(true)
  // 以 ref 保存最新 fetcher，避免因 fetcher 每次 render 變動而重啟輪詢
  const savedFetcher = useRef(fetcher)
  // 於 effect 內同步 ref（不可在 render 期間寫入 ref）
  useEffect(() => { savedFetcher.current = fetcher }, [fetcher])

  useEffect(() => {
    let alive = true   // 防止卸載後 setState
    setLoading(true)   // deps 改變（如切換單位）→ 重新進入載入中
    const tick = async () => {
      try {
        const result = await savedFetcher.current()
        if (alive) { setData(result); setStale(false); setLoading(false) }  // 首次成功→結束載入
      } catch {
        if (alive) setStale(true)   // 失敗：保留舊 data、loading 維持（隨輪詢重試）
      }
    }
    tick()                                // 進畫面先抓一次
    const id = setInterval(tick, intervalMs)
    return () => { alive = false; clearInterval(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps])

  return { data, stale, loading }
}
