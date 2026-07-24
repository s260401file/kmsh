// OrViewGate — OR 看板「檢視密碼」鍵盤門檻。
// 切換至非第一頁籤時，若後台有設檢視密碼且尚未解鎖，即以此取代分頁內容（不渲染內容，避免外洩）。
// 頁首與底部分頁列仍在，使用者可隨時點回「手術動態」（免密）或改點別的頁籤（重新驗證）。
import { useState } from 'react'

// 開發用：底排顯示「auto」自動帶入正確密碼，方便測試。★上正式線前改為 false（改成退格鍵）。
const DEV_AUTOFILL = true

export default function OrViewGate({ expected, onUnlock, onCancel }) {
  const [digits, setDigits] = useState('')   // 已輸入（最多 4）
  const [err, setErr] = useState(false)

  const push = d => { setErr(false); setDigits(v => (v.length >= 4 ? v : v + d)) }
  const back = () => { setErr(false); setDigits(v => v.slice(0, -1)) }
  const auto = () => { setErr(false); setDigits(String(expected || '').slice(0, 4)) }
  const submit = () => {
    if (digits && digits === String(expected)) onUnlock()
    else { setErr(true); setDigits('') }
  }

  return (
    <div className="or-gate">
      <div className="or-gate-box">
        <div className="or-gate-title">🔒 請輸入檢視密碼</div>
        <div className={`or-gate-cells${err ? ' err' : ''}`}>
          {[0, 1, 2, 3].map(i => <span key={i} className="or-gate-cell">{digits[i] ? '●' : ''}</span>)}
        </div>
        <div className="or-gate-msg">{err ? '密碼錯誤，請重新輸入' : ' '}</div>
        <div className="or-gate-pad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(n => (
            <button key={n} className={`or-gate-key${n === '0' ? ' or-gate-zero' : ''}`} onClick={() => push(n)}>{n}</button>
          ))}
          {DEV_AUTOFILL
            ? <button className="or-gate-key or-gate-auto" onClick={auto} title="開發用：自動帶入密碼">auto</button>
            : <button className="or-gate-key or-gate-back" onClick={back} aria-label="退格">⌫</button>}
          <button className="or-gate-key or-gate-ok" onClick={submit}>確認</button>
        </div>
        {onCancel && <button className="or-gate-cancel" onClick={onCancel}>取消</button>}
      </div>
    </div>
  )
}
