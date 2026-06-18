/*
 * useClock.js — 即時時鐘 hook
 * 提供白板頁首所需的當前日期與時間，每秒更新一次。
 * 回傳：{ date, time }
 *   date 範例 "2026/06/18 (四)"、time 範例 "13:05:09"
 */
import { useState, useEffect } from 'react'

export function useClock() {
  const [clock, setClock] = useState({ date: '', time: '' })

  useEffect(() => {
    // 星期對照（0=日 ... 6=六）
    const days = ['日', '一', '二', '三', '四', '五', '六']
    // tick：計算目前時間並更新 state；月/日/時/分/秒皆補零至兩位
    const tick = () => {
      const now = new Date()
      setClock({
        date: `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} (${days[now.getDay()]})`,
        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`,
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return clock
}
