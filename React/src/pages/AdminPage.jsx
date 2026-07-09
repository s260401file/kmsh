// AdminPage.jsx — 護理白板管理後台主頁（需登入，受路由保護）
// 角色：單一頁面整合所有後台維護功能，左側 Sidebar 選單切換不同管理區塊：
//   ・公告管理：跑馬燈(MarqueeManager) / 佈告欄(BulletinManager)
//   ・連絡資訊：值班人員(DutyManager) / 常用電話(CommonManager)
//   ・避難圖：圖片＋設備清單＋緊急聯絡(EvacManager)
// 每個 Manager 內含「單位切換 tab」（依登入身份可管理的 unitCodes 動態產生），
// 各 Section 為單一單位的 CRUD 表單＋清單，透過對應的 *Api 服務存取後端。
// 多數 Section 共用模式：list/form/editId/msg 四個 state，load() 讀取資料，
// useEffect 依 unitCode 變動重新載入，handleSubmit/Edit/Delete/Toggle 處理增改刪與啟用切換。
import { useState, useEffect, useCallback, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCrudSection } from '../hooks/useCrudSection'
import '../components/BoardLoading.css'   // 借用 board-spin keyframe（後台讀取中 spinner）
import * as marqueeApi from '../services/marqueeApi'
import * as textApi from '../services/textApi'
import * as contactApi from '../services/contactApi'
import * as evacuationApi from '../services/evacuationApi'
import * as wardApi from '../services/wardApi'
import * as auditApi from '../services/auditApi'

// 單位代碼 → 顯示名稱對照（用於各 Manager 的單位切換 tab）
const UNIT_LABELS = { W52: 'W52 病房', ICU: 'ICU 加護', OR: 'OR 手術室', ER: 'ER 急診室' }

// 共用單位切換 tab 列（各 Manager 與跨單位人員管理區塊共用）
function UnitTabs({ units, active, onChange }) {
  return (
    <div style={s.unitTabs}>
      {units.map(u => (
        <button key={u} style={{ ...s.unitTab, ...(active === u ? s.unitTabActive : {}) }} onClick={() => onChange(u)}>
          {UNIT_LABELS[u] ?? u}
        </button>
      ))}
    </div>
  )
}

// ── Menu 設定（新增功能只改這裡）──────────────────────────
// Sidebar 選單結構：上層分組 + 下層 leaf；available=false 會顯示「預計」且不可點。
// renderContent() 依 leaf 的 id 決定要渲染哪個 Manager。
const MENU_CONFIG = [
  {
    id: 'announcement', label: '公告管理',
    children: [
      { id: 'marquee',  label: '跑馬燈', available: true  },
      { id: 'bulletin', label: '佈告欄', available: true  },  // Phase 1
    ]
  },
  {
    id: 'contact', label: '連絡資訊',
    children: [
      { id: 'duty-contact',   label: '值班人員', available: true  },  // Phase 2
      { id: 'common-contact', label: '常用電話', available: true  },  // Phase 2
    ]
  },
  {
    id: 'evacuation', label: '避難圖',
    children: [
      { id: 'evac-image', label: '圖片管理', available: true  },  // Phase 3
    ]
  },
  {
    id: 'personnel', label: '護理排班',   // 跨單位（我的病床＋排班＋交班；帳號設定移至系統管理）
    children: [
      { id: 'bed-nurse',    label: '我的病床', available: true },
      { id: 'schedule',     label: '排班', available: true },
      { id: 'handover',     label: '護理交班', available: true },
    ]
  },
  // ── 站別管理分類（依角色 unitCodes 過濾顯示；站別專屬功能歸入對應站）──
  {
    id: 'w52-admin', label: 'W52 管理', unit: 'W52',
    children: [
      { id: 'w52-info', label: '頁首設定', available: true },
      { id: 'w52-acct', label: '帳號設定', available: true },
      { id: 'w52-ext',  label: '病人臨床補充', available: true },
      { id: 'w52-care', label: '照護提醒', available: true },
      { id: 'w52-exam', label: '檢查/會診', available: true },
      { id: 'w52-shift', label: '三班護理師', available: true },   // 值班表三班護理師（每班可多人）
      { id: 'round',     label: '查房表', available: true },        // W52 專屬（醫師資訊頁）
    ]
  },
  {
    id: 'icu-admin', label: 'ICU 管理', unit: 'ICU',
    children: [
      { id: 'icu-info', label: '頁首設定', available: true },
      { id: 'icu-acct', label: '帳號設定', available: true },
      { id: 'icu-ext',  label: '病人臨床補充', available: true },  // 3F/4F 不分（以病歷號為鍵）
      { id: 'icu-exam', label: '檢查/會診', available: true },
      { id: 'icu-abx',  label: '抗生素', available: true },        // 以病歷號掛載（自建）
      { id: 'icu-shift', label: '三班護理師', available: true },   // 值班表三班護理師（每班可多人；W52 式）
    ]
  },
  {
    id: 'or-admin', label: 'OR 管理', unit: 'OR',
    children: [
      { id: 'or-info',     label: '頁首設定', available: true },
      { id: 'or-acct',     label: '帳號設定', available: true },
      { id: 'or-ext',      label: '病人臨床補充', available: true },  // 手術狀態/刷手/流動 overlay
      { id: 'or-schedule', label: 'OR 手術派班', available: true },
      { id: 'or-scrub',    label: '刷手/流動設定', available: true },   // 逐台刀（月曆）
      { id: 'or-handover', label: 'OR 特殊交班', available: true },
    ]
  },
  {
    id: 'er-admin', label: 'ER 管理', unit: 'ER',
    children: [
      { id: 'er-info',   label: '頁首設定', available: true },
      { id: 'er-acct',   label: '帳號設定', available: true },
      { id: 'er-ext',    label: '病人臨床補充', available: true },
      { id: 'er-exam',   label: '檢查/會診', available: true },
      { id: 'er-oncall-roster', label: '值班醫師排程', available: true },   // 每日輪值月曆（全院共用；已取代舊「各科值班醫師」）
      { id: 'er-shift',  label: '醫師/照服員設定', available: true },   // 原「三班醫護人員」；護理師改由三班護理師供給
      { id: 'er-shift-roster', label: '三班護理師', available: true },   // 護理師來源（餵 ER 看板三班面板）
    ]
  },
  {
    id: 'system', label: '系統管理', adminOnly: true,   // 帳號與權限：僅系統管理員可見
    children: [
      { id: 'staff', label: '帳號設定', available: true },  // 人員＋單位角色＋管理員/管理者權限
      { id: 'department', label: '科別', available: true },  // 全院共用科別清單（先建）
      { id: 'doctor', label: '醫師', available: true },  // 全院共用醫師總表（後建）
      { id: 'audit', label: '操作稽核', available: true },  // 資料異動記錄查詢（唯讀；寫入由後端自動）
    ]
  },
]

// 第一個可用的 leaf id
const DEFAULT_MENU = 'marquee'

// ── 跑馬燈管理 ─────────────────────────────────────────────
const emptyForm = { title: '', content: '', sortOrder: 0, isActive: true }

// 單一單位的跑馬燈 CRUD：表單新增/編輯 + 清單顯示，呼叫 marqueeApi
function MarqueeTab({ unitCode }) {
  const { list, form, setForm, editId, msg, handleSubmit, handleEdit, handleDelete, handleToggle, resetForm } = useCrudSection({
    emptyForm,
    fetchList: () => marqueeApi.getAll(unitCode),
    create: (payload) => marqueeApi.create(unitCode, payload),
    update: (id, payload) => marqueeApi.update(id, payload),
    remove: (id) => marqueeApi.remove(id),
    toPayload: (form) => ({ ...form, unitCode, category: 'marquee' }),
    toForm: (item) => ({ title: item.title ?? '', content: item.content, sortOrder: item.sortOrder, isActive: item.isActive }),
  })

  return (
    <div>
      {msg.text && <div style={{ ...s.msg, background: msg.error ? '#fee2e2' : '#d1fae5', color: msg.error ? '#991b1b' : '#065f46' }}>{msg.text}</div>}
      <div style={s.formCard}>
        <h3 style={s.formTitle}>{editId ? `修改訊息 (ID: ${editId})` : '新增跑馬燈訊息'}</h3>
        <form onSubmit={handleSubmit}>
          <div style={s.formRow}>
            <label style={s.label}>標題（選填）</label>
            <input style={s.input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div style={s.formRow}>
            <label style={s.label}>訊息內容 *</label>
            <textarea style={{ ...s.input, height: '72px', resize: 'vertical' }} value={form.content} required
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={s.formRow}>
              <label style={s.label}>排序</label>
              <input type="number" style={{ ...s.input, width: '80px' }} value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
              啟用
            </label>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            <button type="submit" style={s.btnPrimary}>{editId ? '儲存修改' : '+ 新增'}</button>
            {editId && <button type="button" style={s.btnSecondary} onClick={resetForm}>取消</button>}
          </div>
        </form>
      </div>
      <div style={s.listCard}>
        <h3 style={s.formTitle}>訊息清單（共 {list.length} 筆）</h3>
        {list.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '14px' }}>尚無訊息，請新增</p> : (
          <table style={s.table}>
            <thead>
              <tr>{['ID','標題','內容','排序','啟用','操作'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {list.map((item, i) => (
                <tr key={item.id} style={{ background: editId === item.id ? '#fef9c3' : i % 2 ? '#f9fafb' : '#fff' }}>
                  <td style={s.td}>{item.id}</td>
                  <td style={s.td}>{item.title || '—'}</td>
                  <td style={{ ...s.td, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.content}</td>
                  <td style={s.td}>{item.sortOrder}</td>
                  <td style={s.td}>
                    <button onClick={() => handleToggle(item)} style={{ ...s.badge, background: item.isActive ? '#d1fae5' : '#f3f4f6', color: item.isActive ? '#065f46' : '#6b7280' }}>
                      {item.isActive ? '✓ 啟用' : '停用'}
                    </button>
                  </td>
                  <td style={s.td}>
                    <button style={s.btnEdit} onClick={() => handleEdit(item)}>編輯</button>
                    <button style={s.btnDel}  onClick={() => handleDelete(item.id)}>刪除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// 跑馬燈 Manager（含單位切換）：以 activeUnit 控制要管理哪個單位，
// 切換時用 key={activeUnit} 強制重建 MarqueeTab 以重設其內部 state
function MarqueeManager({ units }) {
  const [activeUnit, setActiveUnit] = useState(units[0] ?? 'W52')
  return (
    <div>
      <UnitTabs units={units} active={activeUnit} onChange={setActiveUnit} />
      <MarqueeTab key={activeUnit} unitCode={activeUnit} />
    </div>
  )
}

// ── 連絡資訊管理 ───────────────────────────────────────────────
// 分兩種：值班人員(Duty，含職務/班別/時段/分機/手機) 與 常用電話(Common)，皆呼叫 contactApi
const emptyDutyForm  = { dutyTitle: '', name: '', shiftType: '', timeSlot: '', extension: '', mobile: '', sortOrder: 0, isActive: true }
const emptyCommonForm = { name: '', extension: '', sortOrder: 0, isActive: true }

// 班別選項（空字串代表不分班；ER 才需要分班）
const SHIFT_OPTS = ['', '白班', '小夜', '大夜']

// 單一單位的值班人員 CRUD（讀取時 includeAll=true，後台需顯示停用資料）
function DutySection({ unitCode }) {
  const { list, form, setForm, editId, msg, handleSubmit, handleEdit, handleDelete, handleToggle, resetForm } = useCrudSection({
    emptyForm: emptyDutyForm,
    fetchList: () => contactApi.getDuty(unitCode, true),
    create: (payload) => contactApi.createDuty(payload),
    update: (id, payload) => contactApi.updateDuty(id, payload),
    remove: (id) => contactApi.removeDuty(id),
    toPayload: (form) => ({ unitCode, ...form, shiftType: form.shiftType || null }),
    toForm: (item) => ({ dutyTitle: item.dutyTitle, name: item.name, shiftType: item.shiftType ?? '', timeSlot: item.timeSlot ?? '', extension: item.extension ?? '', mobile: item.mobile ?? '', sortOrder: item.sortOrder, isActive: item.isActive }),
  })

  return (
    <div style={{ marginBottom: '24px' }}>
      {msg.text && <div style={{ ...s.msg, background: msg.error ? '#fee2e2' : '#d1fae5', color: msg.error ? '#991b1b' : '#065f46' }}>{msg.text}</div>}
      <div style={s.formCard}>
        <h4 style={s.formTitle}>{editId ? `修改值班人員 (ID: ${editId})` : '新增值班人員'}</h4>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div style={s.formRow}>
              <label style={s.label}>職務 *</label>
              <input style={s.input} value={form.dutyTitle} required onChange={e => setForm(f => ({ ...f, dutyTitle: e.target.value }))} placeholder="護理長 / 責任護理師" />
            </div>
            <div style={s.formRow}>
              <label style={s.label}>姓名 *</label>
              <input style={s.input} value={form.name} required onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="王○明護理師" />
            </div>
            <div style={s.formRow}>
              <label style={s.label}>班別（ER 用）</label>
              <select style={s.input} value={form.shiftType} onChange={e => setForm(f => ({ ...f, shiftType: e.target.value }))}>
                {SHIFT_OPTS.map(o => <option key={o} value={o}>{o || '（不分班）'}</option>)}
              </select>
            </div>
            <div style={s.formRow}>
              <label style={s.label}>時段</label>
              <input style={s.input} value={form.timeSlot} onChange={e => setForm(f => ({ ...f, timeSlot: e.target.value }))} placeholder="08:00–16:00 / 全天" />
            </div>
            <div style={s.formRow}>
              <label style={s.label}>院內分機</label>
              <input style={s.input} value={form.extension} onChange={e => setForm(f => ({ ...f, extension: e.target.value }))} placeholder="1234" />
            </div>
            <div style={s.formRow}>
              <label style={s.label}>手機（選填）</label>
              <input style={s.input} value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} placeholder="0912-345-***" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '4px' }}>
            <div style={s.formRow}>
              <label style={s.label}>排序</label>
              <input type="number" style={{ ...s.input, width: '80px' }} value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />啟用
            </label>
          </div>
          <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
            <button type="submit" style={s.btnPrimary}>{editId ? '儲存修改' : '+ 新增'}</button>
            {editId && <button type="button" style={s.btnSecondary} onClick={resetForm}>取消</button>}
          </div>
        </form>
      </div>
      <div style={s.listCard}>
        <h4 style={s.formTitle}>值班人員（共 {list.length} 筆）</h4>
        {list.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '14px' }}>尚無資料，請新增</p> : (
          <table style={s.table}>
            <thead><tr>{['ID','職務','姓名','班別','時段','分機','啟用','操作'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {list.map((item, i) => (
                <tr key={item.id} style={{ background: editId === item.id ? '#fef9c3' : i % 2 ? '#f9fafb' : '#fff' }}>
                  <td style={s.td}>{item.id}</td>
                  <td style={s.td}>{item.dutyTitle}</td>
                  <td style={s.td}>{item.name}</td>
                  <td style={s.td}>{item.shiftType || '—'}</td>
                  <td style={s.td}>{item.timeSlot || '—'}</td>
                  <td style={s.td}>{item.extension || '—'}</td>
                  <td style={s.td}>
                    <button onClick={() => handleToggle(item)} style={{ ...s.badge, background: item.isActive ? '#d1fae5' : '#f3f4f6', color: item.isActive ? '#065f46' : '#6b7280' }}>
                      {item.isActive ? '✓ 啟用' : '停用'}
                    </button>
                  </td>
                  <td style={s.td}>
                    <button style={s.btnEdit} onClick={() => handleEdit(item)}>編輯</button>
                    <button style={s.btnDel}  onClick={() => handleDelete(item.id)}>刪除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// 值班人員 Manager（含單位切換）
function DutyManager({ units }) {
  const [activeUnit, setActiveUnit] = useState(units[0] ?? 'W52')
  return (
    <div>
      <UnitTabs units={units} active={activeUnit} onChange={setActiveUnit} />
      <DutySection key={activeUnit} unitCode={activeUnit} />
    </div>
  )
}

// 單一單位的常用電話 CRUD（讀取時 includeAll=true）
function CommonSection({ unitCode }) {
  const { list, form, setForm, editId, msg, handleSubmit, handleEdit, handleDelete, handleToggle, resetForm } = useCrudSection({
    emptyForm: emptyCommonForm,
    fetchList: () => contactApi.getCommon(unitCode, true),
    create: (payload) => contactApi.createCommon(payload),
    update: (id, payload) => contactApi.updateCommon(id, payload),
    remove: (id) => contactApi.removeCommon(id),
    toPayload: (form) => ({ unitCode, ...form }),
    toForm: (item) => ({ name: item.name, extension: item.extension, sortOrder: item.sortOrder, isActive: item.isActive }),
  })

  return (
    <div>
      {msg.text && <div style={{ ...s.msg, background: msg.error ? '#fee2e2' : '#d1fae5', color: msg.error ? '#991b1b' : '#065f46' }}>{msg.text}</div>}
      <div style={s.formCard}>
        <h4 style={s.formTitle}>{editId ? `修改常用電話 (ID: ${editId})` : '新增常用電話'}</h4>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div style={s.formRow}>
              <label style={s.label}>名稱 *</label>
              <input style={s.input} value={form.name} required onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="急診室" />
            </div>
            <div style={s.formRow}>
              <label style={s.label}>分機 / 電話 *</label>
              <input style={s.input} value={form.extension} required onChange={e => setForm(f => ({ ...f, extension: e.target.value }))} placeholder="2200 或 1010 / 1011" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '4px' }}>
            <div style={s.formRow}>
              <label style={s.label}>排序</label>
              <input type="number" style={{ ...s.input, width: '80px' }} value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />啟用
            </label>
          </div>
          <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
            <button type="submit" style={s.btnPrimary}>{editId ? '儲存修改' : '+ 新增'}</button>
            {editId && <button type="button" style={s.btnSecondary} onClick={resetForm}>取消</button>}
          </div>
        </form>
      </div>
      <div style={s.listCard}>
        <h4 style={s.formTitle}>常用電話（共 {list.length} 筆）</h4>
        {list.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '14px' }}>尚無資料，請新增</p> : (
          <table style={s.table}>
            <thead><tr>{['ID','名稱','分機','排序','啟用','操作'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {list.map((item, i) => (
                <tr key={item.id} style={{ background: editId === item.id ? '#fef9c3' : i % 2 ? '#f9fafb' : '#fff' }}>
                  <td style={s.td}>{item.id}</td>
                  <td style={s.td}>{item.name}</td>
                  <td style={s.td}>{item.extension}</td>
                  <td style={s.td}>{item.sortOrder}</td>
                  <td style={s.td}>
                    <button onClick={() => handleToggle(item)} style={{ ...s.badge, background: item.isActive ? '#d1fae5' : '#f3f4f6', color: item.isActive ? '#065f46' : '#6b7280' }}>
                      {item.isActive ? '✓ 啟用' : '停用'}
                    </button>
                  </td>
                  <td style={s.td}>
                    <button style={s.btnEdit} onClick={() => handleEdit(item)}>編輯</button>
                    <button style={s.btnDel}  onClick={() => handleDelete(item.id)}>刪除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// 常用電話 Manager（含單位切換）
function CommonManager({ units }) {
  const [activeUnit, setActiveUnit] = useState(units[0] ?? 'W52')
  return (
    <div>
      <UnitTabs units={units} active={activeUnit} onChange={setActiveUnit} />
      <CommonSection key={activeUnit} unitCode={activeUnit} />
    </div>
  )
}

// ── 佈告欄管理 ─────────────────────────────────────────────
// 佈告欄資料存於 /api/Text，以 category 區分「科內公告(bulletin_unit)」與
// 「院方公告(bulletin_hosp)」，故 BulletinSection 以 category 參數泛用化。
const emptyBulletinForm = { title: '', content: '', priority: '一般', sortOrder: 0, isActive: true, startAt: '', endAt: '' }

// ISO 字串 → <input type="datetime-local"> 可用值（yyyy-MM-ddTHH:mm）；無值回空字串
const toLocalInput = iso => (iso ? iso.slice(0, 16) : '')
// 顯示用：ISO → MM/DD HH:mm；無值回空字串
const fmtDateTime = iso => {
  if (!iso) return ''
  const d = iso.slice(0, 16)
  return `${d.slice(5, 7)}/${d.slice(8, 10)} ${d.slice(11, 16)}`
}
// 顯示期間文字（起~迄；任一端不限以「—」表示；皆無回「不限」）
const fmtRange = (startAt, endAt) =>
  (!startAt && !endAt) ? '不限' : `${fmtDateTime(startAt) || '—'} ~ ${fmtDateTime(endAt) || '—'}`

// 單一 category 的公告 CRUD：category 決定資料分類，sectionTitle 為區塊標題
function BulletinSection({ unitCode, category, sectionTitle }) {
  const { list, form, setForm, editId, msg, handleSubmit, handleEdit, handleDelete, handleToggle, resetForm } = useCrudSection({
    emptyForm: emptyBulletinForm,
    fetchList: () => textApi.getAll(unitCode, category, true),
    create: (payload) => textApi.create(payload),
    update: (id, payload) => textApi.update(id, payload),
    remove: (id) => textApi.remove(id),
    // 起迄空字串轉 null（不限）
    toPayload: (form) => ({ ...form, unitCode, category, startAt: form.startAt || null, endAt: form.endAt || null }),
    toForm: (item) => ({ title: item.title ?? '', content: item.content, priority: item.priority ?? '一般', sortOrder: item.sortOrder, isActive: item.isActive, startAt: toLocalInput(item.startAt), endAt: toLocalInput(item.endAt) }),
  })

  return (
    <div style={{ marginBottom: '28px' }}>
      <h3 style={{ ...s.sectionSub }}>{sectionTitle}</h3>
      {msg.text && <div style={{ ...s.msg, background: msg.error ? '#fee2e2' : '#d1fae5', color: msg.error ? '#991b1b' : '#065f46' }}>{msg.text}</div>}

      {/* 表單 */}
      <div style={s.formCard}>
        <h4 style={s.formTitle}>{editId ? `修改公告 (ID: ${editId})` : '新增公告'}</h4>
        <form onSubmit={handleSubmit}>
          <div style={s.formRow}>
            <label style={s.label}>標題 *</label>
            <input style={s.input} value={form.title} required
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div style={s.formRow}>
            <label style={s.label}>內容 *</label>
            <textarea style={{ ...s.input, height: '80px', resize: 'vertical' }} value={form.content} required
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={s.formRow}>
              <label style={s.label}>優先度</label>
              <select style={{ ...s.input, width: 'auto' }} value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="重要">🔴 重要</option>
                <option value="一般">🟢 一般</option>
              </select>
            </div>
            <div style={s.formRow}>
              <label style={s.label}>排序</label>
              <input type="number" style={{ ...s.input, width: '80px' }} value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
              啟用
            </label>
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', marginTop: '4px' }}>
            <div style={s.formRow}>
              <label style={s.label}>顯示起始（選填，空＝立即）</label>
              <input type="datetime-local" style={{ ...s.input, width: 'auto' }} value={form.startAt}
                onChange={e => setForm(f => ({ ...f, startAt: e.target.value }))} />
            </div>
            <div style={s.formRow}>
              <label style={s.label}>顯示截止（選填，空＝不限）</label>
              <input type="datetime-local" style={{ ...s.input, width: 'auto' }} value={form.endAt}
                onChange={e => setForm(f => ({ ...f, endAt: e.target.value }))} />
            </div>
            {(form.startAt || form.endAt) && (
              <button type="button" style={{ ...s.btnSecondary, padding: '6px 12px' }}
                onClick={() => setForm(f => ({ ...f, startAt: '', endAt: '' }))}>清除期間</button>
            )}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
            白板只在「現在時間」落在此區間內才顯示此公告；兩端皆空＝永遠顯示。後台清單仍會列出全部。
          </div>
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            <button type="submit" style={s.btnPrimary}>{editId ? '儲存修改' : '+ 新增'}</button>
            {editId && <button type="button" style={s.btnSecondary} onClick={resetForm}>取消</button>}
          </div>
        </form>
      </div>

      {/* 清單 */}
      <div style={s.listCard}>
        <h4 style={s.formTitle}>公告清單（共 {list.length} 筆）</h4>
        {list.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '14px' }}>尚無公告，請新增</p> : (
          <table style={s.table}>
            <thead>
              <tr>{['ID','標題','內容','優先度','排序','顯示期間','啟用','操作'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {list.map((item, i) => (
                <tr key={item.id} style={{ background: editId === item.id ? '#fef9c3' : i % 2 ? '#f9fafb' : '#fff' }}>
                  <td style={s.td}>{item.id}</td>
                  <td style={s.td}>{item.title || '—'}</td>
                  <td style={{ ...s.td, maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.content}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, background: item.priority === '重要' ? '#fee2e2' : '#d1fae5', color: item.priority === '重要' ? '#991b1b' : '#065f46' }}>
                      {item.priority ?? '一般'}
                    </span>
                  </td>
                  <td style={s.td}>{item.sortOrder}</td>
                  <td style={{ ...s.td, fontSize: '12px', color: (item.startAt || item.endAt) ? '#374151' : '#9ca3af' }}>{fmtRange(item.startAt, item.endAt)}</td>
                  <td style={s.td}>
                    <button onClick={() => handleToggle(item)} style={{ ...s.badge, background: item.isActive ? '#d1fae5' : '#f3f4f6', color: item.isActive ? '#065f46' : '#6b7280' }}>
                      {item.isActive ? '✓ 啟用' : '停用'}
                    </button>
                  </td>
                  <td style={s.td}>
                    <button style={s.btnEdit} onClick={() => handleEdit(item)}>編輯</button>
                    <button style={s.btnDel}  onClick={() => handleDelete(item.id)}>刪除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// 佈告欄 Manager：上方依單位顯示「科內公告」，下方固定顯示全院共用的「院方公告」
function BulletinManager({ units }) {
  const [activeUnit, setActiveUnit] = useState(units[0] ?? 'W52')
  return (
    <div>
      <UnitTabs units={units} active={activeUnit} onChange={setActiveUnit} />
      {/* 科內公告：隨選定單位變動（bulletin_unit） */}
      <BulletinSection key={`unit-${activeUnit}`} unitCode={activeUnit} category="bulletin_unit" sectionTitle={`科內公告（${UNIT_LABELS[activeUnit]}）`} />
      {/* 院方公告：全院共用、固定 unitCode="ALL"（bulletin_hosp） */}
      <BulletinSection key="hosp" unitCode="ALL" category="bulletin_hosp" sectionTitle="院方公告（全院共用）" />
    </div>
  )
}

// ── 避難圖管理 ─────────────────────────────────────────────────
// 三個子區塊：避難圖圖片(EvacImageSection)、避難設備清單(EvacEquipSection)、
// 緊急聯絡(EvacContactSection)，皆呼叫 evacuationApi。
const emptyEvacEquipForm = { equipmentName: '', location: '', quantity: 1, sortOrder: 0, isActive: true }
const emptyEvacContactForm = { name: '', extension: '', sortOrder: 0, isActive: true }

// 避難圖圖片上傳/預覽/刪除（圖片以單位為單位，一單位一張）
function EvacImageSection({ unitCode }) {
  const [info, setInfo]         = useState(null)   // 後端圖片中繼資料 EvacImageItem | null
  const [file, setFile]         = useState(null)    // 使用者選取、待上傳的檔案
  const [preview, setPreview]   = useState(null)    // 本機預覽用的 objectURL
  const [msg, setMsg]           = useState({ text: '', error: false })
  const imgTs = useState(Date.now())[0]   // cache-busting (reload after upload)
  const [ts, setTs]             = useState(Date.now())   // 上傳/刪除後更新此值以破壞圖片快取

  const showMsg = (text, error = false) => { setMsg({ text, error }); setTimeout(() => setMsg({ text: '', error: false }), 3000) }

  // 讀取目前單位是否已有上傳的避難圖
  const loadInfo = useCallback(async () => {
    const i = await evacuationApi.getImageInfo(unitCode).catch(() => null)
    setInfo(i)
  }, [unitCode])

  // 切換單位時重新讀取圖片資訊並清掉待上傳檔案/預覽
  useEffect(() => { loadInfo(); setFile(null); setPreview(null) }, [loadInfo])

  // 選檔後產生本機預覽
  const handleFile = e => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  // 上傳選定檔案，成功後更新時間戳以重新載入（避開瀏覽器快取）
  const handleUpload = async () => {
    if (!file) return
    try {
      await evacuationApi.uploadImage(unitCode, file)
      showMsg('上傳成功')
      setFile(null); setPreview(null)
      setTs(Date.now())
      loadInfo()
    } catch { showMsg('上傳失敗', true) }
  }

  // 刪除現有圖片（先二次確認）
  const handleDelete = async () => {
    if (!window.confirm('確定刪除圖片？')) return
    try {
      await evacuationApi.deleteImage(unitCode)
      showMsg('已刪除')
      setTs(Date.now())
      loadInfo()
    } catch { showMsg('刪除失敗', true) }
  }

  return (
    <div style={s.formCard}>
      {msg.text && <div style={{ ...s.msg, background: msg.error ? '#fee2e2' : '#d1fae5', color: msg.error ? '#991b1b' : '#065f46' }}>{msg.text}</div>}
      <h4 style={s.formTitle}>避難圖圖片</h4>

      {/* 目前圖片 */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          {info
            ? <div style={{ fontSize: '13px', color: '#374151', marginBottom: '8px' }}>
                已上傳：{info.origName}　（{new Date(info.uploadedAt).toLocaleString('zh-TW')}）
              </div>
            : <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}>尚未上傳圖片</div>
          }
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="file" accept=".jpg,.jpeg,.png" onChange={handleFile}
              style={{ fontSize: '13px' }} />
            {file && <button style={s.btnPrimary} onClick={handleUpload}>上傳</button>}
            {info && <button style={{ ...s.btnSecondary, color: '#991b1b' }} onClick={handleDelete}>刪除現有圖片</button>}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>支援 JPG / PNG，建議寬度 1200px 以上</div>
        </div>

        {/* 預覽 */}
        <div style={{ width: '240px', flexShrink: 0 }}>
          {(preview || info) && (
            <img
              src={preview ?? `${evacuationApi.imageUrl(unitCode)}?t=${ts}`}
              alt="預覽"
              style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: '6px', objectFit: 'contain', maxHeight: '160px' }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// 單一單位的避難設備清單 CRUD（名稱/位置/數量）
function EvacEquipSection({ unitCode }) {
  const { list, form, setForm, editId, msg, handleSubmit, handleEdit, handleDelete, handleToggle, resetForm } = useCrudSection({
    emptyForm: emptyEvacEquipForm,
    fetchList: () => evacuationApi.getEquipment(unitCode, true),
    create: (payload) => evacuationApi.createEquipment(payload),
    update: (id, payload) => evacuationApi.updateEquipment(id, payload),
    remove: (id) => evacuationApi.removeEquipment(id),
    toPayload: (form) => ({ unitCode, ...form }),
    toForm: (item) => ({ equipmentName: item.equipmentName, location: item.location ?? '', quantity: item.quantity, sortOrder: item.sortOrder, isActive: item.isActive }),
  })

  return (
    <div style={{ marginBottom: '20px' }}>
      {msg.text && <div style={{ ...s.msg, background:msg.error?'#fee2e2':'#d1fae5', color:msg.error?'#991b1b':'#065f46' }}>{msg.text}</div>}
      <div style={s.formCard}>
        <h4 style={s.formTitle}>{editId ? `修改設備 (ID: ${editId})` : '新增設備'}</h4>
        <form onSubmit={handleSubmit}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
            <div style={s.formRow}><label style={s.label}>設備名稱 *</label><input style={s.input} value={form.equipmentName} required onChange={e=>setForm(f=>({...f,equipmentName:e.target.value}))} placeholder="滅火器"/></div>
            <div style={s.formRow}><label style={s.label}>位置</label><input style={s.input} value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="護理站旁"/></div>
          </div>
          <div style={{ display:'flex', gap:'16px', alignItems:'center', marginTop:'4px' }}>
            <div style={s.formRow}><label style={s.label}>數量</label><input type="number" min="1" style={{...s.input,width:'80px'}} value={form.quantity} onChange={e=>setForm(f=>({...f,quantity:Number(e.target.value)||1}))} /></div>
            <div style={s.formRow}><label style={s.label}>排序</label><input type="number" style={{...s.input,width:'80px'}} value={form.sortOrder} onChange={e=>setForm(f=>({...f,sortOrder:Number(e.target.value)}))} /></div>
            <label style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'14px',cursor:'pointer'}}><input type="checkbox" checked={form.isActive} onChange={e=>setForm(f=>({...f,isActive:e.target.checked}))}/>啟用</label>
          </div>
          <div style={{marginTop:'14px',display:'flex',gap:'8px'}}>
            <button type="submit" style={s.btnPrimary}>{editId?'儲存修改':'+ 新增'}</button>
            {editId && <button type="button" style={s.btnSecondary} onClick={resetForm}>取消</button>}
          </div>
        </form>
      </div>
      <div style={s.listCard}>
        <h4 style={s.formTitle}>設備清單（{list.length} 筆）</h4>
        {list.length===0 ? <p style={{color:'#9ca3af',fontSize:'14px'}}>尚無設備，請新增</p> : (
          <table style={s.table}>
            <thead><tr>{['ID','設備名稱','位置','數量','排序','啟用','操作'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>{list.map((item,i)=>(
              <tr key={item.id} style={{background:editId===item.id?'#fef9c3':i%2?'#f9fafb':'#fff'}}>
                <td style={s.td}>{item.id}</td><td style={s.td}>{item.equipmentName}</td>
                <td style={s.td}>{item.location||'—'}</td><td style={s.td}>{item.quantity}</td>
                <td style={s.td}>{item.sortOrder}</td>
                <td style={s.td}><button onClick={()=>handleToggle(item)} style={{...s.badge,background:item.isActive?'#d1fae5':'#f3f4f6',color:item.isActive?'#065f46':'#6b7280'}}>{item.isActive?'✓ 啟用':'停用'}</button></td>
                <td style={s.td}><button style={s.btnEdit} onClick={()=>handleEdit(item)}>編輯</button><button style={s.btnDel} onClick={()=>handleDelete(item.id)}>刪除</button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// 單一單位的緊急聯絡 CRUD（名稱/分機）
function EvacContactSection({ unitCode }) {
  const { list, form, setForm, editId, msg, handleSubmit, handleEdit, handleDelete, handleToggle, resetForm } = useCrudSection({
    emptyForm: emptyEvacContactForm,
    fetchList: () => evacuationApi.getContact(unitCode, true),
    create: (payload) => evacuationApi.createContact(payload),
    update: (id, payload) => evacuationApi.updateContact(id, payload),
    remove: (id) => evacuationApi.removeContact(id),
    toPayload: (form) => ({ unitCode, ...form }),
    toForm: (item) => ({ name: item.name, extension: item.extension, sortOrder: item.sortOrder, isActive: item.isActive }),
  })

  return (
    <div>
      {msg.text && <div style={{...s.msg,background:msg.error?'#fee2e2':'#d1fae5',color:msg.error?'#991b1b':'#065f46'}}>{msg.text}</div>}
      <div style={s.formCard}>
        <h4 style={s.formTitle}>{editId?`修改緊急聯絡 (ID: ${editId})`:'新增緊急聯絡'}</h4>
        <form onSubmit={handleSubmit}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
            <div style={s.formRow}><label style={s.label}>名稱 *</label><input style={s.input} value={form.name} required onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="院內保全"/></div>
            <div style={s.formRow}><label style={s.label}>分機 *</label><input style={s.input} value={form.extension} required onChange={e=>setForm(f=>({...f,extension:e.target.value}))} placeholder="9119"/></div>
          </div>
          <div style={{display:'flex',gap:'16px',alignItems:'center',marginTop:'4px'}}>
            <div style={s.formRow}><label style={s.label}>排序</label><input type="number" style={{...s.input,width:'80px'}} value={form.sortOrder} onChange={e=>setForm(f=>({...f,sortOrder:Number(e.target.value)}))}/></div>
            <label style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'14px',cursor:'pointer'}}><input type="checkbox" checked={form.isActive} onChange={e=>setForm(f=>({...f,isActive:e.target.checked}))}/>啟用</label>
          </div>
          <div style={{marginTop:'14px',display:'flex',gap:'8px'}}>
            <button type="submit" style={s.btnPrimary}>{editId?'儲存修改':'+ 新增'}</button>
            {editId && <button type="button" style={s.btnSecondary} onClick={resetForm}>取消</button>}
          </div>
        </form>
      </div>
      <div style={s.listCard}>
        <h4 style={s.formTitle}>緊急聯絡（{list.length} 筆）</h4>
        {list.length===0?<p style={{color:'#9ca3af',fontSize:'14px'}}>尚無資料，請新增</p>:(
          <table style={s.table}>
            <thead><tr>{['ID','名稱','分機','排序','啟用','操作'].map(h=><th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>{list.map((item,i)=>(
              <tr key={item.id} style={{background:editId===item.id?'#fef9c3':i%2?'#f9fafb':'#fff'}}>
                <td style={s.td}>{item.id}</td><td style={s.td}>{item.name}</td><td style={s.td}>{item.extension}</td>
                <td style={s.td}>{item.sortOrder}</td>
                <td style={s.td}><button onClick={()=>handleToggle(item)} style={{...s.badge,background:item.isActive?'#d1fae5':'#f3f4f6',color:item.isActive?'#065f46':'#6b7280'}}>{item.isActive?'✓ 啟用':'停用'}</button></td>
                <td style={s.td}><button style={s.btnEdit} onClick={()=>handleEdit(item)}>編輯</button><button style={s.btnDel} onClick={()=>handleDelete(item.id)}>刪除</button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// 避難圖 Manager（含單位切換）：依序呈現圖片、設備清單、緊急聯絡三區塊
function EvacManager({ units }) {
  const [activeUnit, setActiveUnit] = useState(units[0] ?? 'W52')
  return (
    <div>
      <UnitTabs units={units} active={activeUnit} onChange={setActiveUnit} />
      <div style={s.sectionSub}>圖片管理</div>
      <EvacImageSection key={`img-${activeUnit}`} unitCode={activeUnit} />
      <div style={{...s.sectionSub, marginTop:'20px'}}>避難設備清單</div>
      <EvacEquipSection key={`eq-${activeUnit}`} unitCode={activeUnit} />
      <div style={{...s.sectionSub, marginTop:'20px'}}>緊急聯絡</div>
      <EvacContactSection key={`ct-${activeUnit}`} unitCode={activeUnit} />
    </div>
  )
}

// ── 共用：載入某單位的護理師（人員管理職別含「護理」者），供責任護理師下拉 ──
function useUnitNurses(unitCode) {
  const [nurses, setNurses] = useState([])
  useEffect(() => {
    if (!unitCode) return
    wardApi.getUnitRoles(null, unitCode, false).then(rs => {
      const seen = new Set(); const out = []
      ;(rs ?? []).filter(r => (r.role || '').includes('護理')).forEach(r => { if (!seen.has(r.staffId)) { seen.add(r.staffId); out.push({ staffId: r.staffId, name: r.name }) } })
      setNurses(out)
    }).catch(() => {})
  }, [unitCode])
  return nurses
}

// ── 共用：護理師快速選取（單框 combobox）──
// 直接在框內打字，下方浮出符合的選項點選。options:[{value,label}]；
// value 可為姓名（WardExt，allowFree=可自由輸入）或 StaffId（照護提醒，須由清單點選）。
function NurseSelect({ options, value, onChange, allowFree = false, placeholder = '輸入或點選護理師' }) {
  const labelOf = v => options.find(o => String(o.value) === String(v))?.label ?? (allowFree ? (v ?? '') : '')
  const [q, setQ] = useState(() => labelOf(value))
  const [open, setOpen] = useState(false)
  useEffect(() => { setQ(labelOf(value)) }, [value, options.length])   // 編輯載入時同步顯示
  const filtered = q ? options.filter(o => o.label.includes(q)) : options
  const pick = o => { onChange(o.value); setQ(o.label); setOpen(false) }
  return (
    <div style={{ position: 'relative' }}>
      <input style={s.input} value={q} placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={e => { setQ(e.target.value); setOpen(true); onChange(allowFree ? e.target.value : '') }}
        onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', zIndex: 30, left: 0, right: 0, top: '100%', marginTop: '2px', maxHeight: '190px', overflowY: 'auto', background: '#fff', border: '1px solid #d1d5db', borderRadius: '6px', boxShadow: '0 4px 14px rgba(0,0,0,.14)' }}>
          {filtered.map(o => (
            <div key={o.value} onMouseDown={() => pick(o)}
              style={{ padding: '7px 12px', cursor: 'pointer', fontSize: '14px' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f0fdf4')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>{o.label}</div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 共用：人員多選核取（含關鍵字篩選）── value 為逗號分隔 staffId；onToggle(id) 切換
function StaffCheckPicker({ staff, value, onToggle }) {
  const [kw, setKw] = useState('')
  const sel = (value || '').split(',').filter(Boolean)
  const list = kw ? staff.filter(p => (p.name || '').includes(kw) || (p.employeeNo || '').includes(kw)) : staff
  return (
    <div>
      <input style={{ ...s.input, marginBottom: '6px', maxWidth: '260px' }} value={kw} onChange={e => setKw(e.target.value)} placeholder="🔍 篩選姓名 / 員編" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px' }}>
        {list.map(p => {
          const on = sel.includes(String(p.id))
          return <label key={p.id} style={{ fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', background: on ? '#dcfce7' : 'transparent', padding: '2px 6px', borderRadius: '4px' }}><input type="checkbox" checked={on} onChange={() => onToggle(p.id)} />{p.name}</label>
        })}
      </div>
      {sel.length > 0 && <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px' }}>已選 {sel.length} 人</div>}
    </div>
  )
}

// ── 病室動態：病人臨床補充層（WardPatientExt）─────────────────────
// 補 Board_bed 不足的臨床欄位（病況/狀態/各註記旗標/管路…；主治/轉入日期/診斷由院方 API 帶入，科別 W52/ICU/ER 亦由 API，僅 OR 自填），
// 以病歷號(Hhisnum)識別病人；看板以病歷號把本表疊到 Board_bed 真實在床病人上。
// 責任護理師：W52/ICU/ER 由人員管理下拉（含關鍵字篩選），OR 不適用（改刷手/流動護理師）。
const emptyWardExtForm = {
  hhisnum: '', department: '', attendingDoctor: '', primaryNurse: '', diagnosis: '',
  condition: '', bedStatus: '', admissionDate: '', isolation: '', dependency: '', transport: '', notes: '',
  dnr: false, fallRisk: false, confidential: false, noTreatment: false, npo: false, allergy: false,
  rrt: false, chemo: false, oxygen: false, renal: false,
  portCath: false, dlvc: false, foley: false, cvc: false, cardiacCath: false,
  ventilator: false, crrt: false, ng: false,
  surgery: false, exam: false, consult: false,
  // ── ER 專屬狀態 ──
  observation: false, awaiting: false, awaitingType: '', transferIn: false, transferOut: false, transferHospital: '', transferInHospital: '',
  admitted: false, admBedNo: '', aad: false, mbd: false, deceased: false, arrivalDate: '', arrivalTime: '',
  // ── OR 專屬 ──
  scrubNurse: '', circNurse: '', surgeryStatus: '', startTime: '', endTime: '',
  isActive: true,
}
// 旗標欄位（key→中文），以 checkbox 呈現
const WARD_BOOLS = [
  ['dnr','DNR'],['fallRisk','高危跌'],['confidential','保密'],['noTreatment','禁治療'],['npo','禁食'],
  ['allergy','過敏'],['rrt','RRT'],['chemo','化療'],['oxygen','氧氣'],['renal','洗腎'],
  ['portCath','人工血管'],['dlvc','雙腔靜脈'],['foley','導尿管'],['cvc','中心靜脈'],['cardiacCath','心導管'],
  ['ventilator','呼吸器'],['crrt','CRRT'],['ng','鼻胃管'],
  ['surgery','手術'],['exam','檢查'],['consult','會診'],
]
// ER 專屬狀態旗標（只在 ER 單位顯示，不污染 W52/ICU 表單）
// 留觀/待床由院方 Flow 帶入，後台不再設定（保留 DNR/轉入/轉出/住院/AAD/MBD/死亡）
const ER_BOOLS = [
  ['dnr','DNR'],['transferIn','轉入'],['transferOut','轉出'],
  ['admitted','住院'],['aad','AAD'],['mbd','MBD'],['deceased','死亡'],
]
const COND_OPTS = ['', '穩定', '重症', '危急']
const BEDSTATUS_OPTS = ['', 'occupied', 'isolation', 'transfer', 'transfer-in', 'discharge']
const ISO_OPTS = ['', '無', '接觸隔離', '飛沫隔離', '空氣隔離', '負壓隔離']
const DEP_OPTS = ['', 'L1', 'L2', 'L3']
const TRANSPORT_OPTS = ['', '輪椅', '推床']
const AWAIT_OPTS = ['', '一般', '加護', '隔離']

// 單一單位的臨床補充 CRUD（讀取 includeAll=true，後台含停用）
// 臨床補充編輯彈窗樣式（rosterMode）
const extEditOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 60, padding: '30px 16px', overflowY: 'auto' }
const extEditModal = { background: '#fff', borderRadius: '12px', width: '880px', maxWidth: '95vw', padding: '20px 24px', boxShadow: '0 8px 32px rgba(0,0,0,.25)' }
function WardExtSection({ unitCode }) {
  const rosterMode = ['W52', 'ICU', 'ER'].includes(unitCode)   // 病床類：當前在床病人清單驅動；OR（刀房）維持手動
  const [list, setList]     = useState([])
  const [occ, setOcc]       = useState({})   // 病歷號 → 目前床號（在床對照）
  const [roster, setRoster] = useState([])   // rosterMode：當前在床病人（真實姓名＋床號）
  const [selPat, setSelPat] = useState(null) // rosterMode：目前編輯中的病人（姓名/床，抬頭顯示；亦控制彈窗開關）
  const [showHistory, setShowHistory] = useState(false) // rosterMode：清單是否含已離床/歷史補充
  const [form, setForm]     = useState(emptyWardExtForm)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(true)  // 讀取中（向院方 API 取在床資料，較慢）
  const nurses = useUnitNurses(unitCode)         // OR 刷手/流動：該單位護理人員（職別含「護理」）
  const [msg, setMsg]       = useState({ text: '', error: false })

  const showMsg = (text, error = false) => { setMsg({ text, error }); setTimeout(() => setMsg({ text: '', error: false }), 3000) }
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [rows, occList, rosterList] = await Promise.all([
        wardApi.getExt(unitCode, true),
        wardApi.getOccupancy(unitCode).catch(() => []),   // 在床對照失敗不影響清單
        rosterMode ? wardApi.getRoster(unitCode).catch(() => []) : Promise.resolve([]),
      ])
      setList(rows ?? [])
      const m = {}; (occList ?? []).forEach(o => { if (o.hhisnum) m[o.hhisnum.trim()] = o.bed })
      setOcc(m)
      setRoster(rosterList ?? [])
    } catch { showMsg('讀取失敗', true) }
    finally { setLoading(false) }
  }, [unitCode, rosterMode])
  useEffect(() => { load() }, [load])
  // 儲存後只刷新「補充清單」以更新已設定旗標；不重新向院方取在床資料、不顯示 loading
  const reloadExt = async () => { try { setList((await wardApi.getExt(unitCode, true)) ?? []) } catch { /* 靜默：不影響當前畫面 */ } }
  const deleteExt = async () => {
    if (!editId) return
    if (!window.confirm('確定刪除此病人的臨床補充？')) return
    try { await wardApi.removeExt(editId); showMsg('刪除成功'); setForm(emptyWardExtForm); setEditId(null); setSelPat(null); reloadExt() }
    catch { showMsg('刪除失敗', true) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...form, unitCode, isActive: true }   // 臨床補充一律啟用（已移除啟用開關；要下板改用刪除）
    try {
      if (editId) { await wardApi.updateExt(editId, payload); showMsg('修改成功') }
      else        { await wardApi.createExt(payload); showMsg('新增成功') }
      setForm(emptyWardExtForm); setEditId(null); setSelPat(null); reloadExt()
    } catch { showMsg('操作失敗（病歷號是否重複？）', true) }
  }
  const handleEdit = item => {
    setEditId(item.id)
    setForm({
      hhisnum: item.hhisnum ?? '', department: item.department ?? '', attendingDoctor: item.attendingDoctor ?? '',
      primaryNurse: item.primaryNurse ?? '', diagnosis: item.diagnosis ?? '', condition: item.condition ?? '',
      bedStatus: item.bedStatus ?? '', admissionDate: item.admissionDate ?? '', isolation: item.isolation ?? '',
      dependency: item.dependency ?? '', transport: item.transport ?? '', notes: item.notes ?? '',
      dnr: !!item.dnr, fallRisk: !!item.fallRisk, confidential: !!item.confidential, noTreatment: !!item.noTreatment,
      npo: !!item.npo, allergy: !!item.allergy, rrt: !!item.rrt, chemo: !!item.chemo, oxygen: !!item.oxygen,
      renal: !!item.renal, portCath: !!item.portCath, dlvc: !!item.dlvc, foley: !!item.foley, cvc: !!item.cvc,
      cardiacCath: !!item.cardiacCath, ventilator: !!item.ventilator, crrt: !!item.crrt, ng: !!item.ng,
      surgery: !!item.surgery, exam: !!item.exam, consult: !!item.consult,
      observation: !!item.observation, awaiting: !!item.awaiting, awaitingType: item.awaitingType ?? '',
      transferIn: !!item.transferIn, transferOut: !!item.transferOut, transferHospital: item.transferHospital ?? '', transferInHospital: item.transferInHospital ?? '',
      admitted: !!item.admitted, admBedNo: item.admBedNo ?? '', aad: !!item.aad, mbd: !!item.mbd,
      deceased: !!item.deceased, arrivalDate: item.arrivalDate ?? '', arrivalTime: item.arrivalTime ?? '',
      scrubNurse: item.scrubNurse ?? '', circNurse: item.circNurse ?? '', surgeryStatus: item.surgeryStatus ?? '',
      startTime: item.startTime ?? '', endTime: item.endTime ?? '',
      isActive: !!item.isActive,
    })
  }
  const handleDelete = async id => { if (!window.confirm('確定刪除？')) return; try { await wardApi.removeExt(id); showMsg('刪除成功'); load() } catch { showMsg('刪除失敗', true) } }

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  // OR 刷手/流動：該單位護理人員去重姓名，供可查詢下拉（allowFree 亦可自行輸入）
  const nurseOpts = [...new Set((nurses || []).map(n => n.name).filter(Boolean))].map(n => ({ value: n, label: n }))
  // rosterMode：病歷號 → 既有補充；點某病人「編輯」→ 有既有補充帶出、否則開新（已填病歷號）
  const extByHis = {}; list.forEach(e => { if (e.hhisnum) extByHis[e.hhisnum.trim()] = e })
  const editPatient = (p) => {
    setSelPat(p)
    const ext = extByHis[p.hhisnum?.trim()]
    if (ext) handleEdit(ext)
    else { setEditId(null); setForm({ ...emptyWardExtForm, hhisnum: p.hhisnum }) }
  }
  // rosterMode 清單：在床病人＋（可選）已離床/歷史補充
  const rosterHisSet = new Set((roster || []).map(p => (p.hhisnum || '').trim()))
  const displayRows = !rosterMode ? [] : [
    ...roster.map(p => ({ hhisnum: p.hhisnum, bedId: p.bedId, patientName: p.patientName, gender: p.gender, age: p.age, diagnosis: p.diagnosis, onBed: true })),
    ...(showHistory ? list.filter(e => e.hhisnum && !rosterHisSet.has(e.hhisnum.trim()))
        .map(e => ({ hhisnum: e.hhisnum, bedId: '已離床', patientName: `病歷號 ${e.hhisnum}`, gender: null, age: null, diagnosis: null, onBed: false })) : []),
  ]

  return (
    <div>
      {msg.text && <div style={{ ...s.msg, background: msg.error ? '#fee2e2' : '#d1fae5', color: msg.error ? '#991b1b' : '#065f46' }}>{msg.text}</div>}
      {/* rosterMode：表單走彈窗（selPat 開啟）；非 rosterMode：表單內嵌 */}
      <div style={rosterMode ? (selPat ? extEditOverlay : { display: 'none' }) : { display: 'contents' }} onClick={rosterMode ? () => { setForm(emptyWardExtForm); setEditId(null); setSelPat(null) } : undefined}>
      <div style={rosterMode ? extEditModal : s.formCard} onClick={rosterMode ? (e => e.stopPropagation()) : undefined}>
        <h4 style={s.formTitle}>{rosterMode ? `臨床補充：${selPat?.patientName}（${selPat?.bedId}）` : (editId ? `修改臨床補充 (ID: ${editId})` : '新增臨床補充')}</h4>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>
          以「病歷號」對應 Board_bed 真實在床病人。基本（姓名/性別/生日/床號）＋<b>主治醫師（負責醫師）/入院日（轉入日期）</b>由院方 API 提供，此處只補其餘臨床欄位。
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
            {rosterMode
              ? <div style={s.formRow}><label style={s.label}>病歷號</label><input style={{ ...s.input, background: '#f3f4f6', color: '#6b7280' }} value={form.hhisnum} readOnly /></div>
              : <div style={s.formRow}><label style={s.label}>病歷號 *</label><input style={s.input} value={form.hhisnum} required onChange={e => setF('hhisnum', e.target.value)} placeholder="19021524" /></div>}
            {unitCode === 'OR' && (
              <div style={s.formRow}><label style={s.label}>科別</label><input style={s.input} value={form.department} onChange={e => setF('department', e.target.value)} /></div>
            )}
            {/* ER 規格書無「病況等級/床位狀態/運送/依賴度」，僅保留隔離 */}
            {unitCode !== 'ER' && (<>
            <div style={s.formRow}><label style={s.label}>病況等級</label><select style={s.input} value={form.condition} onChange={e => setF('condition', e.target.value)}>{COND_OPTS.map(o => <option key={o} value={o}>{o || '（無）'}</option>)}</select></div>
            <div style={s.formRow}><label style={s.label}>床位狀態</label><select style={s.input} value={form.bedStatus} onChange={e => setF('bedStatus', e.target.value)}>{BEDSTATUS_OPTS.map(o => <option key={o} value={o}>{o || '（占床 occupied）'}</option>)}</select></div>
            </>)}
            <div style={s.formRow}><label style={s.label}>隔離</label><select style={s.input} value={form.isolation} onChange={e => setF('isolation', e.target.value)}>{ISO_OPTS.map(o => <option key={o} value={o}>{o || '（無）'}</option>)}</select></div>
            {unitCode !== 'ER' && (<>
            <div style={s.formRow}><label style={s.label}>運送</label><select style={s.input} value={form.transport} onChange={e => setF('transport', e.target.value)}>{TRANSPORT_OPTS.map(o => <option key={o} value={o}>{o || '（無）'}</option>)}</select></div>
            <div style={s.formRow}><label style={s.label}>依賴度</label><select style={s.input} value={form.dependency} onChange={e => setF('dependency', e.target.value)}>{DEP_OPTS.map(o => <option key={o} value={o}>{o || '（無）'}</option>)}</select></div>
            </>)}
          </div>
          {/* 診斷：四站皆由院方 API 帶入（Board_bed / Board_ER / Board_OR），後台不再輸入 */}
          <div style={s.formRow}><label style={s.label}>備註</label><textarea style={{ ...s.input, height: '52px', resize: 'vertical' }} value={form.notes} onChange={e => setF('notes', e.target.value)} /></div>
          {unitCode === 'ER' && (
            <>
              {/* 到院日/到院時間由院方 Board_ER 帶入，後台不再輸入 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px', marginBottom: '8px' }}>
                <div style={s.formRow}><label style={s.label}>待床</label>
                  <select style={s.input} value={form.awaiting ? form.awaitingType : ''}
                    onChange={e => { const v = e.target.value; setForm(f => ({ ...f, awaiting: v !== '', awaitingType: v })) }}>
                    <option value="">無</option><option value="一般">一般</option><option value="加護">加護</option><option value="隔離">隔離</option>
                  </select></div>
                <div style={s.formRow}><label style={s.label}>轉出醫院</label><input style={s.input} value={form.transferHospital} onChange={e => setF('transferHospital', e.target.value)} placeholder="轉往哪家醫院" /></div>
                <div style={s.formRow}><label style={s.label}>轉入醫院</label><input style={s.input} value={form.transferInHospital} onChange={e => setF('transferInHospital', e.target.value)} placeholder="自哪家醫院轉入" /></div>
                <div style={s.formRow}><label style={s.label}>住院床號</label><input style={s.input} value={form.admBedNo} onChange={e => setF('admBedNo', e.target.value)} placeholder="W52-031" /></div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', margin: '4px 0 12px' }}>
                {ER_BOOLS.map(([k, lbl]) => (
                  <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form[k]} onChange={e => setF(k, e.target.checked)} />{lbl}
                  </label>
                ))}
              </div>
            </>
          )}
          {unitCode === 'OR' && (
            <>
              <label style={s.label}>手術欄位（OR；以病歷號對應 Board_OR 今日手術）</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px', marginBottom: '4px' }}>
                <div style={s.formRow}><label style={s.label}>刷手護理師</label><NurseSelect options={nurseOpts} value={form.scrubNurse} onChange={v => setF('scrubNurse', v)} allowFree placeholder="輸入或點選護理師" /></div>
                <div style={s.formRow}><label style={s.label}>流動護理師</label><NurseSelect options={nurseOpts} value={form.circNurse} onChange={v => setF('circNurse', v)} allowFree placeholder="輸入或點選護理師" /></div>
                <div style={s.formRow} />
                <div style={s.formRow}><label style={s.label}>實際進刀房(HH:mm)</label><input style={s.input} value={form.startTime} onChange={e => setF('startTime', e.target.value)} placeholder="09:05" /></div>
                <div style={s.formRow}><label style={s.label}>實際出刀房(HH:mm)</label><input style={s.input} value={form.endTime} onChange={e => setF('endTime', e.target.value)} placeholder="10:18" /></div>
              </div>
              <div style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 12px' }}>手術狀態由系統自動判定（不使用「準備中」）：未登記進刀房一律<b>排程</b>、已填實際進刀房且已到→<b>手術中</b>、已填實際出刀房→<b>已完成</b>。房卡：某台過預定時間後仍停留 60 分鐘，之後若有下一台則改顯示下一台。</div>
            </>
          )}
          {unitCode !== 'ER' && (<>
          <label style={s.label}>註記旗標</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', margin: '4px 0 12px' }}>
            {WARD_BOOLS.map(([k, lbl]) => (
              <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" checked={form[k]} onChange={e => setF(k, e.target.checked)} />{lbl}
              </label>
            ))}
          </div>
          </>)}
          {/* 「啟用」開關已移除：臨床補充儲存後一律上板；要暫時下板請用「刪除」 */}
          <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
            <button type="submit" style={s.btnPrimary}>{editId ? '儲存修改' : (rosterMode ? '儲存' : '+ 新增')}</button>
            {(editId || rosterMode) && <button type="button" style={s.btnSecondary} onClick={() => { setForm(emptyWardExtForm); setEditId(null); setSelPat(null) }}>取消</button>}
            {rosterMode && editId && <button type="button" style={s.btnDel} onClick={deleteExt}>刪除</button>}
          </div>
        </form>
      </div>
      </div>
      <div style={s.listCard}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <h4 style={{ ...s.formTitle, margin: 0 }}>{rosterMode ? `當前在床病人（共 ${roster.length} 位）` : `臨床補充清單（共 ${list.length} 筆）`}</h4>
          {rosterMode && <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}><input type="checkbox" checked={showHistory} onChange={e => setShowHistory(e.target.checked)} />顯示已離床 / 歷史</label>}
        </div>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '30px', color: '#6b7280', fontSize: '14px' }}>
            <span style={{ width: '20px', height: '20px', border: '3px solid #d6e0ea', borderTopColor: '#2D7A55', borderRadius: '50%', animation: 'board-spin 0.9s linear infinite' }} />
            讀取中…（正在向院方系統取得在床資料）
          </div>
        ) : rosterMode ? (
          displayRows.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '14px' }}>目前無在床病人（或院方在床資料取得失敗，稍後再試）</p> : (
            <table style={s.table}>
              <thead><tr>{['床號', '姓名', '病歷號', '性別/年齡', '診斷', '已設定', '操作'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {displayRows.map((p, i) => {
                  const ext = extByHis[p.hhisnum?.trim()]
                  // 「已設定」依實際內容判定（旗標/病況/隔離/床位狀態/運送/依賴度/備註）；全清空→未設定
                  const summary = ext ? [
                    ...(unitCode === 'ER' ? ER_BOOLS : WARD_BOOLS).filter(([k]) => ext[k]).map(([, l]) => l),
                    ...(ext.isolation && ext.isolation !== '無' ? ['隔離'] : []),
                    ...(ext.awaiting ? ['待床' + (ext.awaitingType || '')] : []),
                    ...(unitCode !== 'ER' ? [
                      ...(ext.condition ? [ext.condition] : []),
                      ...(ext.bedStatus && ext.bedStatus !== 'occupied' ? [ext.bedStatus] : []),
                      ...(ext.transport ? ['運送'] : []),
                      ...(ext.dependency ? ['依賴度'] : []),
                    ] : []),
                    ...(ext.notes ? ['備註'] : []),
                  ] : []
                  return (
                    <tr key={(p.onBed ? 'b-' : 'h-') + p.hhisnum} style={{ background: selPat?.hhisnum === p.hhisnum ? '#fef9c3' : (!p.onBed ? '#fafafa' : (i % 2 ? '#f9fafb' : '#fff')) }}>
                      <td style={s.td}>{p.onBed
                        ? <span style={{ ...s.badge, background: '#dbeafe', color: '#1e40af' }}>{p.bedId}</span>
                        : <span style={{ ...s.badge, background: '#f3f4f6', color: '#9ca3af' }}>已離床</span>}</td>
                      <td style={{ ...s.td, fontWeight: 600 }}>{p.onBed ? (p.patientName || '—') : <span style={{ color: '#9ca3af', fontWeight: 400 }}>（已離床）</span>}</td>
                      <td style={s.td}>{p.hhisnum}</td>
                      <td style={s.td}>{p.onBed ? ([p.gender, p.age].filter(v => v != null && v !== '').join('/') || '—') : '—'}</td>
                      <td style={{ ...s.td, maxWidth: '200px', fontSize: '12px' }}>{p.onBed ? (p.diagnosis || '—') : '—'}</td>
                      <td style={{ ...s.td, maxWidth: '220px', fontSize: '12px' }}>{summary.length ? summary.join('、') : <span style={{ color: '#9ca3af' }}>未設定</span>}</td>
                      <td style={s.td}><button style={s.btnEdit} onClick={() => editPatient(p)}>編輯</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )
        ) : list.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '14px' }}>尚無資料，請新增（病歷號需對應 Board_bed 在床病人才會顯示在白板）</p> : (
          <table style={s.table}>
            <thead><tr>{['病歷號', unitCode === 'OR' ? '刀房' : '床號', ...(unitCode === 'OR' ? ['科別'] : []), '責護','病況','狀態','旗標','操作'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {list.map((item, i) => {
                const flags = WARD_BOOLS.filter(([k]) => item[k]).map(([, l]) => l)
                  .concat(item.isolation && item.isolation !== '無' ? ['隔離'] : [])
                return (
                  <tr key={item.id} style={{ background: editId === item.id ? '#fef9c3' : i % 2 ? '#f9fafb' : '#fff' }}>
                    <td style={s.td}>{item.hhisnum}</td>
                    <td style={s.td}>{occ[item.hhisnum?.trim()]
                      ? <span style={{ ...s.badge, background: '#dbeafe', color: '#1e40af' }}>{occ[item.hhisnum.trim()]}</span>
                      : <span style={{ color: '#9ca3af', fontSize: '12px' }}>{unitCode === 'OR' ? '未排今日' : '已離床'}</span>}</td>
                    {unitCode === 'OR' && <td style={s.td}>{item.department || '—'}</td>}
                    <td style={s.td}>{item.primaryNurse || '—'}</td>
                    <td style={s.td}>{item.condition || '—'}</td>
                    <td style={s.td}>{item.bedStatus || 'occupied'}</td>
                    <td style={{ ...s.td, maxWidth: '220px', fontSize: '12px' }}>{flags.join('、') || '—'}</td>
                    <td style={s.td}><button style={s.btnEdit} onClick={() => handleEdit(item)}>編輯</button><button style={s.btnDel} onClick={() => handleDelete(item.id)}>刪除</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// 註：舊「各科值班醫師」(ErOnCallSection/ErOnCallManager) 已退場，改由「值班醫師排程」供給、
// ER 看板改讀 GET /oncall-board（今日各科；內科依時段）。ErOnCallDoctor 表與 /oncall 端點保留但不再使用。

// 月曆格內的緊湊醫師查詢下拉（可自由輸入；選項限該科醫師）
function OnCallCellSelect({ options, value, onChange }) {
  const [q, setQ] = useState(value || '')
  const [open, setOpen] = useState(false)
  useEffect(() => { setQ(value || '') }, [value])
  const filtered = q ? options.filter(o => o.value.includes(q)) : options
  return (
    <div style={{ position: 'relative' }}>
      <input value={q} placeholder="醫師"
        style={{ width: '100%', boxSizing: 'border-box', padding: '3px 5px', fontSize: '12px', border: '1px solid #d1d5db', borderRadius: '4px', fontFamily: 'inherit' }}
        onFocus={() => setOpen(true)}
        onChange={e => { setQ(e.target.value); setOpen(true); onChange(e.target.value) }}
        onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', zIndex: 40, left: 0, right: 0, top: '100%', marginTop: '2px', maxHeight: '170px', overflowY: 'auto', background: '#fff', border: '1px solid #d1d5db', borderRadius: '6px', boxShadow: '0 4px 14px rgba(0,0,0,.14)' }}>
          {filtered.map(o => (
            <div key={o.value} onMouseDown={() => { onChange(o.value); setQ(o.value); setOpen(false) }}
              style={{ padding: '5px 8px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f0fdf4')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>{o.label}</div>
          ))}
        </div>
      )}
    </div>
  )
}

// 各科值班醫師「每日輪值排程」— 月曆後台（選科別＋月份→每日下拉填醫師；含科別規則/備註）
function OnCallScheduleSection() {
  const [depts, setDepts] = useState([])
  const [deptCode, setDeptCode] = useState('')
  const [ym, setYm] = useState(pmToday().slice(0, 7))     // 'YYYY-MM'
  const [doctors, setDoctors] = useState([])
  const [grid, setGrid] = useState({})                    // 'YYYY-MM-DD|slot' → {doctorName,ext,mobile,empNo,note}
  const [deptForm, setDeptForm] = useState(null)
  const [showRules, setShowRules] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, show] = pmMsgHook()

  const dept = depts.find(d => d.deptCode === deptCode) || null
  const slots = dept?.slots ? dept.slots.split(',').map(x => x.trim()).filter(Boolean) : ['']   // ['']＝單一全日
  const multiSlot = slots.length > 1 || (slots.length === 1 && slots[0] !== '')
  const [y, m] = ym.split('-').map(Number)
  const daysInMonth = (y && m) ? new Date(y, m, 0).getDate() : 30
  const firstWd = (y && m) ? new Date(y, m - 1, 1).getDay() : 1     // 0=日
  const lead = firstWd === 0 ? 6 : firstWd - 1                       // 週一為首
  const docOptions = [...new Map(doctors.map(d => [d.name, { value: d.name, label: `${d.name}${d.ext ? `（分機 ${d.ext}）` : ''}` }])).values()]

  useEffect(() => {
    wardApi.getOnCallDepts(true).then(ds => { setDepts(ds ?? []); if ((ds ?? []).length) setDeptCode(p => p || ds[0].deptCode) }).catch(() => show('讀取科別失敗', true))
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!deptCode) return
    wardApi.getDoctors(deptCode, true).then(ds => setDoctors(ds ?? [])).catch(() => {})
    const d = depts.find(x => x.deptCode === deptCode)
    if (d) setDeptForm({ id: d.id, deptCode: d.deptCode, deptName: d.deptName ?? '', slots: d.slots ?? '', callOutRule: d.callOutRule ?? '', remark: d.remark ?? '', holidayContact: d.holidayContact ?? '', ext: d.ext ?? '', mobile: d.mobile ?? '', sortOrder: d.sortOrder, isActive: d.isActive })
  }, [deptCode, depts])

  const loadRoster = useCallback(async () => {
    if (!deptCode || !y || !m) return
    setLoading(true)
    try {
      const from = `${ym}-01`; const to = `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
      const rows = await wardApi.getOnCallRoster(deptCode, from, to)
      const g = {}; (rows ?? []).forEach(r => { g[`${String(r.onCallDate).slice(0, 10)}|${r.slot ?? ''}`] = { doctorName: r.doctorName ?? '', ext: r.ext ?? '', mobile: r.mobile ?? '', empNo: r.empNo ?? '', note: r.note ?? '' } })
      setGrid(g)
    } catch { show('讀取排程失敗', true) }
    finally { setLoading(false) }
  }, [deptCode, ym, y, m])
  useEffect(() => { loadRoster() }, [loadRoster])

  const setCell = (dateIso, slot, name) => setGrid(g => {
    const key = `${dateIso}|${slot}`; const cur = g[key] || {}; const next = { ...cur, doctorName: name }
    const dr = doctors.find(x => x.name === name); if (dr) { next.ext = dr.ext ?? ''; next.empNo = dr.employeeNo ?? '' }
    return { ...g, [key]: next }
  })

  const save = async () => {
    setSaving(true)
    try {
      const entries = []
      Object.entries(grid).forEach(([key, v]) => {
        if (!v.doctorName) return
        const [dt, slot] = key.split('|')
        entries.push({ onCallDate: dt, slot: slot || null, doctorName: v.doctorName, ext: v.ext || null, mobile: v.mobile || null, empNo: v.empNo || null, note: v.note || null, sortOrder: Math.max(0, slots.indexOf(slot)) + 1 })
      })
      await wardApi.saveOnCallMonth({ deptCode, year: y, month: m, entries }); show(`已存 ${ym}（${entries.length} 筆）`); loadRoster()
    } catch { show('存檔失敗', true) }
    finally { setSaving(false) }
  }

  const saveDept = async () => {
    try { await wardApi.updateOnCallDept(deptForm.id, deptForm); show('科別設定已存'); const ds = await wardApi.getOnCallDepts(true); setDepts(ds ?? []) }
    catch { show('科別設定存檔失敗', true) }
  }

  const cells = []
  for (let i = 0; i < lead; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div>
      <PmMsg msg={msg} />
      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>各科每日值班醫師（月曆）。選科別與月份 → 每日下拉填醫師（限該科），按「儲存本月」覆寫該科該月。多時段科別（如內科）每日可填多個時段。<b>顯示於白板之設定日後再接</b>。</div>
      <div style={s.formCard}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '4px' }}>
          <div style={{ ...s.formRow, marginBottom: 0 }}><label style={s.label}>科別</label>
            <select style={{ ...s.input, width: '200px' }} value={deptCode} onChange={e => setDeptCode(e.target.value)}>
              {depts.map(d => <option key={d.deptCode} value={d.deptCode}>{d.deptName}（{d.deptCode}）</option>)}
            </select>
          </div>
          <div style={{ ...s.formRow, marginBottom: 0 }}><label style={s.label}>月份</label><input type="month" style={{ ...s.input, width: '170px' }} value={ym} onChange={e => setYm(e.target.value || pmToday().slice(0, 7))} /></div>
          <button style={s.btnPrimary} onClick={save} disabled={saving || loading}>{saving ? '儲存中…' : '儲存本月'}</button>
          <button style={s.btnSecondary} onClick={() => setShowRules(v => !v)}>{showRules ? '收合科別設定' : '科別設定/備註'}</button>
        </div>
        {showRules && deptForm && (
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '10px', marginTop: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 12px' }}>
              <div style={s.formRow}><label style={s.label}>科別中文</label><input style={s.input} value={deptForm.deptName} onChange={e => setDeptForm(f => ({ ...f, deptName: e.target.value }))} /></div>
              <div style={s.formRow}><label style={s.label}>每日時段（逗號分隔，空=全日）</label><input style={s.input} value={deptForm.slots} onChange={e => setDeptForm(f => ({ ...f, slots: e.target.value }))} placeholder="值班,值日,上午,下午" /></div>
              <div style={s.formRow}><label style={s.label}>假日緊急聯絡</label><input style={s.input} value={deptForm.holidayContact} onChange={e => setDeptForm(f => ({ ...f, holidayContact: e.target.value }))} /></div>
              <div style={s.formRow}><label style={s.label}>預設分機</label><input style={s.input} value={deptForm.ext} onChange={e => setDeptForm(f => ({ ...f, ext: e.target.value }))} /></div>
              <div style={s.formRow}><label style={s.label}>預設手機/MVPN</label><input style={s.input} value={deptForm.mobile} onChange={e => setDeptForm(f => ({ ...f, mobile: e.target.value }))} /></div>
            </div>
            <div style={s.formRow}><label style={s.label}>呼出/會診規則</label><input style={s.input} value={deptForm.callOutRule} onChange={e => setDeptForm(f => ({ ...f, callOutRule: e.target.value }))} placeholder="平常日值班呼出至17:30；六日國定假不呼出…" /></div>
            <div style={s.formRow}><label style={s.label}>備註</label><input style={s.input} value={deptForm.remark} onChange={e => setDeptForm(f => ({ ...f, remark: e.target.value }))} placeholder="卓○德醫師出國 07/10~07/13…" /></div>
            <button style={s.btnPrimary} onClick={saveDept}>儲存科別設定</button>
          </div>
        )}
      </div>
      <div style={s.listCard}>
        <h4 style={s.formTitle}>{ym}　{dept?.deptName} 值班月曆{multiSlot ? `（時段：${slots.join('/')}）` : ''}</h4>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#6b7280', padding: '12px 0' }}>
            <span style={{ width: '20px', height: '20px', border: '3px solid #d6e0ea', borderTopColor: '#2D7A55', borderRadius: '50%', animation: 'board-spin 0.9s linear infinite' }} />載入中…
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px' }}>
            {['一', '二', '三', '四', '五', '六', '日'].map(w => <div key={w} style={{ textAlign: 'center', fontWeight: 700, fontSize: '13px', color: '#374151', padding: '4px 0' }}>{w}</div>)}
            {cells.map((d, i) => {
              if (d === null) return <div key={`b${i}`} />
              const dateIso = `${ym}-${String(d).padStart(2, '0')}`
              const wd = new Date(y, m - 1, d).getDay(); const weekend = wd === 0 || wd === 6
              return (
                <div key={dateIso} style={{ border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px', minHeight: '52px', background: weekend ? '#fafafa' : '#fff' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: weekend ? '#b91c1c' : '#374151', marginBottom: '3px' }}>{d}</div>
                  {slots.map(slot => (
                    <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: '3px', marginBottom: '2px' }}>
                      {multiSlot && <span style={{ fontSize: '10px', color: '#9ca3af', minWidth: '26px' }}>{slot}</span>}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <OnCallCellSelect options={docOptions} value={grid[`${dateIso}|${slot}`]?.doctorName ?? ''} onChange={name => setCell(dateIso, slot, name)} />
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── OR 手術派班（OrShiftStaff 班級人員 ＋ OrShiftRoom 房×班 刷手/流動）──────
const OR_SHIFT_TYPES = ['白班', '小夜', '大夜']
const OR_STAFF_ROLES = ['護理長', '麻醉', '體循']
const OR_ROOM_IDS = ['OR-01', 'OR-02', 'OR-03', 'OR-05', 'OR-06', 'OR-07', 'OR-08']
const SURGERY_SOURCE_OPTS = ['', '急診刀', '門診刀', '住院刀']
const emptyShiftStaffForm = { shiftType: '白班', role: '麻醉', name: '', roleTitle: '', ext: '', sortOrder: 0, isActive: true }
const emptyShiftRoomForm = { shiftType: '白班', roomId: 'OR-01', scrubNurse: '', circNurse: '', ext: '', sortOrder: 0, isActive: true }

// 班級人員 CRUD
function OrShiftStaffSection() {
  const { list, form, setField, editId, msg, handleSubmit, handleEdit, handleDelete, resetForm } = useCrudSection({
    emptyForm: emptyShiftStaffForm,
    fetchList: () => wardApi.getShiftStaff('OR', true),
    create: (payload) => wardApi.createShiftStaff(payload),
    update: (id, payload) => wardApi.updateShiftStaff(id, payload),
    remove: (id) => wardApi.removeShiftStaff(id),
    toPayload: (form) => ({ ...form, unitCode: 'OR' }),
    toForm: (i) => ({ shiftType: i.shiftType, role: i.role, name: i.name ?? '', roleTitle: i.roleTitle ?? '', ext: i.ext ?? '', sortOrder: i.sortOrder, isActive: i.isActive }),
  })
  const setF = setField
  return (
    <div>
      {msg.text && <div style={{ ...s.msg, background: msg.error ? '#fee2e2' : '#d1fae5', color: msg.error ? '#991b1b' : '#065f46' }}>{msg.text}</div>}
      <div style={s.formCard}>
        <h4 style={s.formTitle}>{editId ? `修改班級人員 (ID: ${editId})` : '新增班級人員'}</h4>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>角色：護理長＝值班護理長；麻醉＝麻醉科人員（可多筆）；體循＝體外循環技師。職稱供麻醉/體循顯示。</div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
            <div style={s.formRow}><label style={s.label}>班別 *</label><select style={s.input} value={form.shiftType} onChange={e => setF('shiftType', e.target.value)}>{OR_SHIFT_TYPES.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
            <div style={s.formRow}><label style={s.label}>角色 *</label><select style={s.input} value={form.role} onChange={e => setF('role', e.target.value)}>{OR_STAFF_ROLES.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
            <div style={s.formRow}><label style={s.label}>姓名</label><input style={s.input} value={form.name} onChange={e => setF('name', e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>職稱</label><input style={s.input} value={form.roleTitle} onChange={e => setF('roleTitle', e.target.value)} placeholder="主治麻醉科醫師" /></div>
            <div style={s.formRow}><label style={s.label}>分機</label><input style={s.input} value={form.ext} onChange={e => setF('ext', e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>排序</label><input type="number" style={s.input} value={form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer', marginTop: '4px' }}><input type="checkbox" checked={form.isActive} onChange={e => setF('isActive', e.target.checked)} />啟用</label>
          <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
            <button type="submit" style={s.btnPrimary}>{editId ? '儲存修改' : '+ 新增'}</button>
            {editId && <button type="button" style={s.btnSecondary} onClick={resetForm}>取消</button>}
          </div>
        </form>
      </div>
      <div style={s.listCard}>
        <h4 style={s.formTitle}>班級人員（共 {list.length} 筆）</h4>
        {list.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '14px' }}>尚無資料</p> : (
          <table style={s.table}>
            <thead><tr>{['班別', '角色', '姓名', '職稱', '分機', '排序', '啟用', '操作'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {list.map((i, n) => (
                <tr key={i.id} style={{ background: editId === i.id ? '#fef9c3' : n % 2 ? '#f9fafb' : '#fff' }}>
                  <td style={s.td}>{i.shiftType}</td><td style={s.td}>{i.role}</td><td style={s.td}>{i.name || '—'}</td><td style={s.td}>{i.roleTitle || '—'}</td><td style={s.td}>{i.ext || '—'}</td><td style={s.td}>{i.sortOrder}</td>
                  <td style={s.td}><span style={{ ...s.badge, background: i.isActive ? '#d1fae5' : '#f3f4f6', color: i.isActive ? '#065f46' : '#6b7280' }}>{i.isActive ? '✓' : '停'}</span></td>
                  <td style={s.td}><button style={s.btnEdit} onClick={() => handleEdit(i)}>編輯</button><button style={s.btnDel} onClick={() => handleDelete(i.id)}>刪除</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// 房×班 刷手/流動 CRUD
function OrShiftRoomSection() {
  const { list, form, setField, editId, msg, handleSubmit, handleEdit, handleDelete, resetForm } = useCrudSection({
    emptyForm: emptyShiftRoomForm,
    fetchList: () => wardApi.getShiftRoom('OR', true),
    create: (payload) => wardApi.createShiftRoom(payload),
    update: (id, payload) => wardApi.updateShiftRoom(id, payload),
    remove: (id) => wardApi.removeShiftRoom(id),
    toPayload: (form) => ({ ...form, unitCode: 'OR' }),
    toForm: (i) => ({ shiftType: i.shiftType, roomId: i.roomId, scrubNurse: i.scrubNurse ?? '', circNurse: i.circNurse ?? '', ext: i.ext ?? '', sortOrder: i.sortOrder, isActive: i.isActive }),
    failMsg: '操作失敗（班別＋刀房是否重複？）',
  })
  const setF = setField
  return (
    <div>
      {msg.text && <div style={{ ...s.msg, background: msg.error ? '#fee2e2' : '#d1fae5', color: msg.error ? '#991b1b' : '#065f46' }}>{msg.text}</div>}
      <div style={s.formCard}>
        <h4 style={s.formTitle}>{editId ? `修改刀房派班 (ID: ${editId})` : '新增刀房派班'}</h4>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
            <div style={s.formRow}><label style={s.label}>班別 *</label><select style={s.input} value={form.shiftType} onChange={e => setF('shiftType', e.target.value)}>{OR_SHIFT_TYPES.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
            <div style={s.formRow}><label style={s.label}>刀房 *</label><select style={s.input} value={form.roomId} onChange={e => setF('roomId', e.target.value)}>{OR_ROOM_IDS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
            <div style={s.formRow}><label style={s.label}>分機</label><input style={s.input} value={form.ext} onChange={e => setF('ext', e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>刷手護理師</label><input style={s.input} value={form.scrubNurse} onChange={e => setF('scrubNurse', e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>流動護理師</label><input style={s.input} value={form.circNurse} onChange={e => setF('circNurse', e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>排序</label><input type="number" style={s.input} value={form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer', marginTop: '4px' }}><input type="checkbox" checked={form.isActive} onChange={e => setF('isActive', e.target.checked)} />啟用</label>
          <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
            <button type="submit" style={s.btnPrimary}>{editId ? '儲存修改' : '+ 新增'}</button>
            {editId && <button type="button" style={s.btnSecondary} onClick={resetForm}>取消</button>}
          </div>
        </form>
      </div>
      <div style={s.listCard}>
        <h4 style={s.formTitle}>刀房派班（共 {list.length} 筆）</h4>
        {list.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '14px' }}>尚無資料</p> : (
          <table style={s.table}>
            <thead><tr>{['班別', '刀房', '刷手', '流動', '分機', '啟用', '操作'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {list.map((i, n) => (
                <tr key={i.id} style={{ background: editId === i.id ? '#fef9c3' : n % 2 ? '#f9fafb' : '#fff' }}>
                  <td style={s.td}>{i.shiftType}</td><td style={s.td}>{i.roomId}</td><td style={s.td}>{i.scrubNurse || '—'}</td><td style={s.td}>{i.circNurse || '—'}</td><td style={s.td}>{i.ext || '—'}</td>
                  <td style={s.td}><span style={{ ...s.badge, background: i.isActive ? '#d1fae5' : '#f3f4f6', color: i.isActive ? '#065f46' : '#6b7280' }}>{i.isActive ? '✓' : '停'}</span></td>
                  <td style={s.td}><button style={s.btnEdit} onClick={() => handleEdit(i)}>編輯</button><button style={s.btnDel} onClick={() => handleDelete(i.id)}>刪除</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// 刷手/流動設定：逐台刀（月曆式）。選月份 → 逐台刀填 刷手/流動/備註 → 存檔（餵 OR 看板刀房卡）
function OrScrubCircSection() {
  const nurses = useUnitNurses('OR')
  const nurseOpts = [...new Map(nurses.map(n => [n.name, { value: n.name, label: n.name }])).values()]
  const base = new Date()
  const dayISO = (off) => { const d = new Date(); d.setDate(d.getDate() + off); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
  const ymOf = (off) => { const d = new Date(base.getFullYear(), base.getMonth() + off, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
  const monthRange = (ym) => { const [yy, mm] = ym.split('-').map(Number); return { from: `${ym}-01`, to: `${ym}-${String(new Date(yy, mm, 0).getDate()).padStart(2, '0')}` } }
  const tabs = [
    { key: 'd-1', label: '昨日', from: dayISO(-1), to: dayISO(-1) },
    { key: 'd0', label: '今日', from: dayISO(0), to: dayISO(0) },
    { key: 'd1', label: '明日', from: dayISO(1), to: dayISO(1) },
    ...[0, 1, 2].map(off => { const ym = ymOf(off); const r = monthRange(ym); return { key: 'm' + off, label: off === 0 ? '本月' : off === 1 ? '下月' : '下下月', ym, month: true, from: r.from, to: r.to } }),
  ]
  const [tabKey, setTabKey] = useState('d0')   // 預設今日
  const tab = tabs.find(t => t.key === tabKey) || tabs[1]
  const from = tab.from, to = tab.to
  const [rows, setRows] = useState([])
  const [grid, setGrid] = useState({})          // key -> {scrub,circ,note}
  const [initial, setInitial] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, show] = pmMsgHook()

  const keyOf = r => `${String(r.opDate).slice(0, 10)}|${r.roomId ?? ''}|${r.chartNo ?? ''}|${r.opTime ?? ''}`
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await wardApi.getOrSurgeryList(from, to)
      const rs = res?.rows ?? []
      setRows(rs)
      const g = {}; rs.forEach(r => { g[keyOf(r)] = { scrub: r.scrubNurse ?? '', circ: r.circNurse ?? '', anes: r.anesNurse ?? '', note: r.note ?? '' } })
      setGrid(g); setInitial(JSON.parse(JSON.stringify(g)))
    } catch { show('讀取失敗', true) }
    finally { setLoading(false) }
  }, [from, to])
  useEffect(() => { load() }, [load])

  const setCell = (key, field, val) => setGrid(g => ({ ...g, [key]: { ...(g[key] || { scrub: '', circ: '', anes: '', note: '' }), [field]: val } }))

  const save = async () => {
    setSaving(true)
    try {
      const entries = []
      rows.forEach(r => {
        const key = keyOf(r); const cur = grid[key] || { scrub: '', circ: '', anes: '', note: '' }; const ini = initial[key] || { scrub: '', circ: '', anes: '', note: '' }
        if (cur.scrub !== ini.scrub || cur.circ !== ini.circ || cur.anes !== ini.anes || cur.note !== ini.note)
          entries.push({ opDate: String(r.opDate).slice(0, 10), roomId: r.roomId ?? '', chartNo: r.chartNo ?? '', opTime: r.opTime ?? '', scrubNurse: cur.scrub, circNurse: cur.circ, anesNurse: cur.anes, note: cur.note })
      })
      if (!entries.length) { show('沒有變更'); setSaving(false); return }
      await wardApi.saveOrSurgeryNurseBatch(entries); show(`已存 ${entries.length} 台刀`); await load()
    } catch { show('存檔失敗', true) }
    finally { setSaving(false) }
  }

  const WD = ['日', '一', '二', '三', '四', '五', '六']
  const byDate = {}; rows.forEach(r => { const d = String(r.opDate).slice(0, 10); (byDate[d] = byDate[d] || []).push(r) })
  const dates = Object.keys(byDate).sort()

  return (
    <div>
      <PmMsg msg={msg} />
      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>逐台刀設定<b>刷手/流動/備註</b>（同刀房同日多台刀可各自不同）。選月份 → 逐台刀填寫 → 「儲存本月」。顯示於 OR 病室動態刀房卡彈窗。手術清單來自排程（WhiteboardSync）。</div>
      <div style={s.formCard}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ ...s.unitTabs, marginBottom: 0, flexWrap: 'wrap' }}>
            {tabs.map(t => (
              <button key={t.key} style={{ ...s.unitTab, ...(tabKey === t.key ? s.unitTabActive : {}) }} onClick={() => setTabKey(t.key)}>
                {t.month ? `${t.label}（${t.ym.replace('-', '/')}）` : t.label}
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <button style={s.btnPrimary} onClick={save} disabled={saving || loading}>{saving ? '儲存中…' : '儲存'}</button>
        </div>
      </div>
      <div style={s.listCard}>
        <h4 style={s.formTitle}>{tab.month ? tab.ym.replace('-', '/') : `${tab.label}（${from.slice(5).replace('-', '/')}）`} 刀房手術（{rows.length} 台）</h4>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#6b7280', padding: '12px 0' }}>
            <span style={{ width: '20px', height: '20px', border: '3px solid #d6e0ea', borderTopColor: '#2D7A55', borderRadius: '50%', animation: 'board-spin 0.9s linear infinite' }} />載入中…
          </div>
        ) : rows.length === 0 ? <div style={{ color: '#9ca3af', fontSize: '14px' }}>本月無手術資料</div> : (
          <table style={s.table}>
            <thead><tr>{['時間', '刀房', '病人', '主刀', '術式', '刷手', '流動', '麻醉', '備註'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {dates.map(d => {
                const [yy, mm, dd] = d.split('-').map(Number)
                const wd = WD[new Date(yy, mm - 1, dd).getDay()]
                return (
                  <Fragment key={d}>
                    <tr><td colSpan="9" style={{ ...s.td, background: '#eef2f7', fontWeight: 700, color: '#374151' }}>{mm}/{dd}（{wd}）　{byDate[d].length} 台</td></tr>
                    {byDate[d].map((r, i) => {
                      const key = keyOf(r); const c = grid[key] || { scrub: '', circ: '', anes: '', note: '' }
                      return (
                        <tr key={key + '#' + i} style={{ background: i % 2 ? '#f9fafb' : '#fff' }}>
                          <td style={s.td}>{r.opTime}</td>
                          <td style={s.td}>{r.roomId}</td>
                          <td style={s.td}>{r.patientName}</td>
                          <td style={s.td}>{r.surgeonName}</td>
                          <td style={{ ...s.td, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.surgeryName}>{r.surgeryName}</td>
                          <td style={{ ...s.td, minWidth: '120px' }}><NurseSelect options={nurseOpts} value={c.scrub} allowFree onChange={v => setCell(key, 'scrub', v)} placeholder="刷手" /></td>
                          <td style={{ ...s.td, minWidth: '120px' }}><NurseSelect options={nurseOpts} value={c.circ} allowFree onChange={v => setCell(key, 'circ', v)} placeholder="流動" /></td>
                          <td style={{ ...s.td, minWidth: '120px' }}><NurseSelect options={nurseOpts} value={c.anes} allowFree onChange={v => setCell(key, 'anes', v)} placeholder="麻醉" /></td>
                          <td style={{ ...s.td, minWidth: '130px' }}><input style={s.input} value={c.note} onChange={e => setCell(key, 'note', e.target.value)} placeholder="備註" /></td>
                        </tr>
                      )
                    })}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function OrScheduleManager() {
  return (
    <div>
      <div style={s.sectionSub}>OR 手術派班 — 班級人員（護理長/麻醉/體循）</div>
      <OrShiftStaffSection />
      <div style={{ ...s.sectionSub, marginTop: '24px' }}>OR 手術派班 — 刀房派班（刷手/流動）</div>
      <OrShiftRoomSection />
    </div>
  )
}

// ── OR 特殊交班（OrHandover）─────────────────────────────────────
const emptyHandoverForm = { hhisnum: '', roomId: 'OR-01', patientName: '', gender: 'M', age: '', surgeryName: '', surgerySource: '門診刀', surgeonName: '', destWard: '', destBed: '', endTime: '', bloodLoss: '', bloodTransfusion: '', drainDetails: '', specialNotes: '', sortOrder: 0, isActive: true }

function OrHandoverSection() {
  const { list, form, setField, editId, msg, handleSubmit, handleEdit, handleDelete, resetForm } = useCrudSection({
    emptyForm: emptyHandoverForm,
    fetchList: () => wardApi.getHandoverList('OR', true),
    create: (payload) => wardApi.createHandover(payload),
    update: (id, payload) => wardApi.updateHandover(id, payload),
    remove: (id) => wardApi.removeHandover(id),
    toPayload: (form) => ({
      ...form, unitCode: 'OR',
      age: form.age === '' ? null : Number(form.age),
      bloodLoss: form.bloodLoss === '' ? null : Number(form.bloodLoss),
      bloodTransfusion: form.bloodTransfusion === '' ? null : Number(form.bloodTransfusion),
    }),
    toForm: (i) => ({
      hhisnum: i.hhisnum ?? '', roomId: i.roomId ?? 'OR-01', patientName: i.patientName ?? '', gender: i.gender ?? 'M',
      age: i.age ?? '', surgeryName: i.surgeryName ?? '', surgerySource: i.surgerySource ?? '門診刀', surgeonName: i.surgeonName ?? '',
      destWard: i.destWard ?? '', destBed: i.destBed ?? '', endTime: i.endTime ?? '', bloodLoss: i.bloodLoss ?? '',
      bloodTransfusion: i.bloodTransfusion ?? '', drainDetails: i.drainDetails ?? '', specialNotes: i.specialNotes ?? '',
      sortOrder: i.sortOrder, isActive: i.isActive,
    }),
  })
  const setF = setField
  return (
    <div>
      {msg.text && <div style={{ ...s.msg, background: msg.error ? '#fee2e2' : '#d1fae5', color: msg.error ? '#991b1b' : '#065f46' }}>{msg.text}</div>}
      <div style={s.formCard}>
        <h4 style={s.formTitle}>{editId ? `修改特殊交班 (ID: ${editId})` : '新增特殊交班'}</h4>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>術後轉病房特殊交班；內容為流動護理師護理紀錄（手填）。</div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
            <div style={s.formRow}><label style={s.label}>刀房</label><select style={s.input} value={form.roomId} onChange={e => setF('roomId', e.target.value)}>{OR_ROOM_IDS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
            <div style={s.formRow}><label style={s.label}>來源</label><select style={s.input} value={form.surgerySource} onChange={e => setF('surgerySource', e.target.value)}>{SURGERY_SOURCE_OPTS.map(o => <option key={o} value={o}>{o || '（無）'}</option>)}</select></div>
            <div style={s.formRow}><label style={s.label}>病歷號</label><input style={s.input} value={form.hhisnum} onChange={e => setF('hhisnum', e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>姓名</label><input style={s.input} value={form.patientName} onChange={e => setF('patientName', e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>性別</label><select style={s.input} value={form.gender} onChange={e => setF('gender', e.target.value)}><option value="M">男</option><option value="F">女</option></select></div>
            <div style={s.formRow}><label style={s.label}>年齡</label><input type="number" style={s.input} value={form.age} onChange={e => setF('age', e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>主刀醫師</label><input style={s.input} value={form.surgeonName} onChange={e => setF('surgeonName', e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>結束時間</label><input style={s.input} value={form.endTime} onChange={e => setF('endTime', e.target.value)} placeholder="10:18" /></div>
            <div style={s.formRow}><label style={s.label}>轉往病房</label><input style={s.input} value={form.destWard} onChange={e => setF('destWard', e.target.value)} placeholder="骨科病房（W52）" /></div>
            <div style={s.formRow}><label style={s.label}>轉往床號</label><input style={s.input} value={form.destBed} onChange={e => setF('destBed', e.target.value)} placeholder="W52-014" /></div>
            <div style={s.formRow}><label style={s.label}>出血(mL)</label><input type="number" style={s.input} value={form.bloodLoss} onChange={e => setF('bloodLoss', e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>輸血(單位)</label><input type="number" style={s.input} value={form.bloodTransfusion} onChange={e => setF('bloodTransfusion', e.target.value)} /></div>
          </div>
          <div style={s.formRow}><label style={s.label}>術式</label><input style={s.input} value={form.surgeryName} onChange={e => setF('surgeryName', e.target.value)} /></div>
          <div style={s.formRow}><label style={s.label}>引流管</label><input style={s.input} value={form.drainDetails} onChange={e => setF('drainDetails', e.target.value)} /></div>
          <div style={s.formRow}><label style={s.label}>特殊事項</label><textarea style={{ ...s.input, height: '60px', resize: 'vertical' }} value={form.specialNotes} onChange={e => setF('specialNotes', e.target.value)} /></div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}><input type="checkbox" checked={form.isActive} onChange={e => setF('isActive', e.target.checked)} />啟用</label>
          <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
            <button type="submit" style={s.btnPrimary}>{editId ? '儲存修改' : '+ 新增'}</button>
            {editId && <button type="button" style={s.btnSecondary} onClick={resetForm}>取消</button>}
          </div>
        </form>
      </div>
      <div style={s.listCard}>
        <h4 style={s.formTitle}>特殊交班（共 {list.length} 筆）</h4>
        {list.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '14px' }}>尚無資料</p> : (
          <table style={s.table}>
            <thead><tr>{['刀房', '病患', '術式', '主刀', '轉往', '出血/輸血', '啟用', '操作'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {list.map((i, n) => (
                <tr key={i.id} style={{ background: editId === i.id ? '#fef9c3' : n % 2 ? '#f9fafb' : '#fff' }}>
                  <td style={s.td}>{i.roomId}</td>
                  <td style={s.td}>{i.patientName || '—'}<div style={{ fontSize: '12px', color: '#9ca3af' }}>{i.gender}/{i.age}</div></td>
                  <td style={{ ...s.td, maxWidth: '180px', fontSize: '12px' }}>{i.surgeryName || '—'}</td>
                  <td style={s.td}>{i.surgeonName || '—'}</td>
                  <td style={{ ...s.td, fontSize: '12px' }}>{i.destWard || '—'} {i.destBed || ''}</td>
                  <td style={s.td}>{i.bloodLoss != null ? `${i.bloodLoss}mL` : '—'} / {i.bloodTransfusion != null ? `${i.bloodTransfusion}u` : '0'}</td>
                  <td style={s.td}><span style={{ ...s.badge, background: i.isActive ? '#d1fae5' : '#f3f4f6', color: i.isActive ? '#065f46' : '#6b7280' }}>{i.isActive ? '✓' : '停'}</span></td>
                  <td style={s.td}><button style={s.btnEdit} onClick={() => handleEdit(i)}>編輯</button><button style={s.btnDel} onClick={() => handleDelete(i.id)}>刪除</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function OrHandoverManager() {
  return (
    <div>
      <div style={s.sectionSub}>OR 術後特殊交班（HandoverTab）</div>
      <OrHandoverSection />
    </div>
  )
}

// ── 各站頁首單位資訊（主任/護理）──────────────────────────────────
const emptyUnitInfoForm = { hospitalName: '', wardName: '', directorLabel: '', directorName: '', headNurseLabel: '', headNurseName: '', totalBeds: '' }

function UnitInfoSection({ unitCode }) {
  const [form, setForm] = useState(emptyUnitInfoForm)
  const [msg, setMsg]   = useState({ text: '', error: false })
  const showMsg = (text, error = false) => { setMsg({ text, error }); setTimeout(() => setMsg({ text: '', error: false }), 3000) }
  const load = useCallback(async () => {
    try {
      const d = await wardApi.getUnitInfo(unitCode)
      if (d) setForm({ hospitalName: d.hospitalName ?? '', wardName: d.wardName ?? '', directorLabel: d.directorLabel ?? '', directorName: d.directorName ?? '', headNurseLabel: d.headNurseLabel ?? '', headNurseName: d.headNurseName ?? '', totalBeds: d.totalBeds ?? '' })
    } catch { showMsg('讀取失敗', true) }
  }, [unitCode])
  useEffect(() => { load() }, [load])
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...form, unitCode, totalBeds: form.totalBeds === '' ? null : Number(form.totalBeds) }
    try { await wardApi.saveUnitInfo(payload); showMsg('儲存成功') }
    catch { showMsg('儲存失敗', true) }
  }
  return (
    <div>
      {msg.text && <div style={{ ...s.msg, background: msg.error ? '#fee2e2' : '#d1fae5', color: msg.error ? '#991b1b' : '#065f46' }}>{msg.text}</div>}
      <div style={s.formCard}>
        <h4 style={s.formTitle}>頁首單位資訊（{UNIT_LABELS[unitCode] || unitCode}）</h4>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>白板頂部顯示的「主任／護理」兩個欄位；職稱與姓名皆可編輯（如 病房主任／單位護理長、急診主任／護理長）。</div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div style={s.formRow}><label style={s.label}>主任職稱</label><input style={s.input} value={form.directorLabel} onChange={e => setF('directorLabel', e.target.value)} placeholder="病房主任" /></div>
            <div style={s.formRow}><label style={s.label}>主任姓名</label><input style={s.input} value={form.directorName} onChange={e => setF('directorName', e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>護理職稱</label><input style={s.input} value={form.headNurseLabel} onChange={e => setF('headNurseLabel', e.target.value)} placeholder="單位護理長" /></div>
            <div style={s.formRow}><label style={s.label}>護理姓名</label><input style={s.input} value={form.headNurseName} onChange={e => setF('headNurseName', e.target.value)} /></div>
            {unitCode === 'ER' && (
              <div style={s.formRow}><label style={s.label}>總病床數</label><input type="number" style={s.input} value={form.totalBeds} onChange={e => setF('totalBeds', e.target.value)} placeholder="留空＝預設 19" /></div>
            )}
          </div>
          {/* 醫院/站別名稱為固定值，不開放後台編輯（仍隨表單原值回存、不清空）*/}
          <div style={{ marginTop: '14px' }}><button type="submit" style={s.btnPrimary}>儲存</button></div>
        </form>
      </div>
    </div>
  )
}

// ── 檢查/會診（WardExamConsult；W52/ICU/ER 自建）──────────────────
const EXAM_STATUS_OPTS = ['待執行', '執行中', '已完成', '預約', '取消']
const CONSULT_STATUS_OPTS = ['待回覆', '已回覆', '進行中', '待安排', '取消']
const emptyExamConsultForm = { kind: '檢查', hhisnum: '', bedId: '', patientName: '', gender: 'M', itemName: '', doctor: '', scheduledDate: '', timeSlot: '', completedTime: '', status: '待執行', notes: '', sortOrder: 0, isActive: true }

function ExamConsultSection({ unitCode }) {
  const { list, form, setField, editId, msg, handleSubmit, handleEdit, handleDelete, resetForm } = useCrudSection({
    emptyForm: emptyExamConsultForm,
    fetchList: () => wardApi.getExamConsultList(unitCode, true),
    create: (payload) => wardApi.createExamConsult(payload),
    update: (id, payload) => wardApi.updateExamConsult(id, payload),
    remove: (id) => wardApi.removeExamConsult(id),
    toPayload: (form) => ({ ...form, unitCode }),
    toForm: (i) => ({ kind: i.kind, hhisnum: i.hhisnum ?? '', bedId: i.bedId ?? '', patientName: i.patientName ?? '', gender: i.gender ?? 'M', itemName: i.itemName ?? '', doctor: i.doctor ?? '', scheduledDate: i.scheduledDate ?? '', timeSlot: i.timeSlot ?? '', completedTime: i.completedTime ?? '', status: i.status ?? '', notes: i.notes ?? '', sortOrder: i.sortOrder, isActive: i.isActive }),
  })
  const setF = setField
  const isExam = form.kind === '檢查'
  return (
    <div>
      {msg.text && <div style={{ ...s.msg, background: msg.error ? '#fee2e2' : '#d1fae5', color: msg.error ? '#991b1b' : '#065f46' }}>{msg.text}</div>}
      <div style={s.formCard}>
        <h4 style={s.formTitle}>{editId ? `修改檢查/會診 (ID: ${editId})` : '新增檢查/會診'}</h4>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>自建（院方 OR.ORDER/RESULT 未開放前）。檢查＝項目/預定日期/時段；會診＝科別/醫師/完成時間。</div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
            <div style={s.formRow}><label style={s.label}>類型 *</label><select style={s.input} value={form.kind} onChange={e => setF('kind', e.target.value)}><option value="檢查">檢查</option><option value="會診">會診</option></select></div>
            <div style={s.formRow}><label style={s.label}>床號</label><input style={s.input} value={form.bedId} onChange={e => setF('bedId', e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>病歷號</label><input style={s.input} value={form.hhisnum} onChange={e => setF('hhisnum', e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>姓名</label><input style={s.input} value={form.patientName} onChange={e => setF('patientName', e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>性別</label><select style={s.input} value={form.gender} onChange={e => setF('gender', e.target.value)}><option value="M">男</option><option value="F">女</option></select></div>
            <div style={s.formRow}><label style={s.label}>{isExam ? '檢查項目' : '會診科別'}</label><input style={s.input} value={form.itemName} onChange={e => setF('itemName', e.target.value)} /></div>
            {isExam ? <>
              <div style={s.formRow}><label style={s.label}>預定日期</label><input style={s.input} value={form.scheduledDate} onChange={e => setF('scheduledDate', e.target.value)} placeholder="2026-06-24" /></div>
              <div style={s.formRow}><label style={s.label}>時段</label><input style={s.input} value={form.timeSlot} onChange={e => setF('timeSlot', e.target.value)} placeholder="上午 09:00" /></div>
            </> : <>
              <div style={s.formRow}><label style={s.label}>會診醫師</label><input style={s.input} value={form.doctor} onChange={e => setF('doctor', e.target.value)} /></div>
              <div style={s.formRow}><label style={s.label}>完成時間</label><input style={s.input} value={form.completedTime} onChange={e => setF('completedTime', e.target.value)} placeholder="2026-06-24 10:00" /></div>
            </>}
            <div style={s.formRow}><label style={s.label}>狀態</label><select style={s.input} value={form.status} onChange={e => setF('status', e.target.value)}>{(isExam ? EXAM_STATUS_OPTS : CONSULT_STATUS_OPTS).map(o => <option key={o} value={o}>{o}</option>)}</select></div>
            <div style={s.formRow}><label style={s.label}>排序</label><input type="number" style={s.input} value={form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></div>
          </div>
          <div style={s.formRow}><label style={s.label}>備註</label><input style={s.input} value={form.notes} onChange={e => setF('notes', e.target.value)} /></div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}><input type="checkbox" checked={form.isActive} onChange={e => setF('isActive', e.target.checked)} />啟用</label>
          <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
            <button type="submit" style={s.btnPrimary}>{editId ? '儲存修改' : '+ 新增'}</button>
            {editId && <button type="button" style={s.btnSecondary} onClick={resetForm}>取消</button>}
          </div>
        </form>
      </div>
      <div style={s.listCard}>
        <h4 style={s.formTitle}>檢查/會診（共 {list.length} 筆）</h4>
        {list.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '14px' }}>尚無資料</p> : (
          <table style={s.table}>
            <thead><tr>{['類型', '床號', '姓名', '項目/科別', '醫師', '狀態', '啟用', '操作'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {list.map((i, n) => (
                <tr key={i.id} style={{ background: editId === i.id ? '#fef9c3' : n % 2 ? '#f9fafb' : '#fff' }}>
                  <td style={s.td}>{i.kind}</td><td style={s.td}>{i.bedId || '—'}</td><td style={s.td}>{i.patientName || '—'}</td>
                  <td style={s.td}>{i.itemName || '—'}</td><td style={s.td}>{i.doctor || '—'}</td><td style={s.td}>{i.status || '—'}</td>
                  <td style={s.td}><span style={{ ...s.badge, background: i.isActive ? '#d1fae5' : '#f3f4f6', color: i.isActive ? '#065f46' : '#6b7280' }}>{i.isActive ? '✓' : '停'}</span></td>
                  <td style={s.td}><button style={s.btnEdit} onClick={() => handleEdit(i)}>編輯</button><button style={s.btnDel} onClick={() => handleDelete(i.id)}>刪除</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}


// ── ICU 抗生素（自建；roster 模式：先載入當前在床病人，再逐一設定用藥）──────────
const emptyAbxForm = { drugName: '', startDateTime: '', firstDoseDateTime: '', endDateTime: '', sortOrder: 0 }

function AntibioticSection() {
  const [roster, setRoster] = useState([])      // 當前 ICU 在床病人（院方 API）
  const [rows, setRows]     = useState([])      // 所有抗生素列（含停用）
  const [loading, setLoading] = useState(false)
  const [selPat, setSelPat] = useState(null)    // 開啟設定彈窗的病人
  const [form, setForm]     = useState(emptyAbxForm)
  const [editId, setEditId] = useState(null)    // 正在編輯的抗生素列 id（null=新增）
  const [msg, setMsg]       = useState({ text: '', error: false })
  const showMsg = (text, error = false) => { setMsg({ text, error }); setTimeout(() => setMsg({ text: '', error: false }), 3000) }
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [abx, rosterList] = await Promise.all([
        wardApi.getAntibiotic('ICU', true),
        wardApi.getRoster('ICU').catch(() => []),
      ])
      setRows(abx ?? [])
      setRoster(rosterList ?? [])
    } catch { showMsg('讀取失敗', true) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  // 儲存/刪除後只刷新抗生素列（不重新向院方取在床資料、不顯示 loading）
  const reloadAbx = async () => { try { setRows((await wardApi.getAntibiotic('ICU', true)) ?? []) } catch { /* 靜默 */ } }

  // 以病歷號索引抗生素
  const byHis = {}
  rows.forEach(a => { const k = (a.hhisnum || '').trim(); if (k) (byHis[k] = byHis[k] || []).push(a) })
  const patAbx = selPat ? (byHis[(selPat.hhisnum || '').trim()] || []) : []

  const openPatient = p => { setSelPat(p); setForm(emptyAbxForm); setEditId(null) }
  const closeModal  = () => { setSelPat(null); setForm(emptyAbxForm); setEditId(null) }
  const editRow = a => { setEditId(a.id); setForm({ drugName: a.drugName ?? '', startDateTime: a.startDateTime ?? '', firstDoseDateTime: a.firstDoseDateTime ?? '', endDateTime: a.endDateTime ?? '', sortOrder: a.sortOrder ?? 0 }) }

  const submit = async e => {
    e.preventDefault()
    if (!selPat) return
    const payload = { ...form, unitCode: 'ICU', hhisnum: selPat.hhisnum, isActive: true }
    try {
      if (editId) { await wardApi.updateAntibiotic(editId, payload); showMsg('修改成功') }
      else        { await wardApi.createAntibiotic(payload); showMsg('新增成功') }
      setForm(emptyAbxForm); setEditId(null); reloadAbx()
    } catch { showMsg('操作失敗', true) }
  }
  const delRow = async id => {
    if (!window.confirm('確定刪除此抗生素？')) return
    try { await wardApi.removeAntibiotic(id); showMsg('刪除成功'); if (editId === id) { setForm(emptyAbxForm); setEditId(null) } reloadAbx() }
    catch { showMsg('刪除失敗', true) }
  }

  return (
    <div>
      {msg.text && <div style={{ ...s.msg, background: msg.error ? '#fee2e2' : '#d1fae5', color: msg.error ? '#991b1b' : '#065f46' }}>{msg.text}</div>}

      {/* 設定彈窗：選了病人才開 */}
      {selPat && (
        <div style={extEditOverlay} onClick={closeModal}>
          <div style={extEditModal} onClick={e => e.stopPropagation()}>
            <h4 style={s.formTitle}>抗生素：{selPat.patientName}（{selPat.bedId}）</h4>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>病歷號 {selPat.hhisnum}　·　自建（院方 UD.UDORDER 未開放前）；時間格式 2026-06-24 08:00，結束時間可留空表進行中。</div>

            {/* 該病人現有抗生素 */}
            {patAbx.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '14px' }}>此病人尚無抗生素紀錄</p> : (
              <table style={s.table}>
                <thead><tr>{['藥品名稱', '開始時間', '首次給藥', '結束時間', '操作'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {patAbx.map((a, n) => (
                    <tr key={a.id} style={{ background: editId === a.id ? '#fef9c3' : n % 2 ? '#f9fafb' : '#fff' }}>
                      <td style={s.td}>{a.drugName || '—'}</td>
                      <td style={s.td}>{a.startDateTime || '—'}</td>
                      <td style={s.td}>{a.firstDoseDateTime || '—'}</td>
                      <td style={s.td}>{a.endDateTime || '—'}</td>
                      <td style={s.td}><button style={s.btnEdit} onClick={() => editRow(a)}>編輯</button><button style={s.btnDel} onClick={() => delRow(a.id)}>刪除</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 新增/修改一筆抗生素 */}
            <form onSubmit={submit} style={{ marginTop: '14px', borderTop: '1px solid #e5e7eb', paddingTop: '14px' }}>
              <h4 style={s.formTitle}>{editId ? `修改抗生素 (ID: ${editId})` : '新增抗生素'}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
                <div style={s.formRow}><label style={s.label}>藥品名稱 *</label><input style={s.input} value={form.drugName} required onChange={e => setF('drugName', e.target.value)} placeholder="Vancomycin" /></div>
                <div style={s.formRow}><label style={s.label}>排序</label><input type="number" style={s.input} value={form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></div>
                <div style={s.formRow} />
                <div style={s.formRow}><label style={s.label}>開始時間</label><input style={s.input} value={form.startDateTime} onChange={e => setF('startDateTime', e.target.value)} placeholder="2026-06-24 08:00" /></div>
                <div style={s.formRow}><label style={s.label}>首次給藥時間</label><input style={s.input} value={form.firstDoseDateTime} onChange={e => setF('firstDoseDateTime', e.target.value)} placeholder="2026-06-24 08:30" /></div>
                <div style={s.formRow}><label style={s.label}>結束時間</label><input style={s.input} value={form.endDateTime} onChange={e => setF('endDateTime', e.target.value)} placeholder="（進行中可留空）" /></div>
              </div>
              <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                <button type="submit" style={s.btnPrimary}>{editId ? '儲存修改' : '+ 新增抗生素'}</button>
                {editId && <button type="button" style={s.btnSecondary} onClick={() => { setForm(emptyAbxForm); setEditId(null) }}>取消編輯</button>}
                <button type="button" style={{ ...s.btnSecondary, marginLeft: 'auto' }} onClick={closeModal}>關閉</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 在床病人清單（roster） */}
      <div style={s.listCard}>
        <h4 style={s.formTitle}>ICU 在床病人（點「設定」管理該病人抗生素）</h4>
        {loading ? <p style={{ color: '#9ca3af', fontSize: '14px' }}>讀取中…（正在向院方系統取得在床資料）</p>
          : roster.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '14px' }}>目前無在床病人</p> : (
          <table style={s.table}>
            <thead><tr>{['床號', '姓名', '病歷號', '性別/年齡', '診斷', '抗生素', '操作'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {roster.map((p, i) => {
                const n = (byHis[(p.hhisnum || '').trim()] || []).length
                return (
                  <tr key={p.hhisnum} style={{ background: selPat?.hhisnum === p.hhisnum ? '#fef9c3' : i % 2 ? '#f9fafb' : '#fff' }}>
                    <td style={s.td}><span style={{ ...s.badge, background: '#dbeafe', color: '#1e40af' }}>{p.bedId}</span></td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{p.patientName || '—'}</td>
                    <td style={s.td}>{p.hhisnum}</td>
                    <td style={s.td}>{p.gender || '—'}/{p.age ?? '—'}</td>
                    <td style={{ ...s.td, maxWidth: '260px' }}>{p.diagnosis || '—'}</td>
                    <td style={s.td}>{n > 0 ? <span style={{ ...s.badge, background: '#fee2e2', color: '#991b1b' }}>{n} 筆</span> : <span style={{ color: '#9ca3af' }}>—</span>}</td>
                    <td style={s.td}><button style={s.btnEdit} onClick={() => openPatient(p)}>設定</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}


// ══════════════ 人員管理（跨單位）══════════════
const PM_UNITS = ['W52', 'ICU', 'OR', 'ER']
const PM_ROLES = ['護理長', '護理師', '專科護理師', '主治醫師', '住院醫師', '照服員', '醫事人員', '主任']
const PM_GROUPS = [
  { k: 'leader', n: '病房主管' }, { k: 'attending', n: '主治醫師' }, { k: 'resident', n: '住院醫師' },
  { k: 'specialist', n: '專科護理師' }, { k: 'nurse', n: '護理師' }, { k: 'allied', n: '醫事人員' },
]
const PM_SHIFTS = ['白班', '小夜', '大夜']
const PM_ASSIGN = ['主護', '主治', '專師']
const pmToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const pmDateOffset = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const pmMD = iso => `${iso.slice(5, 7)}/${iso.slice(8, 10)}`   // yyyy-MM-dd → MM/DD
const pmDate = v => (v ? String(v).slice(0, 10) : '')

// 共用：載入人員清單（供下拉）
function usePmStaff() {
  const [staff, setStaff] = useState([])
  useEffect(() => { wardApi.getStaff(false).then(d => setStaff(d ?? [])).catch(() => {}) }, [])
  return staff
}
function pmMsgHook() {
  const [msg, setMsg] = useState({ text: '', error: false })
  const show = (text, error = false) => { setMsg({ text, error }); setTimeout(() => setMsg({ text: '', error: false }), 3000) }
  return [msg, show]
}
function PmMsg({ msg }) {
  return msg.text ? <div style={{ ...s.msg, background: msg.error ? '#fee2e2' : '#d1fae5', color: msg.error ? '#991b1b' : '#065f46' }}>{msg.text}</div> : null
}
function PmUnitTabs({ units, active, onChange }) {
  return (
    <div style={s.unitTabs}>
      {units.map(u => <button key={u} style={{ ...s.unitTab, ...(active === u ? s.unitTabActive : {}) }} onClick={() => onChange(u)}>{UNIT_LABELS[u] ?? u}</button>)}
    </div>
  )
}

// ── 人員主檔（＋該員單位角色子管理）──
const emptyStaffForm = { employeeNo: '', name: '', ext: '', mobile: '', isAdmin: false, isActive: true, sortOrder: 0 }
const pmOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 50, padding: '40px 16px', overflowY: 'auto' }
const pmModal = { background: '#fff', borderRadius: '12px', padding: '22px 26px', width: '860px', maxWidth: '96vw', boxShadow: '0 10px 40px rgba(0,0,0,.25)' }
// StaffSection：系統「帳號設定」(unitCode 省略，全部人員、可設系統管理員)，
// 或單位「帳號設定」(帶 unitCode：只列該單位人員、新增自動綁該單位、角色鎖定該單位)。
function StaffSection({ unitCode }) {
  const [list, setList] = useState([])
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(emptyStaffForm)
  const [editId, setEditId] = useState(null)   // null＝新增模式；數字＝編輯該 id
  const [open, setOpen] = useState(false)       // 編輯彈窗開關
  const [msg, show] = pmMsgHook()
  const load = useCallback(async () => {
    try {
      const all = (await wardApi.getStaff(true)) ?? []
      if (unitCode) {
        const roles = (await wardApi.getUnitRoles(null, unitCode, true)) ?? []
        const ids = new Set(roles.map(r => r.staffId))
        setList(all.filter(s => ids.has(s.id)))   // 只列屬於此單位者
      } else setList(all)
    } catch { show('讀取失敗', true) }
  }, [unitCode])
  useEffect(() => { load() }, [load])
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const openNew = () => { setForm(emptyStaffForm); setEditId(null); setOpen(true) }
  const openEdit = i => { setEditId(i.id); setForm({ employeeNo: i.employeeNo, name: i.name, ext: i.ext ?? '', mobile: i.mobile ?? '', isAdmin: i.isAdmin, isActive: i.isActive, sortOrder: i.sortOrder }); setOpen(true) }
  const close = () => { setOpen(false); setEditId(null); setForm(emptyStaffForm); load() }
  const submit = async e => {
    e.preventDefault()
    try {
      if (editId) { await wardApi.updateStaff(editId, form); show('修改成功'); load() }
      else {
        const created = await wardApi.createStaff(form)
        if (unitCode) await wardApi.createUnitRole({ staffId: created.id, unitCode, role: '護理師', department: '', isManager: false, groupKey: 'nurse', sortOrder: 0, isActive: true })  // 自動綁該單位
        show(unitCode ? `已建立並綁定 ${unitCode}，可於下方調整角色` : '已建立，請於下方設定單位角色')
        setEditId(created.id); load()
      }
    } catch { show('操作失敗（員編可能重複）', true) }
  }
  const del = async (staff) => {
    if (!window.confirm(unitCode ? `將「${staff.name}」自 ${unitCode} 移除（若無其他單位則一併刪除帳號）？` : '刪除帳號會一併移除其單位角色，確定？')) return
    try {
      if (unitCode) {
        const roles = (await wardApi.getUnitRoles(staff.id, unitCode, true)) ?? []
        for (const r of roles) await wardApi.removeUnitRole(r.id)
        const remain = (await wardApi.getUnitRoles(staff.id, null, true)) ?? []
        if (!remain.length && !staff.isAdmin) await wardApi.removeStaff(staff.id)   // 已無任何單位→刪帳號
        show('已移除')
      } else { await wardApi.removeStaff(staff.id); show('刪除成功') }
      load()
    } catch { show('刪除失敗', true) }
  }

  const kw = search.trim()
  const filtered = kw ? list.filter(i => (i.employeeNo || '').includes(kw) || (i.name || '').includes(kw)) : list
  const titleSuffix = unitCode ? `（${unitCode}）` : ''

  return (
    <div>
      <PmMsg msg={msg} />
      <div style={s.listCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <h4 style={{ ...s.formTitle, margin: 0 }}>帳號設定{titleSuffix}（共 {list.length} 人）</h4>
          <input style={{ ...s.input, width: '240px' }} value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 搜尋員編 / 姓名" />
          <div style={{ flex: 1 }} />
          <button style={s.btnPrimary} onClick={openNew}>＋ 新增帳號</button>
        </div>
        {filtered.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '14px' }}>{kw ? '查無符合' : '尚無資料'}</p> : (
          <table style={s.table}>
            <thead><tr>{['員編', '姓名', '分機', '手機', ...(unitCode ? [] : ['管理員']), '啟用', '操作'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map((i, n) => (
                <tr key={i.id} style={{ background: n % 2 ? '#f9fafb' : '#fff' }}>
                  <td style={s.td}>{i.employeeNo}</td><td style={s.td}>{i.name}</td><td style={s.td}>{i.ext || '—'}</td><td style={s.td}>{i.mobile || '—'}</td>
                  {!unitCode && <td style={s.td}>{i.isAdmin ? '✓' : '—'}</td>}
                  <td style={s.td}><span style={{ ...s.badge, background: i.isActive ? '#d1fae5' : '#f3f4f6', color: i.isActive ? '#065f46' : '#6b7280' }}>{i.isActive ? '✓' : '停'}</span></td>
                  <td style={s.td}><button style={s.btnEdit} onClick={() => openEdit(i)}>編輯</button><button style={s.btnDel} onClick={() => del(i)}>{unitCode ? '移除' : '刪除'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && (
        <div style={pmOverlay} onClick={e => e.target === e.currentTarget && close()}>
          <div style={pmModal}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h4 style={{ ...s.formTitle, margin: 0 }}>{editId ? `編輯帳號 — ${form.name || ''}` : `新增帳號${titleSuffix}`}</h4>
              <button style={s.btnSecondary} onClick={close}>✕ 關閉</button>
            </div>
            <PmMsg msg={msg} />
            <div style={s.formCard}>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>
                {unitCode ? `員編為登入帳號。新增將自動綁定 ${unitCode}；下方可調整其在 ${unitCode} 的職別/管理者。` : '員編為登入帳號（現階段免密碼）。系統管理員可管理全部單位；各單位管理者於下方「單位角色」勾選。'}
              </div>
              <form onSubmit={submit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
                  <div style={s.formRow}><label style={s.label}>員編 *</label><input style={s.input} value={form.employeeNo} required onChange={e => setF('employeeNo', e.target.value)} placeholder="N001" /></div>
                  <div style={s.formRow}><label style={s.label}>姓名 *</label><input style={s.input} value={form.name} required onChange={e => setF('name', e.target.value)} /></div>
                  <div style={s.formRow}><label style={s.label}>分機</label><input style={s.input} value={form.ext} onChange={e => setF('ext', e.target.value)} /></div>
                  <div style={s.formRow}><label style={s.label}>手機</label><input style={s.input} value={form.mobile} onChange={e => setF('mobile', e.target.value)} /></div>
                  <div style={s.formRow}><label style={s.label}>排序</label><input type="number" style={s.input} value={form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></div>
                </div>
                <div style={{ display: 'flex', gap: '18px', alignItems: 'center', marginTop: '4px' }}>
                  {!unitCode && <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}><input type="checkbox" checked={form.isAdmin} onChange={e => setF('isAdmin', e.target.checked)} />系統管理員（全站）</label>}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}><input type="checkbox" checked={form.isActive} onChange={e => setF('isActive', e.target.checked)} />啟用</label>
                </div>
                <div style={{ marginTop: '14px' }}>
                  <button type="submit" style={s.btnPrimary}>{editId ? '儲存基本資料' : (unitCode ? `建立並綁定 ${unitCode}` : '建立帳號（之後設定單位角色）')}</button>
                </div>
              </form>
            </div>
            {editId
              ? <StaffRolePanel staffId={editId} staffName={form.name} lockUnit={unitCode} />
              : <div style={{ ...s.formCard, color: '#9ca3af', fontSize: '13px' }}>先「建立帳號」後，即可在此設定{unitCode ? `${unitCode} 的職別/權限` : '單位／角色／權限'}。</div>}
          </div>
        </div>
      )}
    </div>
  )
}

// 某人員的單位角色子管理（多單位多角色）
const emptyRoleForm = { unitCode: 'W52', role: '護理師', department: '', isManager: false, groupKey: 'nurse', sortOrder: 0, isActive: true }
function StaffRolePanel({ staffId, staffName, lockUnit }) {
  const baseForm = lockUnit ? { ...emptyRoleForm, unitCode: lockUnit } : emptyRoleForm
  const [list, setList] = useState([])
  const [form, setForm] = useState(baseForm)
  const [editId, setEditId] = useState(null)
  const [msg, show] = pmMsgHook()
  const load = useCallback(async () => { try { setList((await wardApi.getUnitRoles(staffId, lockUnit ?? null, true)) ?? []) } catch { show('讀取失敗', true) } }, [staffId, lockUnit])
  useEffect(() => { load() }, [load])
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const submit = async e => {
    e.preventDefault()
    const payload = { ...form, staffId, unitCode: lockUnit ?? form.unitCode }
    try {
      if (editId) { await wardApi.updateUnitRole(editId, payload); show('修改成功') }
      else { await wardApi.createUnitRole(payload); show('新增成功') }
      setForm(baseForm); setEditId(null); load()
    } catch { show('操作失敗', true) }
  }
  const edit = i => { setEditId(i.id); setForm({ unitCode: i.unitCode, role: i.role, department: i.department ?? '', isManager: i.isManager, groupKey: i.groupKey ?? '', sortOrder: i.sortOrder, isActive: i.isActive }) }
  const del = async id => { if (!window.confirm('確定刪除此單位角色？')) return; try { await wardApi.removeUnitRole(id); show('刪除成功'); load() } catch { show('刪除失敗', true) } }
  return (
    <div style={{ ...s.formCard, borderLeft: '4px solid #2D7A55' }}>
      <h4 style={s.formTitle}>{lockUnit ? `${lockUnit} 角色設定` : '單位角色'} — {staffName}</h4>
      <PmMsg msg={msg} />
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0 12px' }}>
          <div style={s.formRow}><label style={s.label}>單位 *</label><select style={s.input} value={form.unitCode} disabled={!!lockUnit} onChange={e => setF('unitCode', e.target.value)}>{(lockUnit ? [lockUnit] : PM_UNITS).map(u => <option key={u} value={u}>{u}</option>)}</select></div>
          <div style={s.formRow}><label style={s.label}>職別 *</label><select style={s.input} value={form.role} onChange={e => setF('role', e.target.value)}>{PM_ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
          <div style={s.formRow}><label style={s.label}>科別/專長</label><input style={s.input} value={form.department} onChange={e => setF('department', e.target.value)} /></div>
          <div style={s.formRow}><label style={s.label}>照護團隊分組</label><select style={s.input} value={form.groupKey} onChange={e => setF('groupKey', e.target.value)}><option value="">（不顯示於團隊）</option>{PM_GROUPS.map(g => <option key={g.k} value={g.k}>{g.n}</option>)}</select></div>
        </div>
        <div style={{ display: 'flex', gap: '18px', alignItems: 'center', margin: '4px 0' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}><input type="checkbox" checked={form.isManager} onChange={e => setF('isManager', e.target.checked)} />該區管理者（可登入後台管理此單位）</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}><input type="checkbox" checked={form.isActive} onChange={e => setF('isActive', e.target.checked)} />啟用</label>
          <div style={{ ...s.formRow, margin: 0 }}><label style={s.label}>排序</label><input type="number" style={{ ...s.input, width: '70px' }} value={form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="submit" style={s.btnPrimary}>{editId ? '儲存' : '+ 新增單位角色'}</button>
          {editId && <button type="button" style={s.btnSecondary} onClick={() => { setForm(baseForm); setEditId(null) }}>取消</button>}
        </div>
      </form>
      <table style={{ ...s.table, marginTop: '12px' }}>
        <thead><tr>{['單位', '職別', '科別/專長', '管理者', '分組', '啟用', '操作'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
        <tbody>
          {list.length === 0 ? <tr><td style={s.td} colSpan="7">尚無單位角色</td></tr> : list.map((i, n) => (
            <tr key={i.id} style={{ background: editId === i.id ? '#fef9c3' : n % 2 ? '#f9fafb' : '#fff' }}>
              <td style={s.td}>{i.unitCode}</td><td style={s.td}>{i.role}</td><td style={s.td}>{i.department || '—'}</td>
              <td style={s.td}>{i.isManager ? '✓' : '—'}</td><td style={s.td}>{PM_GROUPS.find(g => g.k === i.groupKey)?.n || '—'}</td>
              <td style={s.td}>{i.isActive ? '✓' : '停'}</td>
              <td style={s.td}><button style={s.btnEdit} onClick={() => edit(i)}>編輯</button><button style={s.btnDel} onClick={() => del(i.id)}>刪除</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── 排班 ──
function ScheduleSection({ units }) {
  const [unit, setUnit] = useState(units[0] ?? 'W52')
  const [date, setDate] = useState(pmToday())
  const [list, setList] = useState([])
  const [form, setForm] = useState({ staffId: '', shift: '白班', emergencyGroup: '', isCharge: false, sortOrder: 0, isActive: true })
  const [editId, setEditId] = useState(null)
  const [msg, show] = pmMsgHook()
  const staff = usePmStaff()
  const load = useCallback(async () => { try { setList((await wardApi.getScheduleList(unit, date, true)) ?? []) } catch { show('讀取失敗', true) } }, [unit, date])
  useEffect(() => { load() }, [load])
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const submit = async e => {
    e.preventDefault()
    if (!form.staffId) { show('請選擇人員', true); return }
    const payload = { ...form, staffId: Number(form.staffId), unitCode: unit, workDate: date }
    try {
      if (editId) { await wardApi.updateSchedule(editId, payload); show('修改成功') }
      else { await wardApi.createSchedule(payload); show('新增成功') }
      setForm({ staffId: '', shift: '白班', emergencyGroup: '', isCharge: false, sortOrder: 0, isActive: true }); setEditId(null); load()
    } catch { show('操作失敗', true) }
  }
  const edit = i => { setEditId(i.id); setForm({ staffId: i.staffId, shift: i.shift, emergencyGroup: i.emergencyGroup ?? '', isCharge: i.isCharge, sortOrder: i.sortOrder, isActive: i.isActive }) }
  const del = async id => { if (!window.confirm('確定刪除？')) return; try { await wardApi.removeSchedule(id); show('刪除成功'); load() } catch { show('刪除失敗', true) } }
  return (
    <div>
      <PmUnitTabs units={units} active={unit} onChange={u => { setUnit(u); setEditId(null) }} />
      <PmMsg msg={msg} />
      <div style={s.formCard}>
        <h4 style={s.formTitle}>{editId ? `修改排班 (ID: ${editId})` : '新增排班'}（{unit}）</h4>
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0 12px' }}>
            <div style={s.formRow}><label style={s.label}>日期 *</label><input type="date" style={s.input} value={date} onChange={e => setDate(e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>人員 *</label><NurseSelect options={staff.map(p => ({ value: String(p.id), label: `${p.name}（${p.employeeNo}）` }))} value={form.staffId ? String(form.staffId) : ''} onChange={v => setF('staffId', v)} placeholder="輸入或點選人員" /></div>
            <div style={s.formRow}><label style={s.label}>班別 *</label><select style={s.input} value={form.shift} onChange={e => setF('shift', e.target.value)}>{PM_SHIFTS.map(x => <option key={x} value={x}>{x}</option>)}</select></div>
            <div style={s.formRow}><label style={s.label}>緊急編組</label><input style={s.input} value={form.emergencyGroup} onChange={e => setF('emergencyGroup', e.target.value)} placeholder="指揮/A/B" /></div>
          </div>
          <div style={{ display: 'flex', gap: '18px', alignItems: 'center', margin: '4px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}><input type="checkbox" checked={form.isCharge} onChange={e => setF('isCharge', e.target.checked)} />點班</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}><input type="checkbox" checked={form.isActive} onChange={e => setF('isActive', e.target.checked)} />啟用</label>
            <div style={{ ...s.formRow, margin: 0 }}><label style={s.label}>排序</label><input type="number" style={{ ...s.input, width: '70px' }} value={form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}><button type="submit" style={s.btnPrimary}>{editId ? '儲存' : '+ 新增'}</button>{editId && <button type="button" style={s.btnSecondary} onClick={() => { setEditId(null); setForm({ staffId: '', shift: '白班', emergencyGroup: '', isCharge: false, sortOrder: 0, isActive: true }) }}>取消</button>}</div>
        </form>
      </div>
      <div style={s.listCard}>
        <h4 style={s.formTitle}>{date} 排班（{list.length} 筆）</h4>
        <table style={s.table}>
          <thead><tr>{['班別', '姓名', '職別', '緊急編組', '點班', '啟用', '操作'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>
            {list.length === 0 ? <tr><td style={s.td} colSpan="7">尚無資料</td></tr> : list.map((i, n) => (
              <tr key={i.id} style={{ background: editId === i.id ? '#fef9c3' : n % 2 ? '#f9fafb' : '#fff' }}>
                <td style={s.td}>{i.shift}</td><td style={s.td}>{i.name}</td><td style={s.td}>{i.role || '—'}</td>
                <td style={s.td}>{i.emergencyGroup || '—'}</td><td style={s.td}>{i.isCharge ? '✓' : '—'}</td><td style={s.td}>{i.isActive ? '✓' : '停'}</td>
                <td style={s.td}><button style={s.btnEdit} onClick={() => edit(i)}>編輯</button><button style={s.btnDel} onClick={() => del(i.id)}>刪除</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── 查房表 ──
function RoundSection({ units }) {
  const [unit, setUnit] = useState(units[0] ?? 'W52')
  const [date, setDate] = useState(pmToday())
  const [list, setList] = useState([])
  const [form, setForm] = useState({ staffId: '', doctorName: '', specialty: '', estimatedTime: '', actualTime: '', isCompleted: false, remark: '', sortOrder: 0, isActive: true })
  const [editId, setEditId] = useState(null)
  const [msg, show] = pmMsgHook()
  const load = useCallback(async () => { try { setList((await wardApi.getRoundList(unit, date, true)) ?? []) } catch { show('讀取失敗', true) } }, [unit, date])
  useEffect(() => { load() }, [load])
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  // 醫師選定改用全院共用主檔（科別→篩選醫師；選醫師→自動帶入科別＝specialty）
  const [depts, setDepts] = useState([])
  const [doctors, setDoctors] = useState([])
  useEffect(() => {
    wardApi.getDepartments(true).then(d => setDepts(d ?? [])).catch(() => {})
    wardApi.getDoctors(null, true).then(d => setDoctors(d ?? [])).catch(() => {})
  }, [])
  const deptOptions = depts.map(d => ({ value: d.name, label: `${d.name}（${d.code}）` }))   // 以科別中文為值（＝specialty）
  const selDeptCode = depts.find(d => d.name === form.specialty)?.code
  const docList = selDeptCode ? doctors.filter(d => d.deptCode === selDeptCode) : doctors
  const docOptions = [...new Map(docList.map(d => [d.name, { value: d.name, label: `${d.name}${d.ext ? `（分機 ${d.ext}）` : ''}` }])).values()]
  const pickDept = (name) => {
    setF('specialty', name)
    if (!name) return
    const code = depts.find(d => d.name === name)?.code
    if (form.doctorName && code && !doctors.some(d => d.name === form.doctorName && d.deptCode === code)) setF('doctorName', '')
  }
  const pickDoctor = (name) => {
    setF('doctorName', name)
    const dr = (selDeptCode ? doctors.filter(d => d.deptCode === selDeptCode) : doctors).find(d => d.name === name) || doctors.find(d => d.name === name)
    if (dr && dr.deptCode) { const dn = dr.deptName ?? depts.find(x => x.code === dr.deptCode)?.name; if (dn) setF('specialty', dn) }
  }
  const submit = async e => {
    e.preventDefault()
    const payload = { ...form, staffId: form.staffId ? Number(form.staffId) : null, unitCode: unit, roundDate: date }
    try {
      if (editId) { await wardApi.updateRound(editId, payload); show('修改成功') }
      else { await wardApi.createRound(payload); show('新增成功') }
      setForm({ staffId: '', doctorName: '', specialty: '', estimatedTime: '', actualTime: '', isCompleted: false, remark: '', sortOrder: 0, isActive: true }); setEditId(null); load()
    } catch { show('操作失敗', true) }
  }
  const edit = i => { setEditId(i.id); setForm({ staffId: i.staffId ?? '', doctorName: i.doctorName ?? '', specialty: i.specialty ?? '', estimatedTime: i.estimatedTime ?? '', actualTime: i.actualTime ?? '', isCompleted: i.isCompleted, remark: i.remark ?? '', sortOrder: i.sortOrder, isActive: i.isActive }) }
  const del = async id => { if (!window.confirm('確定刪除？')) return; try { await wardApi.removeRound(id); show('刪除成功'); load() } catch { show('刪除失敗', true) } }
  return (
    <div>
      <PmUnitTabs units={units} active={unit} onChange={u => { setUnit(u); setEditId(null) }} />
      <PmMsg msg={msg} />
      <div style={s.formCard}>
        <h4 style={s.formTitle}>{editId ? `修改查房 (ID: ${editId})` : '新增查房'}（{unit}）</h4>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>醫師、科別皆為查詢下拉：選科別後醫師只列該科；先選醫師會自動帶入科別。醫師可自由輸入。（科別、醫師總表於「系統管理」維護）</div>
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0 12px' }}>
            <div style={s.formRow}><label style={s.label}>日期 *</label><input type="date" style={s.input} value={date} onChange={e => setDate(e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>科別（專科）</label><NurseSelect options={deptOptions} value={form.specialty} onChange={pickDept} placeholder="搜尋科別（代碼/名稱）" /></div>
            <div style={s.formRow}><label style={s.label}>醫師</label><NurseSelect options={docOptions} value={form.doctorName} allowFree onChange={pickDoctor} placeholder={form.specialty ? '搜尋該科醫師' : '搜尋醫師（先選科別可篩選）'} /></div>
            <div style={s.formRow}><label style={s.label}>預定時間</label><input style={s.input} value={form.estimatedTime} onChange={e => setF('estimatedTime', e.target.value)} placeholder="09:00" /></div>
            <div style={s.formRow}><label style={s.label}>實際時間</label><input style={s.input} value={form.actualTime} onChange={e => setF('actualTime', e.target.value)} placeholder="09:08" /></div>
            <div style={s.formRow}><label style={s.label}>備註</label><input style={s.input} value={form.remark} onChange={e => setF('remark', e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>排序</label><input type="number" style={s.input} value={form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></div>
          </div>
          <div style={{ display: 'flex', gap: '18px', alignItems: 'center', margin: '4px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}><input type="checkbox" checked={form.isCompleted} onChange={e => setF('isCompleted', e.target.checked)} />已完成</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}><input type="checkbox" checked={form.isActive} onChange={e => setF('isActive', e.target.checked)} />啟用</label>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}><button type="submit" style={s.btnPrimary}>{editId ? '儲存' : '+ 新增'}</button>{editId && <button type="button" style={s.btnSecondary} onClick={() => { setEditId(null); setForm({ staffId: '', doctorName: '', specialty: '', estimatedTime: '', actualTime: '', isCompleted: false, remark: '', sortOrder: 0, isActive: true }) }}>取消</button>}</div>
        </form>
      </div>
      <div style={s.listCard}>
        <h4 style={s.formTitle}>{date} 查房（{list.length} 筆）</h4>
        <table style={s.table}>
          <thead><tr>{['姓名', '專科', '預定', '實際', '完成', '操作'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>
            {list.length === 0 ? <tr><td style={s.td} colSpan="6">尚無資料</td></tr> : list.map((i, n) => (
              <tr key={i.id} style={{ background: editId === i.id ? '#fef9c3' : n % 2 ? '#f9fafb' : '#fff' }}>
                <td style={s.td}>{i.doctorName || '—'}</td><td style={s.td}>{i.specialty || '—'}</td><td style={s.td}>{i.estimatedTime || '—'}</td><td style={s.td}>{i.actualTime || '—'}</td><td style={s.td}>{i.isCompleted ? '✓' : '—'}</td>
                <td style={s.td}><button style={s.btnEdit} onClick={() => edit(i)}>編輯</button><button style={s.btnDel} onClick={() => del(i.id)}>刪除</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── 護理交班（header＋病人卡＋事項，三層）──
const HO_CATS = ['管路', '用藥', '生命徵象', '警示', '感控', '家屬', '待辦']
function HandoverSection({ units }) {
  const [unit, setUnit] = useState(units[0] ?? 'W52')
  const [date, setDate] = useState(pmToday())
  const [shifts, setShifts] = useState([])
  const [sel, setSel] = useState(null)   // 目前展開的交班 header
  const [msg, show] = pmMsgHook()
  const staff = usePmStaff()
  const empty = { fromShift: '白班', fromShiftTime: '08:00–16:00', toShift: '小夜', toShiftTime: '16:00–24:00', handoverTime: '16:00', fromStaffIds: '', toStaffIds: '', isActive: true }
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState(null)
  const load = useCallback(async () => { try { setShifts((await wardApi.getHandoverShifts(unit, date, true)) ?? []) } catch { show('讀取失敗', true) } }, [unit, date])
  useEffect(() => { load() }, [load])
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const submit = async e => {
    e.preventDefault()
    const payload = { ...form, unitCode: unit, workDate: date }
    try {
      if (editId) { await wardApi.updateHandoverShift(editId, payload); show('修改成功') }
      else { await wardApi.createHandoverShift(payload); show('新增成功') }
      setForm(empty); setEditId(null); load()
    } catch { show('操作失敗', true) }
  }
  const edit = i => { setEditId(i.id); setForm({ fromShift: i.fromShift ?? '', fromShiftTime: i.fromShiftTime ?? '', toShift: i.toShift ?? '', toShiftTime: i.toShiftTime ?? '', handoverTime: i.handoverTime ?? '', fromStaffIds: i.fromStaffIds ?? '', toStaffIds: i.toStaffIds ?? '', isActive: i.isActive }) }
  const del = async id => { if (!window.confirm('刪除交班會一併刪除其病人卡與事項，確定？')) return; try { await wardApi.removeHandoverShift(id); show('刪除成功'); if (sel?.id === id) setSel(null); load() } catch { show('刪除失敗', true) } }
  // 護理師多選（存 csv staffId）
  const toggleStaff = (field, id) => {
    const cur = (form[field] || '').split(',').filter(Boolean)
    const next = cur.includes(String(id)) ? cur.filter(x => x !== String(id)) : [...cur, String(id)]
    setF(field, next.join(','))
  }
  return (
    <div>
      <PmUnitTabs units={units} active={unit} onChange={u => { setUnit(u); setEditId(null); setSel(null) }} />
      <PmMsg msg={msg} />
      <div style={s.formCard}>
        <h4 style={s.formTitle}>{editId ? `修改交班 (ID: ${editId})` : '新增交班'}（{unit}）</h4>
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 12px' }}>
            <div style={s.formRow}><label style={s.label}>日期 *</label><input type="date" style={s.input} value={date} onChange={e => setDate(e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>交班別</label><select style={s.input} value={form.fromShift} onChange={e => setF('fromShift', e.target.value)}>{PM_SHIFTS.map(x => <option key={x} value={x}>{x}</option>)}</select></div>
            <div style={s.formRow}><label style={s.label}>接班別</label><select style={s.input} value={form.toShift} onChange={e => setF('toShift', e.target.value)}>{PM_SHIFTS.map(x => <option key={x} value={x}>{x}</option>)}</select></div>
            <div style={s.formRow}><label style={s.label}>交班時間</label><input style={s.input} value={form.fromShiftTime} onChange={e => setF('fromShiftTime', e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>接班時間</label><input style={s.input} value={form.toShiftTime} onChange={e => setF('toShiftTime', e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>交班時刻</label><input style={s.input} value={form.handoverTime} onChange={e => setF('handoverTime', e.target.value)} placeholder="16:00" /></div>
          </div>
          <div style={s.formRow}><label style={s.label}>交班護理師</label><StaffCheckPicker staff={staff} value={form.fromStaffIds} onToggle={id => toggleStaff('fromStaffIds', id)} /></div>
          <div style={s.formRow}><label style={s.label}>接班護理師</label><StaffCheckPicker staff={staff} value={form.toStaffIds} onToggle={id => toggleStaff('toStaffIds', id)} /></div>
          <div style={{ display: 'flex', gap: '8px' }}><button type="submit" style={s.btnPrimary}>{editId ? '儲存' : '+ 新增交班'}</button>{editId && <button type="button" style={s.btnSecondary} onClick={() => { setEditId(null); setForm(empty) }}>取消</button>}</div>
        </form>
      </div>
      <div style={s.listCard}>
        <h4 style={s.formTitle}>{date} 交班（{shifts.length} 筆）</h4>
        <table style={s.table}>
          <thead><tr>{['交→接', '時刻', '啟用', '操作'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
          <tbody>
            {shifts.length === 0 ? <tr><td style={s.td} colSpan="4">尚無資料</td></tr> : shifts.map((i, n) => (
              <tr key={i.id} style={{ background: sel?.id === i.id ? '#e0f2fe' : editId === i.id ? '#fef9c3' : n % 2 ? '#f9fafb' : '#fff' }}>
                <td style={s.td}>{i.fromShift} → {i.toShift}</td><td style={s.td}>{i.handoverTime || '—'}</td><td style={s.td}>{i.isActive ? '✓' : '停'}</td>
                <td style={s.td}><button style={s.btnEdit} onClick={() => setSel(i)}>病人卡</button><button style={s.btnEdit} onClick={() => edit(i)}>編輯</button><button style={s.btnDel} onClick={() => del(i.id)}>刪除</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sel && <HandoverPatientPanel shift={sel} />}
    </div>
  )
}

// 某交班的病人卡 + 事項
function HandoverPatientPanel({ shift }) {
  const [list, setList] = useState([])
  const [form, setForm] = useState({ bedNo: '', patientName: '', gender: 'M', age: '', diagnosis: '', priority: '高', sortOrder: 0 })
  const [editId, setEditId] = useState(null)
  const [msg, show] = pmMsgHook()
  const load = useCallback(async () => { try { setList((await wardApi.getHandoverPatients(shift.id)) ?? []) } catch { show('讀取失敗', true) } }, [shift.id])
  useEffect(() => { load() }, [load])
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const submit = async e => {
    e.preventDefault()
    const payload = { ...form, age: form.age ? Number(form.age) : null, handoverShiftId: shift.id }
    try {
      if (editId) { await wardApi.updateHandoverPatient(editId, payload); show('修改成功') }
      else { await wardApi.createHandoverPatient(payload); show('新增成功') }
      setForm({ bedNo: '', patientName: '', gender: 'M', age: '', diagnosis: '', priority: '高', sortOrder: 0 }); setEditId(null); load()
    } catch { show('操作失敗', true) }
  }
  const edit = i => { setEditId(i.id); setForm({ bedNo: i.bedNo ?? '', patientName: i.patientName ?? '', gender: i.gender ?? 'M', age: i.age ?? '', diagnosis: i.diagnosis ?? '', priority: i.priority ?? '高', sortOrder: i.sortOrder }) }
  const del = async id => { if (!window.confirm('刪除病人卡會一併刪除其事項，確定？')) return; try { await wardApi.removeHandoverPatient(id); show('刪除成功'); load() } catch { show('刪除失敗', true) } }
  return (
    <div style={{ ...s.formCard, borderLeft: '4px solid #0284c7' }}>
      <h4 style={s.formTitle}>交班病人卡 — {shift.fromShift} → {shift.toShift}</h4>
      <PmMsg msg={msg} />
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '0.6fr 1fr 0.5fr 0.5fr 1.4fr', gap: '0 12px' }}>
          <div style={s.formRow}><label style={s.label}>床號</label><input style={s.input} value={form.bedNo} onChange={e => setF('bedNo', e.target.value)} /></div>
          <div style={s.formRow}><label style={s.label}>姓名</label><input style={s.input} value={form.patientName} onChange={e => setF('patientName', e.target.value)} /></div>
          <div style={s.formRow}><label style={s.label}>性別</label><select style={s.input} value={form.gender} onChange={e => setF('gender', e.target.value)}><option value="M">男</option><option value="F">女</option></select></div>
          <div style={s.formRow}><label style={s.label}>年齡</label><input type="number" style={s.input} value={form.age} onChange={e => setF('age', e.target.value)} /></div>
          <div style={s.formRow}><label style={s.label}>優先</label><select style={s.input} value={form.priority} onChange={e => setF('priority', e.target.value)}>{['高', '中', '低'].map(x => <option key={x} value={x}>{x}</option>)}</select></div>
        </div>
        <div style={s.formRow}><label style={s.label}>診斷</label><input style={s.input} value={form.diagnosis} onChange={e => setF('diagnosis', e.target.value)} /></div>
        <div style={{ display: 'flex', gap: '8px' }}><button type="submit" style={s.btnPrimary}>{editId ? '儲存' : '+ 新增病人卡'}</button>{editId && <button type="button" style={s.btnSecondary} onClick={() => { setEditId(null); setForm({ bedNo: '', patientName: '', gender: 'M', age: '', diagnosis: '', priority: '高', sortOrder: 0 }) }}>取消</button>}</div>
      </form>
      {list.map(p => (
        <div key={p.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px', marginTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <strong>{p.bedNo} {p.patientName}</strong><span style={{ color: '#6b7280', fontSize: '13px' }}>{p.gender}/{p.age} · {p.priority} · {p.diagnosis}</span>
            <button style={s.btnEdit} onClick={() => edit(p)}>編輯</button><button style={s.btnDel} onClick={() => del(p.id)}>刪除</button>
          </div>
          <HandoverNotePanel patient={p} />
        </div>
      ))}
    </div>
  )
}

// 某病人卡的交班事項
function HandoverNotePanel({ patient }) {
  const [list, setList] = useState([])
  const [form, setForm] = useState({ category: '管路', content: '', sortOrder: 0 })
  const [msg, show] = pmMsgHook()
  const load = useCallback(async () => { try { setList((await wardApi.getHandoverNotes(patient.id)) ?? []) } catch {} }, [patient.id])
  useEffect(() => { load() }, [load])
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const add = async e => {
    e.preventDefault()
    if (!form.content) { show('請填內容', true); return }
    try { await wardApi.createHandoverNote({ ...form, handoverPatientId: patient.id }); setForm({ category: '管路', content: '', sortOrder: 0 }); load() } catch { show('新增失敗', true) }
  }
  const del = async id => { try { await wardApi.removeHandoverNote(id); load() } catch {} }
  return (
    <div style={{ paddingLeft: '8px' }}>
      <PmMsg msg={msg} />
      {list.map(n => (
        <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '2px 0' }}>
          <span style={{ ...s.badge, background: '#eef2ff', color: '#3730a3' }}>{n.category}</span>
          <span style={{ flex: 1 }}>{n.content}</span>
          <button style={s.btnDel} onClick={() => del(n.id)}>×</button>
        </div>
      ))}
      <form onSubmit={add} style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
        <select style={{ ...s.input, width: '110px' }} value={form.category} onChange={e => setF('category', e.target.value)}>{HO_CATS.map(c => <option key={c} value={c}>{c}</option>)}</select>
        <input style={{ ...s.input, flex: 1 }} value={form.content} onChange={e => setF('content', e.target.value)} placeholder="交班事項內容" />
        <button type="submit" style={s.btnPrimary}>+ 事項</button>
      </form>
    </div>
  )
}


// ── W52 照護提醒（自建；責任護理師接人員管理）──
const CR_PRIORITY = ['高', '中', '低']
const CR_CATEGORY = ['術後照護', '感控', '管路', '跌倒防護', '藥物', '檢查追蹤', '衛教', '出院準備']
const emptyCareForm = { bedId: '', patientName: '', gender: 'M', age: '', priority: '高', category: '術後照護', content: '', remindTime: '', primaryNurseStaffId: '', isDone: false, sortOrder: 0, isActive: true }
function CareReminderSection() {
  const [list, setList] = useState([])
  const nurses = useUnitNurses('W52')        // 責任護理師下拉（W52 職別含「護理」者）
  const [form, setForm] = useState(emptyCareForm)
  const [editId, setEditId] = useState(null)
  const [msg, setMsg] = useState({ text: '', error: false })
  const showMsg = (text, error = false) => { setMsg({ text, error }); setTimeout(() => setMsg({ text: '', error: false }), 3000) }
  const load = useCallback(async () => { try { setList((await wardApi.getCareReminder('W52', true)) ?? []) } catch { showMsg('讀取失敗', true) } }, [])
  useEffect(() => { load() }, [load])
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...form, unitCode: 'W52', age: form.age ? Number(form.age) : null, primaryNurseStaffId: form.primaryNurseStaffId ? Number(form.primaryNurseStaffId) : null }
    try {
      if (editId) { await wardApi.updateCareReminder(editId, payload); showMsg('修改成功') }
      else { await wardApi.createCareReminder(payload); showMsg('新增成功') }
      setForm(emptyCareForm); setEditId(null); load()
    } catch { showMsg('操作失敗', true) }
  }
  const handleEdit = i => {
    setEditId(i.id)
    setForm({ bedId: i.bedId ?? '', patientName: i.patientName ?? '', gender: i.gender ?? 'M', age: i.age ?? '', priority: i.priority ?? '高', category: i.category ?? '術後照護', content: i.content ?? '', remindTime: i.remindTime ?? '', primaryNurseStaffId: i.primaryNurseStaffId ?? '', isDone: i.isDone, sortOrder: i.sortOrder, isActive: i.isActive })
  }
  const handleDelete = async id => { if (!window.confirm('確定刪除？')) return; try { await wardApi.removeCareReminder(id); showMsg('刪除成功'); load() } catch { showMsg('刪除失敗', true) } }
  return (
    <div>
      {msg.text && <div style={{ ...s.msg, background: msg.error ? '#fee2e2' : '#d1fae5', color: msg.error ? '#991b1b' : '#065f46' }}>{msg.text}</div>}
      <div style={s.formCard}>
        <h4 style={s.formTitle}>{editId ? `修改照護提醒 (ID: ${editId})` : '新增照護提醒'}（W52）</h4>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>自建（院方無此資料）。床號/病人手填；責任護理師由人員管理下拉。</div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '0.6fr 1fr 0.5fr 0.5fr 1fr', gap: '0 12px' }}>
            <div style={s.formRow}><label style={s.label}>床號</label><input style={s.input} value={form.bedId} onChange={e => setF('bedId', e.target.value)} placeholder="014" /></div>
            <div style={s.formRow}><label style={s.label}>姓名</label><input style={s.input} value={form.patientName} onChange={e => setF('patientName', e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>性別</label><select style={s.input} value={form.gender} onChange={e => setF('gender', e.target.value)}><option value="M">男</option><option value="F">女</option></select></div>
            <div style={s.formRow}><label style={s.label}>年齡</label><input type="number" style={s.input} value={form.age} onChange={e => setF('age', e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>責任護理師</label>
              <NurseSelect options={nurses.map(n => ({ value: String(n.staffId), label: n.name }))} value={form.primaryNurseStaffId ? String(form.primaryNurseStaffId) : ''} onChange={v => setF('primaryNurseStaffId', v)} />
            </div>
            <div style={s.formRow}><label style={s.label}>優先序</label><select style={s.input} value={form.priority} onChange={e => setF('priority', e.target.value)}>{CR_PRIORITY.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
            <div style={s.formRow}><label style={s.label}>類別</label><select style={s.input} value={form.category} onChange={e => setF('category', e.target.value)}>{CR_CATEGORY.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
            <div style={s.formRow}><label style={s.label}>提醒時間</label><input style={s.input} value={form.remindTime} onChange={e => setF('remindTime', e.target.value)} placeholder="08:30" /></div>
            <div style={s.formRow}><label style={s.label}>排序</label><input type="number" style={s.input} value={form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></div>
          </div>
          <div style={s.formRow}><label style={s.label}>提醒內容</label><input style={s.input} value={form.content} onChange={e => setF('content', e.target.value)} /></div>
          <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}><input type="checkbox" checked={form.isDone} onChange={e => setF('isDone', e.target.checked)} />已完成</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}><input type="checkbox" checked={form.isActive} onChange={e => setF('isActive', e.target.checked)} />啟用</label>
          </div>
          <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
            <button type="submit" style={s.btnPrimary}>{editId ? '儲存修改' : '+ 新增'}</button>
            {editId && <button type="button" style={s.btnSecondary} onClick={() => { setForm(emptyCareForm); setEditId(null) }}>取消</button>}
          </div>
        </form>
      </div>
      <div style={s.listCard}>
        <h4 style={s.formTitle}>照護提醒（共 {list.length} 筆）</h4>
        {list.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '14px' }}>尚無資料</p> : (
          <table style={s.table}>
            <thead><tr>{['床號', '姓名', '優先', '類別', '內容', '時間', '責任護理師', '完成', '啟用', '操作'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {list.map((i, n) => (
                <tr key={i.id} style={{ background: editId === i.id ? '#fef9c3' : n % 2 ? '#f9fafb' : '#fff' }}>
                  <td style={s.td}>{i.bedId || '—'}</td><td style={s.td}>{i.patientName || '—'}</td><td style={s.td}>{i.priority || '—'}</td>
                  <td style={s.td}>{i.category || '—'}</td><td style={s.td}>{i.content || '—'}</td><td style={s.td}>{i.remindTime || '—'}</td>
                  <td style={s.td}>{i.primaryNurseName || '—'}</td><td style={s.td}>{i.isDone ? '✓' : '—'}</td>
                  <td style={s.td}><span style={{ ...s.badge, background: i.isActive ? '#d1fae5' : '#f3f4f6', color: i.isActive ? '#065f46' : '#6b7280' }}>{i.isActive ? '✓' : '停'}</span></td>
                  <td style={s.td}><button style={s.btnEdit} onClick={() => handleEdit(i)}>編輯</button><button style={s.btnDel} onClick={() => handleDelete(i.id)}>刪除</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}


// ══════════════ 責任護理師勾床配對 ══════════════
function pmBedLabel(b) { return b.floor ? `${b.floor}F-${String(b.num).padStart(2, '0')}` : (b.label ?? b.id) }
// 本地床位主檔（免抓院方即時病床，加速讀取）
// ICU：4F 20 床＋3F 5 床
const ICU_BED_MASTER = [
  ...[1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22].map(n => ({ id: `F4-${String(n).padStart(2, '0')}`, floor: 4, num: n })),
  ...[1, 2, 3, 4, 5].map(n => ({ id: `F3-${String(n).padStart(2, '0')}`, floor: 3, num: n })),
]
// W52：41 床（床號 W52-<碼>，顯示用碼）
const W52_BED_MASTER = ['001','002','003','005','006','007','008','009','010','011','012','013','015','016','017','018','019','020','021','022','023','025','026','027','028','029','030','031','032','033','035','036','037','038','039','050','051','052','053','055','056']
  .map(c => ({ id: `W52-${c}`, label: c, floor: null }))
const UNIT_BED_MASTER = { ICU: ICU_BED_MASTER, W52: W52_BED_MASTER }

// 勾床格狀（共用）：beds 來自看板、主護現況來自 bedassign；核取→存檔設定 targetStaffId 的主護床
function BedNurseGrid({ unit, targetStaffId, date: dateProp, hideDate = false, onSaved }) {
  const [beds, setBeds] = useState([])
  const [asg, setAsg] = useState({})
  const [checked, setChecked] = useState(() => new Set())
  const [dateState, setDateState] = useState(pmToday())   // 可選日期（含未來），預設今日
  const date = dateProp ?? dateState                      // 有傳 dateProp 則受控（彈窗鎖定名單日期）
  const [msg, show] = pmMsgHook()
  const loadAll = useCallback(async () => {
    try {
      // 床位用本地來源（免抓院方即時資料，加速）
      const master = UNIT_BED_MASTER[unit]
      if (master) {
        setBeds(master)                                  // ICU/W52：靜態主檔
      } else if (unit === 'ER') {
        const er = await wardApi.getErBeds('ER', false)  // ER：自建 ErBed 主檔（本地 DB）
        setBeds((er ?? []).map(b => ({ id: b.bedId, label: b.bedId, floor: null })))
      } else {
        const board = await wardApi.getBoard(unit)       // 其餘單位才退回看板
        const arr = board?.beds ?? board?.Beds ?? []
        setBeds(arr.map(b => ({ id: b.id ?? b.BedId, floor: b.floor ?? null, num: b.num ?? null, patientName: b.patient?.name ?? b.Patient?.PatientName ?? null })))
      }
      const rows = await wardApi.getBedAssign(unit, date, '主護', true)
      const m = {}; (rows ?? []).forEach(r => { m[r.bedId] = { staffId: r.staffId, name: r.name } }); setAsg(m)
    } catch { show('讀取失敗', true) }
  }, [unit, date])
  useEffect(() => { loadAll() }, [loadAll])
  // 切換對象或重新載入時，預先核取該對象目前的床
  useEffect(() => {
    setChecked(new Set(Object.entries(asg).filter(([, v]) => String(v.staffId) === String(targetStaffId)).map(([id]) => id)))
  }, [targetStaffId, asg])
  const toggle = id => setChecked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const save = async () => {
    if (!targetStaffId) { show('請先選擇護理師', true); return }
    try { await wardApi.setBedNurse(unit, { staffId: Number(targetStaffId), workDate: date, bedIds: [...checked] }); show('已存檔'); loadAll(); onSaved?.() }
    catch { show('存檔失敗', true) }
  }
  const floors = [...new Set(beds.map(b => b.floor))].filter(f => f != null).sort((a, b) => b - a)
  const groups = floors.length ? floors.map(f => ({ key: `${f}F`, list: beds.filter(b => b.floor === f) })) : [{ key: unit, list: beds }]
  return (
    <div>
      <PmMsg msg={msg} />
      <div style={{ display: hideDate ? 'none' : 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <label style={{ ...s.label, margin: 0 }}>日期</label>
        <input type="date" style={{ ...s.input, width: '180px' }} value={date} min={pmToday()} onChange={e => setDateState(e.target.value || pmToday())} />
        {date !== pmToday() && <span style={{ fontSize: '13px', color: '#c2410c', fontWeight: 600 }}>預先配對（{date}）</span>}
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>可選未來日期先配對；看板於該日當天才生效。</span>
      </div>
      {groups.map(g => (
        <div key={g.key} style={{ marginBottom: '14px' }}>
          <div style={s.sectionSub}>{g.key}（{g.list.length} 床）</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '8px' }}>
            {g.list.map(b => {
              const cur = asg[b.id]
              const other = cur && String(cur.staffId) !== String(targetStaffId)
              return (
                <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer', background: checked.has(b.id) ? '#dcfce7' : '#fff' }}>
                  <input type="checkbox" checked={checked.has(b.id)} onChange={() => toggle(b.id)} />
                  <span style={{ fontWeight: 700, minWidth: '52px' }}>{pmBedLabel(b)}</span>
                  <span style={{ fontSize: '13px', color: '#6b7280', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.patientName || ''}</span>
                  {cur && <span style={{ fontSize: '12px', fontWeight: 600, color: other ? '#c2410c' : '#16a34a' }}>{cur.name}</span>}
                </label>
              )
            })}
          </div>
        </div>
      ))}
      <div style={{ marginTop: '10px' }}>
        <button style={{ ...s.btnPrimary, opacity: targetStaffId ? 1 : 0.5 }} onClick={save} disabled={!targetStaffId}>存檔（{checked.size} 床）</button>
        {!targetStaffId && <span style={{ marginLeft: '10px', color: '#9ca3af', fontSize: '13px' }}>請先選擇護理師</span>}
      </div>
    </div>
  )
}

// 管理員：選護理師 → 勾床（單位分頁）
function BedNurseAdminSection({ units }) {
  const [unit, setUnit] = useState(units.includes('W52') ? 'W52' : (units[0] ?? 'W52'))
  const nurses = useUnitNurses(unit)
  const [staffId, setStaffId] = useState('')
  useEffect(() => { setStaffId('') }, [unit])
  return (
    <div>
      <PmUnitTabs units={units} active={unit} onChange={setUnit} />
      <div style={s.formCard}>
        <h4 style={s.formTitle}>我的病床（{unit}）</h4>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>先選護理師，再核取其負責病床，按存檔。一床一主護（指派他人會覆蓋原本的）。</div>
        <div style={{ maxWidth: '360px', marginBottom: '14px' }}>
          <label style={s.label}>護理師</label>
          <NurseSelect options={nurses.map(n => ({ value: String(n.staffId), label: n.name }))} value={staffId} onChange={setStaffId} />
        </div>
        <BedNurseGrid unit={unit} targetStaffId={staffId} />
      </div>
    </div>
  )
}

// ── 醫師/照服員設定（ER 面板固定班別的醫師、照服員；護理師改由「三班護理師」供給）──
function ErShiftPanelSection({ unit = 'ER' } = {}) {
  const [list, setList] = useState([])
  const [msg, show] = pmMsgHook()
  const load = useCallback(async () => { try { setList((await wardApi.getErShiftPanelList(unit)) ?? []) } catch { show('讀取失敗', true) } }, [unit])
  useEffect(() => { load() }, [load])
  const setRow = (id, k, v) => setList(rows => rows.map(r => r.id === id ? { ...r, [k]: v } : r))
  const save = async (r) => {
    try {
      await wardApi.updateErShiftPanel(r.id, { unitCode: unit, shiftKey: r.shiftKey, shiftLabel: r.shiftLabel, shiftTime: r.shiftTime, doctor: r.doctor, aide: r.aide, nurseStaffIds: r.nurseStaffIds, sortOrder: r.sortOrder, isActive: r.isActive })
      show('已儲存'); load()
    } catch { show('儲存失敗', true) }
  }
  return (
    <div>
      <PmMsg msg={msg} />
      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>
        ER 病室動態右上面板的醫師 / 照服員（班別/時間固定，自由輸入；看板僅顯示<b>白班、大夜</b>的醫師與照服員）。<b>護理師改由「三班護理師」設定</b>。
      </div>
      {list.filter(r => r.shiftLabel === '大夜' || r.shiftLabel === '白班').sort((a, b) => (a.shiftLabel === '白班' ? 0 : 1) - (b.shiftLabel === '白班' ? 0 : 1)).map(r => (
        <div key={r.id} style={s.formCard}>
          <h4 style={s.formTitle}>{r.shiftLabel === '大夜' ? '夜班' : r.shiftLabel}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div style={s.formRow}><label style={s.label}>醫師</label><input style={s.input} value={r.doctor ?? ''} onChange={e => setRow(r.id, 'doctor', e.target.value)} placeholder="如 張○哲醫師" /></div>
            <div style={s.formRow}><label style={s.label}>照服員</label><input style={s.input} value={r.aide ?? ''} onChange={e => setRow(r.id, 'aide', e.target.value)} placeholder="如 周○英照服員" /></div>
          </div>
          <button style={s.btnPrimary} onClick={() => save(r)}>儲存此班</button>
        </div>
      ))}
    </div>
  )
}


// ── W52 值班表三班護理師（每日排班；點選＝順序，可日期區間疊加）──────────────
const ROSTER_SHIFTS = ['大夜', '白班', '小夜']                                       // 三站共用
const ER_EXTRA_SHIFT = '12:00–20:00'                                                 // ER 專屬第 4 班（單一字串來源）
const EMERGENCY_GROUPS = ['救護班', '滅火班', '安全防護', '避難引導', '通報班']       // 三站共用（含 ICU 的通報班）
function ShiftRosterSection({ unit = 'W52' }) {
  const shiftList = unit === 'ER' ? [...ROSTER_SHIFTS, ER_EXTRA_SHIFT] : ROSTER_SHIFTS   // ER 於小夜下方多第 4 班
  const emptySel = () => Object.fromEntries(shiftList.map(k => [k, []]))
  const [from, setFrom] = useState(pmToday())
  const [to, setTo] = useState(pmToday())
  const [sel, setSel] = useState(emptySel)   // 每班有序 staffId 陣列（＝點選順序）
  const [list, setList] = useState([])                              // 檢視日既有排班（檢視/刪除）
  const [listDate, setListDate] = useState(pmToday())              // 當前名單檢視日（昨日/今日/明日 tab，預設今日）
  const [bedCountByStaff, setBedCountByStaff] = useState({})        // staffId → 該員在 listDate 的主護床數
  const [bedModalStaff, setBedModalStaff] = useState(null)          // {staffId,name}；null＝彈窗關閉
  const [bedVer, setBedVer] = useState(0)                           // 病床配對版本（存檔後 +1 觸發面板重載）
  const [grpModalRow, setGrpModalRow] = useState(null)             // 緊急編組／點班彈窗的排班列；null＝關閉
  const [grpVer, setGrpVer] = useState(0)                           // 緊急編組版本（存檔後 +1 觸發面板重載）
  const [loading, setLoading] = useState(true)                      // 當前名單/床數載入中
  const [msg, show] = pmMsgHook()
  const nurses = useUnitNurses(unit)                              // [{staffId, name}]
  const reloadBedCounts = useCallback(async () => {
    try {
      const rows = await wardApi.getBedAssign(unit, listDate, '主護', true)
      const c = {}; (rows ?? []).forEach(r => { c[r.staffId] = (c[r.staffId] || 0) + 1 }); setBedCountByStaff(c)
    } catch { /* 忽略：計數非關鍵 */ }
  }, [unit, listDate])
  const loadList = useCallback(async () => {
    setLoading(true)
    try { setList((await wardApi.getScheduleList(unit, listDate, true)) ?? []); await reloadBedCounts() }
    catch { show('讀取失敗', true) }
    finally { setLoading(false) }
  }, [unit, listDate, reloadBedCounts])
  useEffect(() => { loadList() }, [loadList])
  const toggle = (shift, id) => setSel(sc => {
    const cur = sc[shift] || []
    return { ...sc, [shift]: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] }   // 切換；保留點擊順序
  })
  const orderOf = (shift, id) => { const i = (sel[shift] || []).indexOf(id); return i < 0 ? null : i + 1 }
  const save = async () => {
    const shifts = shiftList.map(k => ({ shift: k, staffIds: sel[k] || [] })).filter(x => x.staffIds.length)
    if (!shifts.length) { show('請先點選護理師', true); return }
    try { await wardApi.setShiftRoster(unit, { from, to, shifts }); show(`已套用到 ${from}${to !== from ? ' ~ ' + to : ''}`); setSel(emptySel()); loadList() }
    catch { show('儲存失敗', true) }
  }
  const del = async (id) => { if (!window.confirm('刪除此排班？')) return; try { await wardApi.removeSchedule(id); show('已刪除'); loadList() } catch { show('刪除失敗', true) } }
  const byShift = {}; list.filter(r => (r.role || '').includes('護理')).forEach(r => { (byShift[r.shift] = byShift[r.shift] || []).push(r) })
  return (
    <div>
      <PmMsg msg={msg} />
      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>
        對應病室動態「值班表」的三班護理師（前台固定顯示<b>今日</b>）。選日期或<b>日期區間</b>，<b>點選護理師時依點擊順序給編號</b>＝前台顯示排序；儲存為<b>疊加</b>（區間內每天加入所選、不刪原有）。個別移除用下方清單的「刪」。護理師名單來自人員管理（{unit}）。
      </div>
      <div style={s.formCard}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '10px' }}>
          <div style={s.formRow}><label style={s.label}>起始日 *</label><input type="date" style={s.input} value={from} onChange={e => { const v = e.target.value; setFrom(v); if (to < v) setTo(v) }} /></div>
          <div style={s.formRow}><label style={s.label}>結束日（區間，可＝起始日）</label><input type="date" style={s.input} value={to} min={from} onChange={e => setTo(e.target.value)} /></div>
        </div>
        {shiftList.map(k => (
          <div key={k} style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: 700, marginBottom: '5px' }}>{k}<span style={{ color: '#9ca3af', fontWeight: 400, fontSize: '12px' }}>　點選＝加入並編號，再點＝移除</span></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {nurses.length === 0 ? (loading
                ? <span style={{ color: '#9ca3af', fontSize: '13px' }}>載入中…</span>
                : <span style={{ color: '#9ca3af', fontSize: '13px' }}>此站尚無護理師（請先到人員管理設定 {unit} 護理師）</span>) :
                nurses.map(n => {
                  const ord = orderOf(k, n.staffId); const on = ord != null
                  return (
                    <button key={n.staffId} type="button" onClick={() => toggle(k, n.staffId)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '16px', cursor: 'pointer', fontSize: '13px', border: on ? '1px solid #2D7A55' : '1px solid #d1d5db', background: on ? '#E8F5EE' : '#fff', color: on ? '#065f46' : '#374151' }}>
                      {on && <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', borderRadius: '50%', background: '#2D7A55', color: '#fff', fontSize: '11px', fontWeight: 700 }}>{ord}</span>}
                      {n.name}
                    </button>
                  )
                })}
            </div>
          </div>
        ))}
        <button style={s.btnPrimary} onClick={save}>套用到{from === to ? `（${from}）` : `區間（${from} ~ ${to}）`}</button>
      </div>
      <div style={s.listCard}>
        <h4 style={s.formTitle}>近期三班護理師</h4>
        <DayTabs active={listDate} onChange={setListDate} />
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#6b7280', fontSize: '14px', padding: '10px 0' }}>
            <span style={{ width: '20px', height: '20px', border: '3px solid #d6e0ea', borderTopColor: '#2D7A55', borderRadius: '50%', animation: 'board-spin 0.9s linear infinite' }} />
            載入中…
          </div>
        ) : shiftList.map(k => {
          const rows = (byShift[k] || []).sort((a, b) => a.sortOrder - b.sortOrder)
          return (
            <div key={k} style={{ marginBottom: '8px', fontSize: '14px' }}>
              <b>{k}：</b>
              {rows.length === 0 ? <span style={{ color: '#9ca3af' }}>—</span> : rows.map(r => (
                <span key={r.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginRight: '10px' }}>
                  <span style={{ color: '#9ca3af', fontSize: '11px' }}>{r.sortOrder}.</span>
                  <button onClick={() => setGrpModalRow(r)} title="設定緊急編組／點班" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: '#1d4ed8', textDecoration: 'underline' }}>{r.name}</button>
                  {r.emergencyGroup && <span style={{ color: '#9ca3af', fontSize: '11px' }}>·{r.emergencyGroup}</span>}
                  {r.isCharge && <span style={{ color: '#b45309', fontSize: '11px' }}>·點班</span>}
                  <button onClick={() => setBedModalStaff({ staffId: r.staffId, name: r.name })} style={{ ...s.btnDel, padding: '0 6px', fontSize: '11px', marginLeft: '2px', background: '#e0f2fe', color: '#075985' }}>我的病床{bedCountByStaff[r.staffId] ? `(${bedCountByStaff[r.staffId]})` : ''}</button>
                  <button onClick={() => del(r.id)} style={{ ...s.btnDel, padding: '0 6px', fontSize: '11px' }}>刪</button>
                </span>
              ))}
            </div>
          )
        })}
      </div>
      <BedInfoPanel unit={unit} version={bedVer} />
      <EmergencyGroupPanel unit={unit} version={grpVer} />
      {bedModalStaff && (
        <div style={extEditOverlay} onClick={() => setBedModalStaff(null)}>
          <div style={extEditModal} onClick={e => e.stopPropagation()}>
            <h4 style={s.formTitle}>我的病床：{bedModalStaff.name}（{listDate}）</h4>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>核取該護理師負責病床後按「存檔」。一床一主護（指派他人會覆蓋原本的）。</div>
            <BedNurseGrid unit={unit} targetStaffId={String(bedModalStaff.staffId)} date={listDate} hideDate onSaved={() => { reloadBedCounts(); setBedVer(v => v + 1) }} />
            <div style={{ marginTop: '14px', textAlign: 'right' }}>
              <button style={s.btnSecondary} onClick={() => setBedModalStaff(null)}>關閉</button>
            </div>
          </div>
        </div>
      )}
      {grpModalRow && (
        <GroupChargeModal unit={unit} row={grpModalRow} workDate={listDate} onClose={() => setGrpModalRow(null)}
          onSaved={() => { setGrpModalRow(null); loadList(); setGrpVer(v => v + 1) }} />
      )}
    </div>
  )
}

// 緊急編組／點班彈窗：更新單筆排班的 EmergencyGroup 與 IsCharge
function GroupChargeModal({ unit, row, workDate, onClose, onSaved }) {
  const [eg, setEg] = useState(row.emergencyGroup ?? '')
  const [isCharge, setIsCharge] = useState(!!row.isCharge)
  const [msg, show] = pmMsgHook()
  const [saving, setSaving] = useState(false)
  const save = async () => {
    setSaving(true)
    try {
      await wardApi.updateSchedule(row.id, {
        staffId: row.staffId, unitCode: unit, workDate, shift: row.shift,
        emergencyGroup: eg || null, isCharge, note: row.note ?? null,
        sortOrder: row.sortOrder, isActive: true,
      })
      onSaved()
    } catch { show('存檔失敗', true); setSaving(false) }
  }
  return (
    <div style={extEditOverlay} onClick={onClose}>
      <div style={{ ...extEditModal, width: '440px' }} onClick={e => e.stopPropagation()}>
        <h4 style={s.formTitle}>緊急編組／點班：{row.name}（{workDate}）</h4>
        <PmMsg msg={msg} />
        <div style={s.formRow}>
          <label style={s.label}>緊急編組</label>
          <select style={s.input} value={eg} onChange={e => setEg(e.target.value)}>
            <option value="">（未指定）</option>
            {EMERGENCY_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer', margin: '12px 0' }}>
          <input type="checkbox" checked={isCharge} onChange={e => setIsCharge(e.target.checked)} />點班
        </label>
        <div style={{ marginTop: '10px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button style={s.btnSecondary} onClick={onClose}>取消</button>
          <button style={s.btnPrimary} onClick={save} disabled={saving}>存檔</button>
        </div>
      </div>
    </div>
  )
}

// 緊急編組：昨日/今日/明日三 tab，依組別列出護理師
// 日期 tab：昨日/今日/明日 ＋ 之後 7 天（共 10 天，offset -1~+8）；昨/今/明有標籤，其餘只顯示 MM/DD
function DayTabs({ active, onChange }) {
  return (
    <div style={{ ...s.unitTabs, marginBottom: '14px', flexWrap: 'wrap' }}>
      {[-1, 0, 1, 2, 3, 4, 5, 6, 7, 8].map(n => {
        const iso = pmDateOffset(n)
        const label = n === -1 ? '昨日' : n === 0 ? '今日' : n === 1 ? '明日' : ''
        return (
          <button key={iso} style={{ ...s.unitTab, ...(active === iso ? s.unitTabActive : {}) }} onClick={() => onChange(iso)}>
            {label ? `${label}（${pmMD(iso)}）` : pmMD(iso)}
          </button>
        )
      })}
    </div>
  )
}

function EmergencyGroupPanel({ unit, version = 0 }) {
  const [active, setActive] = useState(pmDateOffset(0))
  const [rows, setRows] = useState([])
  const [msg, show] = pmMsgHook()
  const load = useCallback(async () => {
    try { setRows(((await wardApi.getScheduleList(unit, active, true)) ?? []).filter(r => r.emergencyGroup)) }
    catch { show('讀取失敗', true) }
  }, [unit, active, version])
  useEffect(() => { load() }, [load])
  const byGroup = {}; rows.forEach(r => { (byGroup[r.emergencyGroup] = byGroup[r.emergencyGroup] || []).push(r) })
  const has = EMERGENCY_GROUPS.some(g => (byGroup[g] || []).length)
  return (
    <div style={{ ...s.listCard, marginTop: '16px' }}>
      <PmMsg msg={msg} />
      <h4 style={s.formTitle}>緊急編組</h4>
      <DayTabs active={active} onChange={setActive} />
      {!has
        ? <div style={{ color: '#9ca3af', fontSize: '14px' }}>（該日尚無編組）</div>
        : EMERGENCY_GROUPS.map(g => {
          const list = byGroup[g] || []
          return (
            <div key={g} style={{ marginBottom: '8px', fontSize: '14px' }}>
              <b style={{ color: '#075985' }}>{g}：</b>
              {list.length === 0 ? <span style={{ color: '#9ca3af' }}>—</span> : list.map((r, i) => (
                <span key={r.id} style={{ marginRight: '8px' }}>{r.name}{r.isCharge && <span style={{ color: '#b45309', fontSize: '11px' }}>（點班）</span>}{i < list.length - 1 ? '、' : ''}</span>
              ))}
            </div>
          )
        })}
    </div>
  )
}

// 病床資訊：昨日/今日/明日三 tab，只列有配到主護護理師的病床
function BedInfoPanel({ unit, version = 0 }) {
  const [active, setActive] = useState(pmDateOffset(0))
  const [rows, setRows] = useState([])
  const [msg, show] = pmMsgHook()
  const load = useCallback(async () => {
    try {
      const r = (await wardApi.getBedAssign(unit, active, '主護', true)) ?? []
      setRows(r.slice().sort((a, b) => String(a.bedId).localeCompare(String(b.bedId))))
    } catch { show('讀取失敗', true) }
  }, [unit, active, version])
  useEffect(() => { load() }, [load])
  return (
    <div style={{ ...s.listCard, marginTop: '16px' }}>
      <PmMsg msg={msg} />
      <h4 style={s.formTitle}>病床資訊</h4>
      <DayTabs active={active} onChange={setActive} />
      {rows.length === 0
        ? <div style={{ color: '#9ca3af', fontSize: '14px' }}>（該日無配床）</div>
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: '8px' }}>
            {rows.map(r => (
              <div key={r.id ?? r.bedId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px' }}>
                <span style={{ fontWeight: 700, minWidth: '46px', color: '#075985' }}>{String(r.bedId).replace(new RegExp('^' + unit + '-'), '')}</span>
                <span>{r.name}</span>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}

// ══════════════ 全院共用主檔：醫師 / 科別（系統管理）══════════════
// 先建科別、再建醫師（醫師的科別是從已建科別下拉挑）。四站共維。
const emptyDeptForm = { code: '', name: '', sortOrder: 0, isActive: true }
function DepartmentSection({ onChanged }) {
  const { list, form, setField: setF, editId, msg, handleSubmit, handleEdit, handleDelete, resetForm } = useCrudSection({
    emptyForm: emptyDeptForm,
    fetchList: () => wardApi.getDepartments(true),
    create: async (p) => { const r = await wardApi.createDepartment(p); onChanged?.(); return r },
    update: async (id, p) => { const r = await wardApi.updateDepartment(id, p); onChanged?.(); return r },
    remove: async (id) => { const r = await wardApi.removeDepartment(id); onChanged?.(); return r },
    toPayload: (f) => ({ code: f.code.trim(), name: f.name.trim(), sortOrder: Number(f.sortOrder) || 0, isActive: f.isActive }),
    toForm: (i) => ({ code: i.code, name: i.name, sortOrder: i.sortOrder, isActive: i.isActive }),
    failMsg: '操作失敗（科別代碼是否重複？）',
  })
  return (
    <div>
      {msg.text && <div style={{ ...s.msg, background: msg.error ? '#fee2e2' : '#d1fae5', color: msg.error ? '#991b1b' : '#065f46' }}>{msg.text}</div>}
      <div style={s.formCard}>
        <h4 style={s.formTitle}>{editId ? `修改科別 (ID: ${editId})` : '新增科別'}</h4>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '0 16px' }}>
            <div style={s.formRow}><label style={s.label}>科別代碼 *</label><input style={s.input} value={form.code} required onChange={e => setF('code', e.target.value)} placeholder="GS" /></div>
            <div style={s.formRow}><label style={s.label}>科別中文 *</label><input style={s.input} value={form.name} required onChange={e => setF('name', e.target.value)} placeholder="一般外科" /></div>
            <div style={s.formRow}><label style={s.label}>排序</label><input type="number" style={s.input} value={form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer', marginTop: '4px' }}>
            <input type="checkbox" checked={form.isActive} onChange={e => setF('isActive', e.target.checked)} />啟用
          </label>
          <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
            <button type="submit" style={s.btnPrimary}>{editId ? '儲存修改' : '+ 新增科別'}</button>
            {editId && <button type="button" style={s.btnSecondary} onClick={resetForm}>取消</button>}
          </div>
        </form>
      </div>
      <div style={s.formCard}>
        <h4 style={s.formTitle}>科別清單（共 {list.length} 筆）</h4>
        {list.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '14px' }}>尚無科別，請先新增</p> : (
          <table style={s.table}>
            <thead><tr>{['排序', '代碼', '中文', '啟用', '操作'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>{list.map((it, i) => (
              <tr key={it.id} style={{ background: editId === it.id ? '#fef9c3' : i % 2 ? '#f9fafb' : '#fff' }}>
                <td style={s.td}>{it.sortOrder}</td><td style={s.td}>{it.code}</td><td style={s.td}>{it.name}</td>
                <td style={s.td}><span style={{ ...s.badge, background: it.isActive ? '#d1fae5' : '#f3f4f6', color: it.isActive ? '#065f46' : '#6b7280' }}>{it.isActive ? '✓ 啟用' : '停用'}</span></td>
                <td style={s.td}><button style={s.btnEdit} onClick={() => handleEdit(it)}>編輯</button><button style={s.btnDel} onClick={() => handleDelete(it.id, `確定刪除科別「${it.name}」？`)}>刪除</button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const emptyDoctorForm = { employeeNo: '', name: '', deptCode: '', ext: '', sortOrder: 0, isActive: true }
function DoctorSection({ departments }) {
  const noDept = (departments?.length ?? 0) === 0
  const deptName = (code) => departments?.find(d => d.code === code)?.name || code || '—'
  const { list, form, setField: setF, editId, msg, handleSubmit, handleEdit, handleDelete, resetForm } = useCrudSection({
    emptyForm: emptyDoctorForm,
    fetchList: () => wardApi.getDoctors(null, true),
    create: (p) => wardApi.createDoctor(p),
    update: (id, p) => wardApi.updateDoctor(id, p),
    remove: (id) => wardApi.removeDoctor(id),
    toPayload: (f) => ({ employeeNo: f.employeeNo.trim(), name: f.name.trim(), deptCode: f.deptCode || null, ext: f.ext?.trim() || null, sortOrder: Number(f.sortOrder) || 0, isActive: f.isActive }),
    toForm: (i) => ({ employeeNo: i.employeeNo, name: i.name, deptCode: i.deptCode ?? '', ext: i.ext ?? '', sortOrder: i.sortOrder, isActive: i.isActive }),
    failMsg: '操作失敗（員編是否重複？）',
  })
  return (
    <div>
      {msg.text && <div style={{ ...s.msg, background: msg.error ? '#fee2e2' : '#d1fae5', color: msg.error ? '#991b1b' : '#065f46' }}>{msg.text}</div>}
      <div style={s.formCard}>
        <h4 style={s.formTitle}>{editId ? `修改醫師 (ID: ${editId})` : '新增醫師'}</h4>
        {noDept ? <p style={{ color: '#b45309', fontSize: '14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '8px 12px' }}>請先於上方建立科別，才能新增醫師。</p> : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
              <div style={s.formRow}><label style={s.label}>員編 *</label><input style={s.input} value={form.employeeNo} required onChange={e => setF('employeeNo', e.target.value)} placeholder="MB76" /></div>
              <div style={s.formRow}><label style={s.label}>姓名 *</label><input style={s.input} value={form.name} required onChange={e => setF('name', e.target.value)} placeholder="王大明" /></div>
              <div style={s.formRow}><label style={s.label}>科別 *</label>
                <select style={s.input} value={form.deptCode} required onChange={e => setF('deptCode', e.target.value)}>
                  <option value="">— 選擇科別 —</option>
                  {departments.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                </select>
              </div>
              <div style={s.formRow}><label style={s.label}>分機</label><input style={s.input} value={form.ext} onChange={e => setF('ext', e.target.value)} placeholder="4204" /></div>
              <div style={s.formRow}><label style={s.label}>排序</label><input type="number" style={s.input} value={form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer', marginTop: '4px' }}>
              <input type="checkbox" checked={form.isActive} onChange={e => setF('isActive', e.target.checked)} />啟用
            </label>
            <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
              <button type="submit" style={s.btnPrimary}>{editId ? '儲存修改' : '+ 新增醫師'}</button>
              {editId && <button type="button" style={s.btnSecondary} onClick={resetForm}>取消</button>}
            </div>
          </form>
        )}
      </div>
      <div style={s.formCard}>
        <h4 style={s.formTitle}>醫師總表（共 {list.length} 筆）</h4>
        {list.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '14px' }}>尚無醫師，請新增</p> : (
          <table style={s.table}>
            <thead><tr>{['排序', '員編', '姓名', '科別', '分機', '啟用', '操作'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>{list.map((it, i) => (
              <tr key={it.id} style={{ background: editId === it.id ? '#fef9c3' : i % 2 ? '#f9fafb' : '#fff' }}>
                <td style={s.td}>{it.sortOrder}</td><td style={s.td}>{it.employeeNo}</td><td style={s.td}>{it.name}</td>
                <td style={s.td}>{it.deptName || deptName(it.deptCode)}</td><td style={s.td}>{it.ext || '—'}</td>
                <td style={s.td}><span style={{ ...s.badge, background: it.isActive ? '#d1fae5' : '#f3f4f6', color: it.isActive ? '#065f46' : '#6b7280' }}>{it.isActive ? '✓ 啟用' : '停用'}</span></td>
                <td style={s.td}><button style={s.btnEdit} onClick={() => handleEdit(it)}>編輯</button><button style={s.btnDel} onClick={() => handleDelete(it.id, `確定刪除醫師「${it.name}」？`)}>刪除</button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// 拆為兩個選單：先「科別」、後「醫師」。醫師頁載入時取科別供下拉。
function DepartmentManager() {
  return (
    <div>
      <div style={s.sectionSub}>全院共用科別清單。醫師需先有科別才能建立。</div>
      <DepartmentSection />
    </div>
  )
}
function DoctorManager() {
  const [depts, setDepts] = useState([])
  useEffect(() => { wardApi.getDepartments(true).then(d => setDepts(d ?? [])).catch(() => {}) }, [])
  return (
    <div>
      <div style={s.sectionSub}>全院共用醫師總表。科別請於左側「科別」選單維護。</div>
      <DoctorSection departments={depts} />
    </div>
  )
}

// ── 操作稽核（系統管理；唯讀查詢）────────────────────────────
// 資料異動記錄由後端全域 OperationAuditFilter 自動寫入（所有 POST/PUT/DELETE）；
// 此處僅查詢：日期區間＋員編篩選、分頁。查詢端點限系統管理員（後端 Roles=Admin）。
function OperationAuditSection() {
  const PAGE_SIZE = 50
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [from, setFrom] = useState('')     // 起日（含）
  const [to, setTo] = useState('')         // 迄日（含；送出時 +1 天換成排除上界）
  const [empNo, setEmpNo] = useState('')
  const [msg, setMsg] = useState('')

  // 迄日 +1 天 → 後端的排除上界（CreatedAt < to）
  const toExclusive = (d) => {
    if (!d) return ''
    const t = new Date(d); t.setDate(t.getDate() + 1)
    return t.toISOString().slice(0, 10)
  }

  const load = useCallback(async (p = 1) => {
    try {
      const r = await auditApi.getOperations({ from, to: toExclusive(to), empNo: empNo.trim(), page: p, pageSize: PAGE_SIZE })
      setRows(r?.rows ?? []); setTotal(r?.total ?? 0); setPage(p); setMsg('')
    } catch { setMsg('讀取失敗（僅系統管理員可查詢）') }
  }, [from, to, empNo])

  useEffect(() => { load(1) }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const fmtTime = (t) => (t ?? '').replace('T', ' ')
  const methodBadge = (m) => ({
    POST:   { background: '#dcfce7', color: '#166534' },
    PUT:    { background: '#dbeafe', color: '#1e40af' },
    DELETE: { background: '#fee2e2', color: '#991b1b' },
  }[m] ?? { background: '#f3f4f6', color: '#374151' })

  return (
    <div>
      <div style={s.formCard}>
        <h3 style={s.formTitle}>操作稽核查詢</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={s.label}>起日</label>
            <input style={s.input} type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label style={s.label}>迄日（含當天）</label>
            <input style={s.input} type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div>
            <label style={s.label}>員編</label>
            <input style={s.input} placeholder="全部" value={empNo} onChange={e => setEmpNo(e.target.value)} />
          </div>
          <button style={s.btnPrimary} onClick={() => load(1)}>查詢</button>
        </div>
      </div>

      {msg && <div style={{ ...s.msg, background: '#fee2e2', color: '#991b1b' }}>{msg}</div>}

      <div style={s.listCard}>
        <h3 style={s.formTitle}>異動記錄（共 {total} 筆）</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={s.table}>
            <thead><tr>
              <th style={s.th}>時間</th><th style={s.th}>員編</th><th style={s.th}>姓名</th>
              <th style={s.th}>動作</th><th style={s.th}>端點</th><th style={s.th}>結果</th><th style={s.th}>IP</th><th style={s.th}>內容</th>
            </tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td style={{ ...s.td, whiteSpace: 'nowrap' }}>{fmtTime(r.createdAt)}</td>
                  <td style={s.td}>{r.employeeNo}</td>
                  <td style={s.td}>{r.name}</td>
                  <td style={s.td}><span style={{ ...s.badge, cursor: 'default', ...methodBadge(r.method) }}>{r.method}</span></td>
                  <td style={{ ...s.td, fontFamily: 'monospace', fontSize: '13px' }}>{r.path}</td>
                  <td style={s.td}>{r.statusCode}</td>
                  <td style={s.td}>{r.ip}</td>
                  <td style={{ ...s.td, maxWidth: '360px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px', color: '#6b7280' }}
                      title={r.body ?? ''}>{r.body}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td style={s.td} colSpan={8}>（無記錄）</td></tr>}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '14px' }}>
            <button style={s.btnSecondary} disabled={page <= 1} onClick={() => load(page - 1)}>上一頁</button>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>{page} / {pages}</span>
            <button style={s.btnSecondary} disabled={page >= pages} onClick={() => load(page + 1)}>下一頁</button>
          </div>
        )}
      </div>
    </div>
  )
}

// 佔位元件（Phase 2/3 預留）
function ComingSoon({ label }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: '#9ca3af' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔧</div>
      <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: '14px' }}>此功能正在開發中，敬請期待</div>
    </div>
  )
}

// ── 左側 Sidebar ─────────────────────────────────────────────
// 依 MENU_CONFIG 渲染可展開分組；selectedMenu 為目前選中的 leaf id，
// onSelect 通知父層切換內容區。expanded 記錄哪些分組為展開狀態。
function Sidebar({ selectedMenu, onSelect, units = [], isAdmin = false }) {
  const [expanded, setExpanded] = useState(new Set(['announcement']))

  // 切換某分組的展開/收合
  const toggle = id => setExpanded(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  // 通用群組（無 unit）恆顯示；站別群組（有 unit）依角色可管理單位過濾
  const groups = MENU_CONFIG.filter(g => (!g.unit || units.includes(g.unit)) && (!g.adminOnly || isAdmin))

  return (
    <nav style={s.sidebar}>
      {groups.map(group => (
        <div key={group.id} style={s.menuGroup}>
          {/* Group header */}
          <button style={s.menuGroupBtn} onClick={() => toggle(group.id)}>
            <span style={s.menuGroupArrow}>{expanded.has(group.id) ? '▼' : '▶'}</span>
            <span>{group.label}</span>
          </button>
          {/* Children */}
          {expanded.has(group.id) && (
            <div style={s.menuChildren}>
              {group.children.map((item, idx) => {
                const isLast     = idx === group.children.length - 1
                const isSelected = selectedMenu === item.id
                return (
                  <button
                    key={item.id}
                    disabled={!item.available}
                    onClick={() => item.available && onSelect(item.id)}
                    style={{
                      ...s.menuItem,
                      ...(isSelected ? s.menuItemActive : {}),
                      ...(!item.available ? s.menuItemDisabled : {}),
                    }}
                  >
                    <span style={s.menuItemPrefix}>{isLast ? '└' : '├'}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {isSelected && <span style={s.menuItemDot}>●</span>}
                    {!item.available && <span style={s.comingSoonTag}>預計</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </nav>
  )
}

// ── AdminPage ────────────────────────────────────────────────
// 後台主元件：組合上方導覽列、左側 Sidebar 與右側內容區。
// 可管理的單位(units) 由登入身份(roleInfo.unitCodes) 決定。
export default function AdminPage() {
  const { role, roleInfo, logout, isAdmin } = useAuth()  // 登入角色（5 固定帳號）與登出方法
  const navigate = useNavigate()
  const units = roleInfo?.unitCodes ?? []           // 此帳號可管理的單位清單
  const [selectedMenu, setSelectedMenu] = useState(DEFAULT_MENU)  // 目前選中的選單 leaf

  // 登出後導回登入頁
  const handleLogout = () => { logout(); navigate('/login') }

  // 取得目前選中的 label（顯示麵包屑）
  const currentLabel = MENU_CONFIG
    .flatMap(g => g.children.map(c => ({ ...c, group: g.label })))
    .find(c => c.id === selectedMenu)

  // 依 selectedMenu 渲染對應 Manager
  const renderContent = () => {
    switch (selectedMenu) {
      case 'marquee':        return <MarqueeManager units={units} />
      case 'bulletin':       return <BulletinManager units={units} />
      case 'duty-contact':   return <DutyManager units={units} />
      case 'common-contact': return <CommonManager units={units} />
      case 'evac-image':     return <EvacManager units={units} />
      // 站別：頁首單位資訊（各站固定 unitCode）
      case 'w52-acct':       return <StaffSection key="W52acct" unitCode="W52" />
      case 'icu-acct':       return <StaffSection key="ICUacct" unitCode="ICU" />
      case 'or-acct':        return <StaffSection key="ORacct" unitCode="OR" />
      case 'er-acct':        return <StaffSection key="ERacct" unitCode="ER" />
      case 'w52-info':       return <UnitInfoSection key="W52i" unitCode="W52" />
      case 'icu-info':       return <UnitInfoSection key="ICUi" unitCode="ICU" />
      case 'or-info':        return <UnitInfoSection key="ORi"  unitCode="OR" />
      case 'er-info':        return <UnitInfoSection key="ERi"  unitCode="ER" />
      // 站別：病人臨床補充（各站固定 unitCode，直接渲染 Section）
      case 'w52-care':       return <CareReminderSection key="W52care" />
      case 'w52-exam':       return <ExamConsultSection key="W52e" unitCode="W52" />
      case 'icu-exam':       return <ExamConsultSection key="ICUe" unitCode="ICU" />
      case 'icu-abx':        return <AntibioticSection key="ICUabx" />
      case 'er-exam':        return <ExamConsultSection key="ERe"  unitCode="ER" />
      case 'w52-ext':        return <WardExtSection key="W52" unitCode="W52" />
      case 'icu-ext':        return <WardExtSection key="ICU" unitCode="ICU" />
      case 'or-ext':         return <WardExtSection key="OR"  unitCode="OR" />
      case 'er-ext':         return <WardExtSection key="ER"  unitCode="ER" />
      case 'er-oncall-roster': return <OnCallScheduleSection />
      case 'er-shift':       return <ErShiftPanelSection key="ERshift" />
      case 'w52-shift':      return <ShiftRosterSection unit="W52" key="W52roster" />
      case 'icu-shift':      return <ShiftRosterSection unit="ICU" key="ICUroster" />
      case 'er-shift-roster':return <ShiftRosterSection unit="ER" key="ERroster" />
      case 'or-schedule':    return <OrScheduleManager />
      case 'or-scrub':       return <OrScrubCircSection />
      case 'or-handover':    return <OrHandoverManager />
      // 人員管理（跨單位）
      case 'staff':          return <StaffSection />
      case 'department':     return <DepartmentManager />
      case 'doctor':         return <DoctorManager />
      case 'audit':          return <OperationAuditSection />
      case 'bed-nurse':      return <BedNurseAdminSection units={units} />
      case 'schedule':       return <ScheduleSection units={units} />
      case 'round':          return <RoundSection units={['W52']} />       // W52 專屬
      case 'handover':       return <HandoverSection units={units} />
      default:               return null
    }
  }

  return (
    <div style={s.page}>
      {/* ── Top navbar ── */}
      <header style={s.nav}>
        <div style={s.navLeft}>
          <span style={s.navLogo}>🏥</span>
          <span style={s.navTitle}>護理白板 管理後台</span>
        </div>
        <div style={s.navRight}>
          <span style={s.roleBadge}>{roleInfo?.label ?? role}</span>
          <button style={s.logoutBtn} onClick={handleLogout}>登出</button>
        </div>
      </header>

      {/* ── Body（Sidebar + Content）── */}
      <div style={s.body}>
        <Sidebar selectedMenu={selectedMenu} onSelect={setSelectedMenu} units={units} isAdmin={isAdmin} />

        <main style={s.content}>
          {/* 麵包屑 */}
          {currentLabel && (
            <div style={s.breadcrumb}>
              {currentLabel.group} <span style={{ margin: '0 6px', color: '#cbd5e1' }}>›</span> {currentLabel.label}
            </div>
          )}
          {renderContent()}
        </main>
      </div>
    </div>
  )
}

/* ── Styles ────────────────────────────────────────────────── */
const s = {
  // 整體
  page:   { minHeight: '100vh', background: '#f4f6f9', fontFamily: '"Microsoft JhengHei","Segoe UI",sans-serif', display: 'flex', flexDirection: 'column' },
  // Navbar
  nav:     { background: '#1a2332', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', flexShrink: 0 },
  navLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  navLogo: { fontSize: '22px' },
  navTitle:{ color: '#e2e8f0', fontSize: '17px', fontWeight: '700' },
  navRight:{ display: 'flex', alignItems: 'center', gap: '12px' },
  roleBadge: { background: '#2D7A55', color: '#fff', padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: '600' },
  logoutBtn: { background: 'transparent', border: '1px solid #4a5568', color: '#a0aec0', padding: '5px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' },
  // Body
  body:    { display: 'flex', flex: 1, minHeight: 0 },
  // Sidebar
  sidebar: { width: '230px', background: '#1e293b', flexShrink: 0, padding: '16px 0', overflowY: 'auto', minHeight: 'calc(100vh - 56px)' },
  menuGroup: { marginBottom: '4px' },
  menuGroupBtn: { width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'transparent', border: 'none', color: '#cbd5e1', fontSize: '15px', fontWeight: '800', letterSpacing: '0.5px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' },
  menuGroupArrow: { fontSize: '10px', width: '12px', flexShrink: 0 },
  menuChildren: { paddingLeft: '4px' },
  menuItem: { width: '100%', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px 8px 24px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', borderLeft: '3px solid transparent', transition: 'all .12s' },
  menuItemActive: { color: '#fff', background: 'rgba(45,122,85,0.3)', borderLeftColor: '#2D7A55' },
  menuItemDisabled: { opacity: 0.45, cursor: 'default' },
  menuItemPrefix: { fontFamily: 'monospace', fontSize: '13px', color: '#4b5563', flexShrink: 0 },
  menuItemDot: { color: '#2D7A55', fontSize: '10px' },
  comingSoonTag: { fontSize: '10px', background: '#334155', color: '#64748b', padding: '1px 5px', borderRadius: '3px' },
  // Content
  content:   { flex: 1, padding: '28px 32px 60px', overflowY: 'auto', minWidth: 0 },
  breadcrumb:{ fontSize: '13px', color: '#64748b', marginBottom: '20px', display: 'flex', alignItems: 'center' },
  // 單位 tab（在各 Manager 內使用）
  unitTabs: { display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '2px solid #e5e7eb', paddingBottom: '0' },
  unitTab:  { padding: '10px 20px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '15px', fontWeight: '600', color: '#6b7280', borderRadius: '6px 6px 0 0', fontFamily: 'inherit', borderBottom: '2px solid transparent', marginBottom: '-2px' },
  unitTabActive: { color: '#2D7A55', borderBottom: '2px solid #2D7A55', background: '#f0fdf4' },   // 用 shorthand 與 unitTab 一致，避免 React 停用時殘留黑色底線
  // Form / List
  msg:      { padding: '10px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' },
  formCard: { background: '#fff', borderRadius: '10px', padding: '20px 24px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  listCard: { background: '#fff', borderRadius: '10px', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  formTitle:{ margin: '0 0 16px', fontSize: '15px', color: '#374151', fontWeight: '700' },
  formRow:  { marginBottom: '12px' },
  label:    { display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '4px', fontWeight: '500' },
  input:    { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' },
  btnPrimary:  { padding: '9px 20px', background: '#2D7A55', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' },
  btnSecondary:{ padding: '9px 20px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' },
  table:    { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th:       { padding: '10px 12px', background: '#2D7A55', color: '#fff', textAlign: 'left', fontWeight: '600' },
  td:       { padding: '9px 12px', borderBottom: '1px solid #e5e7eb', verticalAlign: 'middle' },
  badge:    { padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', border: 'none', cursor: 'pointer' },
  btnEdit:  { padding: '4px 12px', background: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', marginRight: '4px', fontFamily: 'inherit' },
  btnDel:   { padding: '4px 12px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' },
  sectionSub: { fontSize: '14px', fontWeight: '700', color: '#374151', margin: '0 0 12px', paddingLeft: '10px', borderLeft: '3px solid #2D7A55' },
}
