// BoardLoading.jsx — 病室動態載入中動畫
// 角色：院方 API 較慢，首次取資料期間填滿內容區，顯示旋轉 spinner ＋「載入中…」。
import './BoardLoading.css'

export default function BoardLoading({ text = '載入中…' }) {
  return (
    <div className="board-loading">
      <div className="board-spinner" />
      <div className="board-loading-text">{text}</div>
    </div>
  )
}
