// useMarquee.js — 跑馬燈捲動資料 Hook
// 角色：各站白板共用，向後端取得「指定單位」目前啟用中的跑馬燈訊息，
//       並把多筆訊息串成單一字串供畫面捲動顯示。
// 參數：
//   unitCode — 單位代碼（W52 / ICU / OR / ER），切換時會重新取得。
//   fallback — 尚未取得資料（或讀取失敗）時顯示的預設文字。
// 回傳：string，可直接餵給跑馬燈元件顯示。
import { useState, useEffect } from 'react'
import { getActive } from '../services/marqueeApi'

export function useMarquee(unitCode, fallback = '') {
  // text：目前要顯示的跑馬燈字串，初始為 fallback
  const [text, setText] = useState(fallback)

  // 單位改變時重新向後端拉取啟用中的跑馬燈
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
