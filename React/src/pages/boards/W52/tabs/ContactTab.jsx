// ContactTab：連絡資訊分頁
// 角色：左欄為當日值班（職務/姓名/分機/手機/時段），右欄為常用連絡電話。
//       此分頁實接後台 contactApi（非假資料）。
import { useState, useEffect } from 'react'
import { getDuty, getCommon } from '../../../../services/contactApi'   // 值班/常用電話 API
import '../tabsCss/contact.css'

export default function ContactTab() {
  const [duty,   setDuty]   = useState([])   // 當日值班清單
  const [common, setCommon] = useState([])   // 常用連絡電話清單

  // 掛載時撈取 W52 的值班與常用電話；失敗則靜默
  useEffect(() => {
    getDuty('W52').then(d => setDuty(d ?? [])).catch(() => {})
    getCommon('W52').then(d => setCommon(d ?? [])).catch(() => {})
  }, [])

  return (
    <main className="main-content">
      <div className="ct-panel">
        <div className="ct-page-title">
          <span className="ct-title-accent"></span>
          連絡資訊
          <span className="ct-title-caption">當日值班＋常用</span>
        </div>
        <div className="ct-columns">
          <div className="ct-card ct-card-duty">
            <div className="ct-card-header">當日值班</div>
            <div className="ct-table-wrap">
              <table className="ct-table">
                <thead><tr><th>職務</th><th>姓名</th><th>院內分機</th><th>手機</th><th>時段</th></tr></thead>
                <tbody>
                  {duty.length === 0
                    ? <tr className="ct-empty-row"><td colSpan={5}>尚無值班資料</td></tr>
                    : duty.map(c => (
                      <tr key={c.id}>
                        <td>{c.dutyTitle}</td>
                        <td>{c.name}</td>
                        <td className="ct-ext">{c.extension || '—'}</td>
                        <td className="ct-mobile">{c.mobile || '—'}</td>
                        <td className="ct-slot">{c.timeSlot || '—'}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
          <div className="ct-card ct-card-common">
            <div className="ct-card-header">常用連絡電話</div>
            <div className="ct-table-wrap">
              <table className="ct-table">
                <thead><tr><th>單位</th><th className="ct-col-ext">分機 / 電話</th></tr></thead>
                <tbody>
                  {common.length === 0
                    ? <tr className="ct-empty-row"><td colSpan={2}>尚無常用電話</td></tr>
                    : common.map(c => (
                      <tr key={c.id}>
                        <td>{c.name}</td>
                        <td className="ct-col-ext ct-ext">{c.extension}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
