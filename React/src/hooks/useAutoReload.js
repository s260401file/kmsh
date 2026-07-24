// useAutoReload.js — 前端新版自動套用（免逐台手動 F5）
// 角色：白板螢幕持續運行時，偵測到有新版部署（index.html 參照的 hashed 資源改變）即自動重新整理。
// 設計（極輕量）：每 intervalMs 抓一次 index.html(no-store) 比對資源雜湊；平時完全不動作。
//   只在白板顯示頁啟用（後台/登入不啟用，避免打斷輸入）；偵測到彈窗開啟時延到下次再重整。
import { useEffect, useRef } from 'react'

// 目前執行中頁面所載入的 hashed 資源檔名集合（DOM 內的 js/css）
function currentAssets() {
  return new Set(
    Array.from(document.querySelectorAll('link[rel="stylesheet"][href*="/assets/"], script[src*="/assets/"]'))
      .map(el => (el.getAttribute('href') || el.getAttribute('src') || '').split('/').pop())
      .filter(Boolean),
  )
}

export function useAutoReload(enabled, { intervalMs = 300000 } = {}) {
  const baseRef = useRef(null)
  useEffect(() => {
    if (!enabled) return
    if (!baseRef.current) baseRef.current = currentAssets()   // 啟用時記下目前版本的資源
    let alive = true
    const check = async () => {
      try {
        const res = await fetch('/index.html', { cache: 'no-store' })
        if (!res.ok) return
        const html = await res.text()
        const latest = (html.match(/assets\/[A-Za-z0-9_.-]+\.(?:js|css)/g) || []).map(s => s.split('/').pop())
        if (latest.length === 0) return
        const hasNew = latest.some(a => !baseRef.current.has(a))   // 出現目前沒有的資源＝有新版
        if (!hasNew || !alive) return
        if (document.querySelector('.modal-overlay.show, .ab-modal-overlay.show')) return  // 有彈窗開著→延到下次
        window.location.reload()
      } catch { /* 靜默：網路抖動不影響 */ }
    }
    const id = setInterval(check, intervalMs)
    return () => { alive = false; clearInterval(id) }
  }, [enabled, intervalMs])
}
