import { useState, useEffect } from 'react'

export function useClock() {
  const [clock, setClock] = useState({ date: '', time: '' })

  useEffect(() => {
    const days = ['日', '一', '二', '三', '四', '五', '六']
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
