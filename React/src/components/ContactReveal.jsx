// ContactReveal.jsx — 值班表聯絡資訊個資遮蔽
// 角色：常開大螢幕上，凡聯絡資訊「數字位數 > 9」（手機 10 碼）即改顯示「點我顯示」，
//       點擊跳窗顯示完整聯絡資訊；9 位數以內（分機、市話含區碼）照常顯示。W52/ICU 值班表共用。
import { createPortal } from 'react-dom'
import './ContactReveal.css'

// 數字字元數 > 9 視為敏感（只算 0-9，忽略 #、-、空白）
export const isSensitiveContact = v => (String(v ?? '').match(/\d/g) || []).length > 9

// 單一聯絡值：敏感→「點我顯示」按鈕；否則原樣顯示（保留傳入 className）
export function ContactValue({ label, value, className = '', onReveal }) {
  const v = value == null ? '' : String(value)
  if (isSensitiveContact(v)) {
    return (
      <button type="button" className={`cr-reveal ${className}`.trim()}
        onClick={e => { e.stopPropagation(); onReveal({ label: label || '', value: v }) }}>
        點我顯示
      </button>
    )
  }
  return <span className={className}>{v}</span>
}

// 點擊後的完整聯絡資訊彈窗（自包含，不依賴各站 modal 樣式）
export function ContactRevealModal({ reveal, onClose }) {
  if (!reveal) return null
  // 以 portal 掛到 document.body：避開各站看板內任何 transform/filter 祖先，
  // 讓 position:fixed 的彈窗在 W52/ICU/ER 都以「真實視窗尺寸」呈現、大小一致。
  return createPortal(
    <div className="cr-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="cr-box" role="dialog" aria-modal="true">
        {reveal.label && <div className="cr-label">{reveal.label}</div>}
        <div className="cr-value">{reveal.value}</div>
        <button type="button" className="cr-close" onClick={onClose}>關閉</button>
      </div>
    </div>,
    document.body
  )
}
