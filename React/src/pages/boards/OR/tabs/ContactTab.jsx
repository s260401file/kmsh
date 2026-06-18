// ContactTab：OR 手術室站「連絡電話」分頁
// 雙欄呈現「當日值班」（職務/姓名/分機/手機/時段）與「常用連絡電話」。
// 資料透過 contactApi 由後端 API 取得（非 mockData），以單位代碼 OR 查詢。
import { useState, useEffect } from 'react'
import { getDuty, getCommon } from '../../../../services/contactApi'
import '../tabsCss/contact.css'

export default function ContactTab() {
  const [duty,   setDuty]   = useState([])  // 當日值班名單
  const [common, setCommon] = useState([])  // 常用連絡電話

  // 載入時向 API 取得值班與常用電話
  useEffect(() => {
    getDuty('OR').then(d => setDuty(d ?? [])).catch(() => {})
    getCommon('OR').then(d => setCommon(d ?? [])).catch(() => {})
  }, [])

  return (
    <main className="main-content">
      <div className="ct-panel">
        <div className="ct-page-title">
          <span className="ct-title-accent"></span>
          連絡電話
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
                <thead><tr><th>單位 / 科室</th><th className="ct-col-ext">分機 / 電話</th></tr></thead>
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
