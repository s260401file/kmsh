import { useState, useEffect } from 'react'
import { getActive } from '../services/marqueeApi'

export function useMarquee(unitCode, fallback = '') {
  const [text, setText] = useState(fallback)

  useEffect(() => {
    getActive(unitCode)
      .then(data => {
        if (data?.length) setText(data[0].content)
      })
      .catch(() => {})
  }, [unitCode])

  return text
}
