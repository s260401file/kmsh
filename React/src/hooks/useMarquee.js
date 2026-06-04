import { useState, useEffect } from 'react'
import { getActive } from '../services/marqueeApi'

export function useMarquee(unitCode, fallback = '') {
  const [text, setText] = useState(fallback)

  useEffect(() => {
    getActive(unitCode)
      .then(data => {
        if (data?.length) {
          // 多筆時以分隔符串接，讓所有訊息都在跑馬燈上顯示
          setText(data.map(d => d.content).join('　◆　'))
        }
      })
      .catch(() => {})
  }, [unitCode])

  return text
}
