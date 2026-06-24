// AdminPage.jsx — 護理白板管理後台主頁（需登入，受路由保護）
// 角色：單一頁面整合所有後台維護功能，左側 Sidebar 選單切換不同管理區塊：
//   ・公告管理：跑馬燈(MarqueeManager) / 佈告欄(BulletinManager)
//   ・連絡資訊：值班人員(DutyManager) / 常用電話(CommonManager)
//   ・避難圖：圖片＋設備清單＋緊急聯絡(EvacManager)
// 每個 Manager 內含「單位切換 tab」（依登入身份可管理的 unitCodes 動態產生），
// 各 Section 為單一單位的 CRUD 表單＋清單，透過對應的 *Api 服務存取後端。
// 多數 Section 共用模式：list/form/editId/msg 四個 state，load() 讀取資料，
// useEffect 依 unitCode 變動重新載入，handleSubmit/Edit/Delete/Toggle 處理增改刪與啟用切換。
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import * as marqueeApi from '../services/marqueeApi'
import * as textApi from '../services/textApi'
import * as contactApi from '../services/contactApi'
import * as evacuationApi from '../services/evacuationApi'
import * as wardApi from '../services/wardApi'

// 單位代碼 → 顯示名稱對照（用於各 Manager 的單位切換 tab）
const UNIT_LABELS = { W52: 'W52 病房', ICU: 'ICU 加護', OR: 'OR 手術室', ER: 'ER 急診室' }

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
  // ── 站別管理分類（依角色 unitCodes 過濾顯示；站別專屬功能歸入對應站）──
  {
    id: 'w52-admin', label: 'W52 管理', unit: 'W52',
    children: [
      { id: 'w52-info', label: '頁首設定', available: true },
      { id: 'w52-ext',  label: '病人臨床補充', available: true },
      { id: 'w52-exam', label: '檢查/會診', available: true },
    ]
  },
  {
    id: 'icu-admin', label: 'ICU 管理', unit: 'ICU',
    children: [
      { id: 'icu-info', label: '頁首設定', available: true },
      { id: 'icu-ext',  label: '病人臨床補充', available: true },  // 3F/4F 不分（以病歷號為鍵）
      { id: 'icu-exam', label: '檢查/會診', available: true },
      { id: 'icu-abx',  label: '抗生素', available: true },        // 以病歷號掛載（自建）
    ]
  },
  {
    id: 'or-admin', label: 'OR 管理', unit: 'OR',
    children: [
      { id: 'or-info',     label: '頁首設定', available: true },
      { id: 'or-ext',      label: '病人臨床補充', available: true },  // 手術狀態/刷手/流動 overlay
      { id: 'or-schedule', label: 'OR 手術派班', available: true },
      { id: 'or-handover', label: 'OR 特殊交班', available: true },
    ]
  },
  {
    id: 'er-admin', label: 'ER 管理', unit: 'ER',
    children: [
      { id: 'er-info',   label: '頁首設定', available: true },
      { id: 'er-ext',    label: '病人臨床補充', available: true },
      { id: 'er-exam',   label: '檢查/會診', available: true },
      { id: 'er-oncall', label: '各科值班醫師', available: true },
    ]
  },
]

// 第一個可用的 leaf id
const DEFAULT_MENU = 'marquee'

// ── 跑馬燈管理 ─────────────────────────────────────────────
const emptyForm = { title: '', content: '', sortOrder: 0, isActive: true }

// 單一單位的跑馬燈 CRUD：表單新增/編輯 + 清單顯示，呼叫 marqueeApi
function MarqueeTab({ unitCode }) {
  const [list, setList]   = useState([])          // 清單資料
  const [form, setForm]   = useState(emptyForm)    // 新增/編輯表單欄位
  const [editId, setEditId] = useState(null)       // null=新增模式，有值=編輯該 id
  const [msg, setMsg]     = useState({ text: '', error: false })  // 操作提示訊息

  // 顯示提示訊息，3 秒後自動清除
  const showMsg = (text, error = false) => {
    setMsg({ text, error })
    setTimeout(() => setMsg({ text: '', error: false }), 3000)
  }

  // 讀取此單位的跑馬燈清單（unitCode 改變時 callback 會重建）
  const load = useCallback(async () => {
    try   { setList((await marqueeApi.getAll(unitCode)) ?? []) }
    catch { showMsg('讀取失敗', true) }
  }, [unitCode])

  // 載入 / 切換單位時重新取得資料
  useEffect(() => { load() }, [load])

  // 送出表單：有 editId 走更新，否則新增；成功後清空表單並重新載入
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editId) {
        await marqueeApi.update(editId, { ...form, unitCode, category: 'marquee' })
        showMsg('修改成功')
      } else {
        await marqueeApi.create(unitCode, form)
        showMsg('新增成功')
      }
      setForm(emptyForm); setEditId(null); load()
    } catch { showMsg('操作失敗', true) }
  }

  // 將清單某筆帶入表單進入編輯模式
  const handleEdit   = item  => { setEditId(item.id); setForm({ title: item.title ?? '', content: item.content, sortOrder: item.sortOrder, isActive: item.isActive }) }
  // 刪除（先二次確認）
  const handleDelete = async id => {
    if (!window.confirm('確定刪除？')) return
    try { await marqueeApi.remove(id); showMsg('刪除成功'); load() }
    catch { showMsg('刪除失敗', true) }
  }
  // 切換啟用/停用狀態
  const handleToggle = async item => {
    try { await marqueeApi.update(item.id, { ...item, isActive: !item.isActive, unitCode, category: 'marquee' }); load() }
    catch { showMsg('操作失敗', true) }
  }

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
            {editId && <button type="button" style={s.btnSecondary} onClick={() => { setForm(emptyForm); setEditId(null) }}>取消</button>}
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
      <div style={s.unitTabs}>
        {units.map(u => (
          <button key={u} style={{ ...s.unitTab, ...(activeUnit === u ? s.unitTabActive : {}) }}
            onClick={() => setActiveUnit(u)}>
            {UNIT_LABELS[u]}
          </button>
        ))}
      </div>
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
  const [list, setList]     = useState([])
  const [form, setForm]     = useState(emptyDutyForm)
  const [editId, setEditId] = useState(null)
  const [msg, setMsg]       = useState({ text: '', error: false })

  const showMsg = (text, error = false) => { setMsg({ text, error }); setTimeout(() => setMsg({ text: '', error: false }), 3000) }
  const load = useCallback(async () => {
    try   { setList((await contactApi.getDuty(unitCode, true)) ?? []) }
    catch { showMsg('讀取失敗', true) }
  }, [unitCode])
  useEffect(() => { load() }, [load])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { unitCode, ...form, shiftType: form.shiftType || null }
    try {
      if (editId) { await contactApi.updateDuty(editId, payload); showMsg('修改成功') }
      else        { await contactApi.createDuty(payload); showMsg('新增成功') }
      setForm(emptyDutyForm); setEditId(null); load()
    } catch { showMsg('操作失敗', true) }
  }
  const handleEdit   = item => { setEditId(item.id); setForm({ dutyTitle: item.dutyTitle, name: item.name, shiftType: item.shiftType ?? '', timeSlot: item.timeSlot ?? '', extension: item.extension ?? '', mobile: item.mobile ?? '', sortOrder: item.sortOrder, isActive: item.isActive }) }
  const handleDelete = async id => { if (!window.confirm('確定刪除？')) return; try { await contactApi.removeDuty(id); showMsg('刪除成功'); load() } catch { showMsg('刪除失敗', true) } }
  const handleToggle = async item => { try { await contactApi.updateDuty(item.id, { unitCode, dutyTitle: item.dutyTitle, name: item.name, shiftType: item.shiftType, timeSlot: item.timeSlot, extension: item.extension, mobile: item.mobile, sortOrder: item.sortOrder, isActive: !item.isActive }); load() } catch { showMsg('操作失敗', true) } }

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
            {editId && <button type="button" style={s.btnSecondary} onClick={() => { setForm(emptyDutyForm); setEditId(null) }}>取消</button>}
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
      <div style={s.unitTabs}>
        {units.map(u => <button key={u} style={{ ...s.unitTab, ...(activeUnit === u ? s.unitTabActive : {}) }} onClick={() => setActiveUnit(u)}>{UNIT_LABELS[u]}</button>)}
      </div>
      <DutySection key={activeUnit} unitCode={activeUnit} />
    </div>
  )
}

// 單一單位的常用電話 CRUD（讀取時 includeAll=true）
function CommonSection({ unitCode }) {
  const [list, setList]     = useState([])
  const [form, setForm]     = useState(emptyCommonForm)
  const [editId, setEditId] = useState(null)
  const [msg, setMsg]       = useState({ text: '', error: false })

  const showMsg = (text, error = false) => { setMsg({ text, error }); setTimeout(() => setMsg({ text: '', error: false }), 3000) }
  const load = useCallback(async () => {
    try   { setList((await contactApi.getCommon(unitCode, true)) ?? []) }
    catch { showMsg('讀取失敗', true) }
  }, [unitCode])
  useEffect(() => { load() }, [load])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { unitCode, ...form }
    try {
      if (editId) { await contactApi.updateCommon(editId, payload); showMsg('修改成功') }
      else        { await contactApi.createCommon(payload); showMsg('新增成功') }
      setForm(emptyCommonForm); setEditId(null); load()
    } catch { showMsg('操作失敗', true) }
  }
  const handleEdit   = item => { setEditId(item.id); setForm({ name: item.name, extension: item.extension, sortOrder: item.sortOrder, isActive: item.isActive }) }
  const handleDelete = async id => { if (!window.confirm('確定刪除？')) return; try { await contactApi.removeCommon(id); showMsg('刪除成功'); load() } catch { showMsg('刪除失敗', true) } }
  const handleToggle = async item => { try { await contactApi.updateCommon(item.id, { unitCode, name: item.name, extension: item.extension, sortOrder: item.sortOrder, isActive: !item.isActive }); load() } catch { showMsg('操作失敗', true) } }

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
            {editId && <button type="button" style={s.btnSecondary} onClick={() => { setForm(emptyCommonForm); setEditId(null) }}>取消</button>}
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
      <div style={s.unitTabs}>
        {units.map(u => <button key={u} style={{ ...s.unitTab, ...(activeUnit === u ? s.unitTabActive : {}) }} onClick={() => setActiveUnit(u)}>{UNIT_LABELS[u]}</button>)}
      </div>
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
  const [list, setList]     = useState([])
  const [form, setForm]     = useState(emptyBulletinForm)
  const [editId, setEditId] = useState(null)
  const [msg, setMsg]       = useState({ text: '', error: false })

  const showMsg = (text, error = false) => {
    setMsg({ text, error })
    setTimeout(() => setMsg({ text: '', error: false }), 3000)
  }

  const load = useCallback(async () => {
    try   { setList((await textApi.getAll(unitCode, category, true)) ?? []) }
    catch { showMsg('讀取失敗', true) }
  }, [unitCode, category])

  useEffect(() => { load() }, [load])

  const handleSubmit = async (e) => {
    e.preventDefault()
    // 起迄空字串轉 null（不限）
    const payload = { ...form, unitCode, category, startAt: form.startAt || null, endAt: form.endAt || null }
    try {
      if (editId) {
        await textApi.update(editId, payload)
        showMsg('修改成功')
      } else {
        await textApi.create(payload)
        showMsg('新增成功')
      }
      setForm(emptyBulletinForm); setEditId(null); load()
    } catch { showMsg('操作失敗', true) }
  }

  const handleEdit   = item => { setEditId(item.id); setForm({ title: item.title ?? '', content: item.content, priority: item.priority ?? '一般', sortOrder: item.sortOrder, isActive: item.isActive, startAt: toLocalInput(item.startAt), endAt: toLocalInput(item.endAt) }) }
  const handleDelete = async id => {
    if (!window.confirm('確定刪除？')) return
    try { await textApi.remove(id); showMsg('刪除成功'); load() }
    catch { showMsg('刪除失敗', true) }
  }
  const handleToggle = async item => {
    try { await textApi.update(item.id, { ...item, isActive: !item.isActive, unitCode, category }); load() }
    catch { showMsg('操作失敗', true) }
  }

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
            {editId && <button type="button" style={s.btnSecondary} onClick={() => { setForm(emptyBulletinForm); setEditId(null) }}>取消</button>}
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
      <div style={s.unitTabs}>
        {units.map(u => (
          <button key={u} style={{ ...s.unitTab, ...(activeUnit === u ? s.unitTabActive : {}) }}
            onClick={() => setActiveUnit(u)}>
            {UNIT_LABELS[u]}
          </button>
        ))}
      </div>
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
  const [list, setList]     = useState([])
  const [form, setForm]     = useState(emptyEvacEquipForm)
  const [editId, setEditId] = useState(null)
  const [msg, setMsg]       = useState({ text: '', error: false })
  const showMsg = (t, e=false) => { setMsg({text:t,error:e}); setTimeout(()=>setMsg({text:'',error:false}),3000) }
  const load = useCallback(async () => {
    try { setList((await evacuationApi.getEquipment(unitCode, true)) ?? []) } catch { showMsg('讀取失敗',true) }
  }, [unitCode])
  useEffect(() => { load() }, [load])

  const handleSubmit = async e => {
    e.preventDefault()
    const payload = { unitCode, ...form }
    try {
      if (editId) { await evacuationApi.updateEquipment(editId, payload); showMsg('修改成功') }
      else        { await evacuationApi.createEquipment(payload); showMsg('新增成功') }
      setForm(emptyEvacEquipForm); setEditId(null); load()
    } catch { showMsg('操作失敗',true) }
  }
  const handleEdit   = item => { setEditId(item.id); setForm({ equipmentName:item.equipmentName, location:item.location??'', quantity:item.quantity, sortOrder:item.sortOrder, isActive:item.isActive }) }
  const handleDelete = async id => { if (!window.confirm('確定刪除？')) return; try { await evacuationApi.removeEquipment(id); showMsg('刪除成功'); load() } catch { showMsg('刪除失敗',true) } }
  const handleToggle = async item => { try { await evacuationApi.updateEquipment(item.id, { unitCode, equipmentName:item.equipmentName, location:item.location, quantity:item.quantity, sortOrder:item.sortOrder, isActive:!item.isActive }); load() } catch { showMsg('操作失敗',true) } }

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
            {editId && <button type="button" style={s.btnSecondary} onClick={()=>{setForm(emptyEvacEquipForm);setEditId(null)}}>取消</button>}
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
  const [list, setList]     = useState([])
  const [form, setForm]     = useState(emptyEvacContactForm)
  const [editId, setEditId] = useState(null)
  const [msg, setMsg]       = useState({ text:'', error:false })
  const showMsg = (t,e=false)=>{setMsg({text:t,error:e});setTimeout(()=>setMsg({text:'',error:false}),3000)}
  const load = useCallback(async()=>{
    try{setList((await evacuationApi.getContact(unitCode,true))??[])}catch{showMsg('讀取失敗',true)}
  },[unitCode])
  useEffect(()=>{load()},[load])

  const handleSubmit = async e => {
    e.preventDefault()
    try {
      if (editId){await evacuationApi.updateContact(editId,{unitCode,...form});showMsg('修改成功')}
      else{await evacuationApi.createContact({unitCode,...form});showMsg('新增成功')}
      setForm(emptyEvacContactForm);setEditId(null);load()
    }catch{showMsg('操作失敗',true)}
  }
  const handleEdit=(item)=>{setEditId(item.id);setForm({name:item.name,extension:item.extension,sortOrder:item.sortOrder,isActive:item.isActive})}
  const handleDelete=async id=>{if(!window.confirm('確定刪除？'))return;try{await evacuationApi.removeContact(id);showMsg('刪除成功');load()}catch{showMsg('刪除失敗',true)}}
  const handleToggle=async item=>{try{await evacuationApi.updateContact(item.id,{unitCode,name:item.name,extension:item.extension,sortOrder:item.sortOrder,isActive:!item.isActive});load()}catch{showMsg('操作失敗',true)}}

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
            {editId && <button type="button" style={s.btnSecondary} onClick={()=>{setForm(emptyEvacContactForm);setEditId(null)}}>取消</button>}
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
      <div style={s.unitTabs}>
        {units.map(u => <button key={u} style={{...s.unitTab,...(activeUnit===u?s.unitTabActive:{})}} onClick={()=>setActiveUnit(u)}>{UNIT_LABELS[u]}</button>)}
      </div>
      <div style={s.sectionSub}>圖片管理</div>
      <EvacImageSection key={`img-${activeUnit}`} unitCode={activeUnit} />
      <div style={{...s.sectionSub, marginTop:'20px'}}>避難設備清單</div>
      <EvacEquipSection key={`eq-${activeUnit}`} unitCode={activeUnit} />
      <div style={{...s.sectionSub, marginTop:'20px'}}>緊急聯絡</div>
      <EvacContactSection key={`ct-${activeUnit}`} unitCode={activeUnit} />
    </div>
  )
}

// ── 病室動態：病人臨床補充層（WardPatientExt）─────────────────────
// 補 Board_bed 不足的臨床欄位（科別/責護/病況/狀態/各註記旗標/管路…；主治/轉入日期已由院方 API 帶入，診斷 W52/ICU/OR 亦由 API，僅 ER 保留），
// 以病歷號(Hhisnum)識別病人；看板以病歷號把本表疊到 Board_bed 真實在床病人上。
const emptyWardExtForm = {
  hhisnum: '', department: '', attendingDoctor: '', primaryNurse: '', diagnosis: '',
  condition: '', bedStatus: '', admissionDate: '', isolation: '', dependency: '', transport: '', notes: '',
  dnr: false, fallRisk: false, confidential: false, noTreatment: false, npo: false, allergy: false,
  rrt: false, chemo: false, oxygen: false, renal: false,
  portCath: false, dlvc: false, foley: false, cvc: false, cardiacCath: false,
  ventilator: false, crrt: false, ng: false,
  surgery: false, exam: false, consult: false,
  // ── ER 專屬狀態 ──
  observation: false, awaiting: false, awaitingType: '', transferIn: false, transferOut: false, transferHospital: '',
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
const ER_BOOLS = [
  ['observation','留觀'],['awaiting','待床'],['transferIn','轉入'],['transferOut','轉出'],
  ['admitted','住院'],['aad','AAD'],['mbd','MBD'],['deceased','死亡'],
]
const COND_OPTS = ['', '穩定', '重症', '危急']
const BEDSTATUS_OPTS = ['', 'occupied', 'isolation', 'transfer', 'transfer-in', 'discharge']
const ISO_OPTS = ['', '無', '接觸隔離', '飛沫隔離', '空氣隔離', '負壓隔離']
const DEP_OPTS = ['', 'L1', 'L2', 'L3']
const TRANSPORT_OPTS = ['', '輪椅', '推床']
const AWAIT_OPTS = ['', '一般', '加護', '隔離']

// 單一單位的臨床補充 CRUD（讀取 includeAll=true，後台含停用）
function WardExtSection({ unitCode }) {
  const [list, setList]     = useState([])
  const [occ, setOcc]       = useState({})   // 病歷號 → 目前床號（在床對照）
  const [form, setForm]     = useState(emptyWardExtForm)
  const [editId, setEditId] = useState(null)
  const [msg, setMsg]       = useState({ text: '', error: false })

  const showMsg = (text, error = false) => { setMsg({ text, error }); setTimeout(() => setMsg({ text: '', error: false }), 3000) }
  const load = useCallback(async () => {
    try {
      const [rows, occList] = await Promise.all([
        wardApi.getExt(unitCode, true),
        wardApi.getOccupancy(unitCode).catch(() => []),   // 在床對照失敗不影響清單
      ])
      setList(rows ?? [])
      const m = {}; (occList ?? []).forEach(o => { if (o.hhisnum) m[o.hhisnum.trim()] = o.bed })
      setOcc(m)
    } catch { showMsg('讀取失敗', true) }
  }, [unitCode])
  useEffect(() => { load() }, [load])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...form, unitCode }
    try {
      if (editId) { await wardApi.updateExt(editId, payload); showMsg('修改成功') }
      else        { await wardApi.createExt(payload); showMsg('新增成功') }
      setForm(emptyWardExtForm); setEditId(null); load()
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
      transferIn: !!item.transferIn, transferOut: !!item.transferOut, transferHospital: item.transferHospital ?? '',
      admitted: !!item.admitted, admBedNo: item.admBedNo ?? '', aad: !!item.aad, mbd: !!item.mbd,
      deceased: !!item.deceased, arrivalDate: item.arrivalDate ?? '', arrivalTime: item.arrivalTime ?? '',
      scrubNurse: item.scrubNurse ?? '', circNurse: item.circNurse ?? '', surgeryStatus: item.surgeryStatus ?? '',
      startTime: item.startTime ?? '', endTime: item.endTime ?? '',
      isActive: !!item.isActive,
    })
  }
  const handleDelete = async id => { if (!window.confirm('確定刪除？')) return; try { await wardApi.removeExt(id); showMsg('刪除成功'); load() } catch { showMsg('刪除失敗', true) } }

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div>
      {msg.text && <div style={{ ...s.msg, background: msg.error ? '#fee2e2' : '#d1fae5', color: msg.error ? '#991b1b' : '#065f46' }}>{msg.text}</div>}
      <div style={s.formCard}>
        <h4 style={s.formTitle}>{editId ? `修改臨床補充 (ID: ${editId})` : '新增臨床補充'}</h4>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>
          以「病歷號」對應 Board_bed 真實在床病人。基本（姓名/性別/生日/床號）＋<b>主治醫師（負責醫師）/入院日（轉入日期）</b>由院方 API 提供，此處只補其餘臨床欄位。
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
            <div style={s.formRow}><label style={s.label}>病歷號 *</label><input style={s.input} value={form.hhisnum} required onChange={e => setF('hhisnum', e.target.value)} placeholder="19021524" /></div>
            <div style={s.formRow}><label style={s.label}>科別</label><input style={s.input} value={form.department} onChange={e => setF('department', e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>責任護理師</label><input style={s.input} value={form.primaryNurse} onChange={e => setF('primaryNurse', e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>病況等級</label><select style={s.input} value={form.condition} onChange={e => setF('condition', e.target.value)}>{COND_OPTS.map(o => <option key={o} value={o}>{o || '（無）'}</option>)}</select></div>
            <div style={s.formRow}><label style={s.label}>床位狀態</label><select style={s.input} value={form.bedStatus} onChange={e => setF('bedStatus', e.target.value)}>{BEDSTATUS_OPTS.map(o => <option key={o} value={o}>{o || '（占床 occupied）'}</option>)}</select></div>
            <div style={s.formRow}><label style={s.label}>隔離</label><select style={s.input} value={form.isolation} onChange={e => setF('isolation', e.target.value)}>{ISO_OPTS.map(o => <option key={o} value={o}>{o || '（無）'}</option>)}</select></div>
            <div style={s.formRow}><label style={s.label}>運送</label><select style={s.input} value={form.transport} onChange={e => setF('transport', e.target.value)}>{TRANSPORT_OPTS.map(o => <option key={o} value={o}>{o || '（無）'}</option>)}</select></div>
            <div style={s.formRow}><label style={s.label}>依賴度</label><select style={s.input} value={form.dependency} onChange={e => setF('dependency', e.target.value)}>{DEP_OPTS.map(o => <option key={o} value={o}>{o || '（無）'}</option>)}</select></div>
          </div>
          {/* 診斷：W52/ICU/OR 由院方 API 帶入；僅 ER（Board_ER 無診斷）保留後台輸入 */}
          {unitCode === 'ER' && (
            <div style={s.formRow}><label style={s.label}>診斷</label><input style={s.input} value={form.diagnosis} onChange={e => setF('diagnosis', e.target.value)} /></div>
          )}
          <div style={s.formRow}><label style={s.label}>備註</label><textarea style={{ ...s.input, height: '52px', resize: 'vertical' }} value={form.notes} onChange={e => setF('notes', e.target.value)} /></div>
          {unitCode === 'ER' && (
            <>
              <label style={s.label}>急診狀態欄位（ER）</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px', marginBottom: '8px' }}>
                <div style={s.formRow}><label style={s.label}>到院日(MM/DD)</label><input style={s.input} value={form.arrivalDate} onChange={e => setF('arrivalDate', e.target.value)} placeholder="05/24" /></div>
                <div style={s.formRow}><label style={s.label}>到院時間(HH:mm)</label><input style={s.input} value={form.arrivalTime} onChange={e => setF('arrivalTime', e.target.value)} placeholder="09:15" /></div>
                <div style={s.formRow}><label style={s.label}>待床型態</label><select style={s.input} value={form.awaitingType} onChange={e => setF('awaitingType', e.target.value)}>{AWAIT_OPTS.map(o => <option key={o} value={o}>{o || '（無）'}</option>)}</select></div>
                <div style={s.formRow}><label style={s.label}>轉出/入醫院</label><input style={s.input} value={form.transferHospital} onChange={e => setF('transferHospital', e.target.value)} /></div>
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
                <div style={s.formRow}><label style={s.label}>刷手護理師</label><input style={s.input} value={form.scrubNurse} onChange={e => setF('scrubNurse', e.target.value)} /></div>
                <div style={s.formRow}><label style={s.label}>流動護理師</label><input style={s.input} value={form.circNurse} onChange={e => setF('circNurse', e.target.value)} /></div>
                <div style={s.formRow} />
                <div style={s.formRow}><label style={s.label}>實際進刀房(HH:mm)</label><input style={s.input} value={form.startTime} onChange={e => setF('startTime', e.target.value)} placeholder="09:05" /></div>
                <div style={s.formRow}><label style={s.label}>實際出刀房(HH:mm)</label><input style={s.input} value={form.endTime} onChange={e => setF('endTime', e.target.value)} placeholder="10:18" /></div>
              </div>
              <div style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 12px' }}>手術狀態由系統依時間自動判定：未到預定時間→<b>排程</b>、已過預定時間→<b>準備中</b>、已填實際進刀房且已到→<b>手術中</b>、已填實際出刀房→<b>已完成</b>。</div>
            </>
          )}
          <label style={s.label}>註記旗標</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', margin: '4px 0 12px' }}>
            {WARD_BOOLS.map(([k, lbl]) => (
              <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" checked={form[k]} onChange={e => setF(k, e.target.checked)} />{lbl}
              </label>
            ))}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.isActive} onChange={e => setF('isActive', e.target.checked)} />啟用
          </label>
          <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
            <button type="submit" style={s.btnPrimary}>{editId ? '儲存修改' : '+ 新增'}</button>
            {editId && <button type="button" style={s.btnSecondary} onClick={() => { setForm(emptyWardExtForm); setEditId(null) }}>取消</button>}
          </div>
        </form>
      </div>
      <div style={s.listCard}>
        <h4 style={s.formTitle}>臨床補充清單（共 {list.length} 筆）</h4>
        {list.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '14px' }}>尚無資料，請新增（病歷號需對應 Board_bed 在床病人才會顯示在白板）</p> : (
          <table style={s.table}>
            <thead><tr>{['病歷號', unitCode === 'OR' ? '刀房' : '床號', '科別','責護','病況','狀態','旗標','啟用','操作'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
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
                    <td style={s.td}>{item.department || '—'}</td>
                    <td style={s.td}>{item.primaryNurse || '—'}</td>
                    <td style={s.td}>{item.condition || '—'}</td>
                    <td style={s.td}>{item.bedStatus || 'occupied'}</td>
                    <td style={{ ...s.td, maxWidth: '220px', fontSize: '12px' }}>{flags.join('、') || '—'}</td>
                    <td style={s.td}><span style={{ ...s.badge, background: item.isActive ? '#d1fae5' : '#f3f4f6', color: item.isActive ? '#065f46' : '#6b7280' }}>{item.isActive ? '✓ 啟用' : '停用'}</span></td>
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

// ── 急診各科值班醫師（ErOnCallDoctor）─────────────────────────────
// 對應實體急診白板右半「各科值班醫師」；一科一列，維護當日值班醫師/分機/員編。
const emptyOnCallForm = { deptCode: '', deptName: '', doctorName: '', ext: '', empNo: '', sortOrder: 0, isActive: true }

function ErOnCallSection() {
  const [list, setList]     = useState([])
  const [form, setForm]     = useState(emptyOnCallForm)
  const [editId, setEditId] = useState(null)
  const [msg, setMsg]       = useState({ text: '', error: false })

  const showMsg = (text, error = false) => { setMsg({ text, error }); setTimeout(() => setMsg({ text: '', error: false }), 3000) }
  const load = useCallback(async () => {
    try   { setList((await wardApi.getOnCall('ER', true)) ?? []) }
    catch { showMsg('讀取失敗', true) }
  }, [])
  useEffect(() => { load() }, [load])

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...form, unitCode: 'ER' }
    try {
      if (editId) { await wardApi.updateOnCall(editId, payload); showMsg('修改成功') }
      else        { await wardApi.createOnCall(payload); showMsg('新增成功') }
      setForm(emptyOnCallForm); setEditId(null); load()
    } catch { showMsg('操作失敗（科別代碼是否重複？）', true) }
  }
  const handleEdit = item => { setEditId(item.id); setForm({ deptCode: item.deptCode, deptName: item.deptName ?? '', doctorName: item.doctorName ?? '', ext: item.ext ?? '', empNo: item.empNo ?? '', sortOrder: item.sortOrder, isActive: item.isActive }) }
  const handleDelete = async id => { if (!window.confirm('確定刪除？')) return; try { await wardApi.removeOnCall(id); showMsg('刪除成功'); load() } catch { showMsg('刪除失敗', true) } }

  return (
    <div>
      {msg.text && <div style={{ ...s.msg, background: msg.error ? '#fee2e2' : '#d1fae5', color: msg.error ? '#991b1b' : '#065f46' }}>{msg.text}</div>}
      <div style={s.formCard}>
        <h4 style={s.formTitle}>{editId ? `修改值班醫師 (ID: ${editId})` : '新增各科值班醫師'}</h4>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>顯示於 ER 病室動態右下「各科值班醫師」面板（5×2）。科別代碼如 MED/GS/ORTH/NS/GYN/PS/PED/CRS/GU/CVS。</div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
            <div style={s.formRow}><label style={s.label}>科別代碼 *</label><input style={s.input} value={form.deptCode} required onChange={e => setF('deptCode', e.target.value)} placeholder="GS" /></div>
            <div style={s.formRow}><label style={s.label}>科別中文</label><input style={s.input} value={form.deptName} onChange={e => setF('deptName', e.target.value)} placeholder="一般外科" /></div>
            <div style={s.formRow}><label style={s.label}>值班醫師</label><input style={s.input} value={form.doctorName} onChange={e => setF('doctorName', e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>分機</label><input style={s.input} value={form.ext} onChange={e => setF('ext', e.target.value)} placeholder="4204" /></div>
            <div style={s.formRow}><label style={s.label}>員編</label><input style={s.input} value={form.empNo} onChange={e => setF('empNo', e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>排序</label><input type="number" style={s.input} value={form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer', marginTop: '4px' }}>
            <input type="checkbox" checked={form.isActive} onChange={e => setF('isActive', e.target.checked)} />啟用
          </label>
          <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
            <button type="submit" style={s.btnPrimary}>{editId ? '儲存修改' : '+ 新增'}</button>
            {editId && <button type="button" style={s.btnSecondary} onClick={() => { setForm(emptyOnCallForm); setEditId(null) }}>取消</button>}
          </div>
        </form>
      </div>
      <div style={s.listCard}>
        <h4 style={s.formTitle}>各科值班醫師（共 {list.length} 筆）</h4>
        {list.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '14px' }}>尚無資料，請新增</p> : (
          <table style={s.table}>
            <thead><tr>{['排序','科別','科別中文','值班醫師','分機','員編','啟用','操作'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {list.map((item, i) => (
                <tr key={item.id} style={{ background: editId === item.id ? '#fef9c3' : i % 2 ? '#f9fafb' : '#fff' }}>
                  <td style={s.td}>{item.sortOrder}</td>
                  <td style={s.td}>{item.deptCode}</td>
                  <td style={s.td}>{item.deptName || '—'}</td>
                  <td style={s.td}>{item.doctorName || '—'}</td>
                  <td style={s.td}>{item.ext || '—'}</td>
                  <td style={s.td}>{item.empNo || '—'}</td>
                  <td style={s.td}><span style={{ ...s.badge, background: item.isActive ? '#d1fae5' : '#f3f4f6', color: item.isActive ? '#065f46' : '#6b7280' }}>{item.isActive ? '✓ 啟用' : '停用'}</span></td>
                  <td style={s.td}><button style={s.btnEdit} onClick={() => handleEdit(item)}>編輯</button><button style={s.btnDel} onClick={() => handleDelete(item.id)}>刪除</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function ErOnCallManager() {
  return (
    <div>
      <div style={s.sectionSub}>急診各科值班醫師（ER 病室動態面板）</div>
      <ErOnCallSection />
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
  const [list, setList] = useState([])
  const [form, setForm] = useState(emptyShiftStaffForm)
  const [editId, setEditId] = useState(null)
  const [msg, setMsg] = useState({ text: '', error: false })
  const showMsg = (text, error = false) => { setMsg({ text, error }); setTimeout(() => setMsg({ text: '', error: false }), 3000) }
  const load = useCallback(async () => { try { setList((await wardApi.getShiftStaff('OR', true)) ?? []) } catch { showMsg('讀取失敗', true) } }, [])
  useEffect(() => { load() }, [load])
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...form, unitCode: 'OR' }
    try {
      if (editId) { await wardApi.updateShiftStaff(editId, payload); showMsg('修改成功') }
      else { await wardApi.createShiftStaff(payload); showMsg('新增成功') }
      setForm(emptyShiftStaffForm); setEditId(null); load()
    } catch { showMsg('操作失敗', true) }
  }
  const handleEdit = i => { setEditId(i.id); setForm({ shiftType: i.shiftType, role: i.role, name: i.name ?? '', roleTitle: i.roleTitle ?? '', ext: i.ext ?? '', sortOrder: i.sortOrder, isActive: i.isActive }) }
  const handleDelete = async id => { if (!window.confirm('確定刪除？')) return; try { await wardApi.removeShiftStaff(id); showMsg('刪除成功'); load() } catch { showMsg('刪除失敗', true) } }
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
            {editId && <button type="button" style={s.btnSecondary} onClick={() => { setForm(emptyShiftStaffForm); setEditId(null) }}>取消</button>}
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
  const [list, setList] = useState([])
  const [form, setForm] = useState(emptyShiftRoomForm)
  const [editId, setEditId] = useState(null)
  const [msg, setMsg] = useState({ text: '', error: false })
  const showMsg = (text, error = false) => { setMsg({ text, error }); setTimeout(() => setMsg({ text: '', error: false }), 3000) }
  const load = useCallback(async () => { try { setList((await wardApi.getShiftRoom('OR', true)) ?? []) } catch { showMsg('讀取失敗', true) } }, [])
  useEffect(() => { load() }, [load])
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...form, unitCode: 'OR' }
    try {
      if (editId) { await wardApi.updateShiftRoom(editId, payload); showMsg('修改成功') }
      else { await wardApi.createShiftRoom(payload); showMsg('新增成功') }
      setForm(emptyShiftRoomForm); setEditId(null); load()
    } catch { showMsg('操作失敗（班別＋刀房是否重複？）', true) }
  }
  const handleEdit = i => { setEditId(i.id); setForm({ shiftType: i.shiftType, roomId: i.roomId, scrubNurse: i.scrubNurse ?? '', circNurse: i.circNurse ?? '', ext: i.ext ?? '', sortOrder: i.sortOrder, isActive: i.isActive }) }
  const handleDelete = async id => { if (!window.confirm('確定刪除？')) return; try { await wardApi.removeShiftRoom(id); showMsg('刪除成功'); load() } catch { showMsg('刪除失敗', true) } }
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
            {editId && <button type="button" style={s.btnSecondary} onClick={() => { setForm(emptyShiftRoomForm); setEditId(null) }}>取消</button>}
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
  const [list, setList] = useState([])
  const [form, setForm] = useState(emptyHandoverForm)
  const [editId, setEditId] = useState(null)
  const [msg, setMsg] = useState({ text: '', error: false })
  const showMsg = (text, error = false) => { setMsg({ text, error }); setTimeout(() => setMsg({ text: '', error: false }), 3000) }
  const load = useCallback(async () => { try { setList((await wardApi.getHandoverList('OR', true)) ?? []) } catch { showMsg('讀取失敗', true) } }, [])
  useEffect(() => { load() }, [load])
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...form, unitCode: 'OR',
      age: form.age === '' ? null : Number(form.age),
      bloodLoss: form.bloodLoss === '' ? null : Number(form.bloodLoss),
      bloodTransfusion: form.bloodTransfusion === '' ? null : Number(form.bloodTransfusion),
    }
    try {
      if (editId) { await wardApi.updateHandover(editId, payload); showMsg('修改成功') }
      else { await wardApi.createHandover(payload); showMsg('新增成功') }
      setForm(emptyHandoverForm); setEditId(null); load()
    } catch { showMsg('操作失敗', true) }
  }
  const handleEdit = i => {
    setEditId(i.id)
    setForm({
      hhisnum: i.hhisnum ?? '', roomId: i.roomId ?? 'OR-01', patientName: i.patientName ?? '', gender: i.gender ?? 'M',
      age: i.age ?? '', surgeryName: i.surgeryName ?? '', surgerySource: i.surgerySource ?? '門診刀', surgeonName: i.surgeonName ?? '',
      destWard: i.destWard ?? '', destBed: i.destBed ?? '', endTime: i.endTime ?? '', bloodLoss: i.bloodLoss ?? '',
      bloodTransfusion: i.bloodTransfusion ?? '', drainDetails: i.drainDetails ?? '', specialNotes: i.specialNotes ?? '',
      sortOrder: i.sortOrder, isActive: i.isActive,
    })
  }
  const handleDelete = async id => { if (!window.confirm('確定刪除？')) return; try { await wardApi.removeHandover(id); showMsg('刪除成功'); load() } catch { showMsg('刪除失敗', true) } }
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
            {editId && <button type="button" style={s.btnSecondary} onClick={() => { setForm(emptyHandoverForm); setEditId(null) }}>取消</button>}
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
  const [list, setList] = useState([])
  const [form, setForm] = useState(emptyExamConsultForm)
  const [editId, setEditId] = useState(null)
  const [msg, setMsg] = useState({ text: '', error: false })
  const showMsg = (text, error = false) => { setMsg({ text, error }); setTimeout(() => setMsg({ text: '', error: false }), 3000) }
  const load = useCallback(async () => { try { setList((await wardApi.getExamConsultList(unitCode, true)) ?? []) } catch { showMsg('讀取失敗', true) } }, [unitCode])
  useEffect(() => { load() }, [load])
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isExam = form.kind === '檢查'
  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...form, unitCode }
    try {
      if (editId) { await wardApi.updateExamConsult(editId, payload); showMsg('修改成功') }
      else { await wardApi.createExamConsult(payload); showMsg('新增成功') }
      setForm(emptyExamConsultForm); setEditId(null); load()
    } catch { showMsg('操作失敗', true) }
  }
  const handleEdit = i => {
    setEditId(i.id)
    setForm({ kind: i.kind, hhisnum: i.hhisnum ?? '', bedId: i.bedId ?? '', patientName: i.patientName ?? '', gender: i.gender ?? 'M', itemName: i.itemName ?? '', doctor: i.doctor ?? '', scheduledDate: i.scheduledDate ?? '', timeSlot: i.timeSlot ?? '', completedTime: i.completedTime ?? '', status: i.status ?? '', notes: i.notes ?? '', sortOrder: i.sortOrder, isActive: i.isActive })
  }
  const handleDelete = async id => { if (!window.confirm('確定刪除？')) return; try { await wardApi.removeExamConsult(id); showMsg('刪除成功'); load() } catch { showMsg('刪除失敗', true) } }
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
            {editId && <button type="button" style={s.btnSecondary} onClick={() => { setForm(emptyExamConsultForm); setEditId(null) }}>取消</button>}
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


// ── ICU 抗生素（自建；以病歷號掛載）────────────────────────────────
const emptyAbxForm = { hhisnum: '', drugName: '', startDateTime: '', firstDoseDateTime: '', endDateTime: '', sortOrder: 0, isActive: true }

function AntibioticSection() {
  const [list, setList] = useState([])
  const [form, setForm] = useState(emptyAbxForm)
  const [editId, setEditId] = useState(null)
  const [msg, setMsg] = useState({ text: '', error: false })
  const showMsg = (text, error = false) => { setMsg({ text, error }); setTimeout(() => setMsg({ text: '', error: false }), 3000) }
  const load = useCallback(async () => { try { setList((await wardApi.getAntibiotic('ICU', true)) ?? []) } catch { showMsg('讀取失敗', true) } }, [])
  useEffect(() => { load() }, [load])
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...form, unitCode: 'ICU' }
    try {
      if (editId) { await wardApi.updateAntibiotic(editId, payload); showMsg('修改成功') }
      else { await wardApi.createAntibiotic(payload); showMsg('新增成功') }
      setForm(emptyAbxForm); setEditId(null); load()
    } catch { showMsg('操作失敗', true) }
  }
  const handleEdit = i => {
    setEditId(i.id)
    setForm({ hhisnum: i.hhisnum ?? '', drugName: i.drugName ?? '', startDateTime: i.startDateTime ?? '', firstDoseDateTime: i.firstDoseDateTime ?? '', endDateTime: i.endDateTime ?? '', sortOrder: i.sortOrder, isActive: i.isActive })
  }
  const handleDelete = async id => { if (!window.confirm('確定刪除？')) return; try { await wardApi.removeAntibiotic(id); showMsg('刪除成功'); load() } catch { showMsg('刪除失敗', true) } }
  return (
    <div>
      {msg.text && <div style={{ ...s.msg, background: msg.error ? '#fee2e2' : '#d1fae5', color: msg.error ? '#991b1b' : '#065f46' }}>{msg.text}</div>}
      <div style={s.formCard}>
        <h4 style={s.formTitle}>{editId ? `修改抗生素 (ID: ${editId})` : '新增抗生素'}</h4>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>自建（院方 UD.UDORDER 未開放前）。以「病歷號」掛載；抗生素分頁依在床病人病歷號對應顯示。時間格式 2026-06-24 08:00。</div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
            <div style={s.formRow}><label style={s.label}>病歷號 *</label><input style={s.input} value={form.hhisnum} onChange={e => setF('hhisnum', e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>藥品名稱 *</label><input style={s.input} value={form.drugName} onChange={e => setF('drugName', e.target.value)} placeholder="Vancomycin" /></div>
            <div style={s.formRow}><label style={s.label}>排序</label><input type="number" style={s.input} value={form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></div>
            <div style={s.formRow}><label style={s.label}>開始時間</label><input style={s.input} value={form.startDateTime} onChange={e => setF('startDateTime', e.target.value)} placeholder="2026-06-24 08:00" /></div>
            <div style={s.formRow}><label style={s.label}>首次給藥時間</label><input style={s.input} value={form.firstDoseDateTime} onChange={e => setF('firstDoseDateTime', e.target.value)} placeholder="2026-06-24 08:30" /></div>
            <div style={s.formRow}><label style={s.label}>結束時間</label><input style={s.input} value={form.endDateTime} onChange={e => setF('endDateTime', e.target.value)} placeholder="（進行中可留空）" /></div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}><input type="checkbox" checked={form.isActive} onChange={e => setF('isActive', e.target.checked)} />啟用</label>
          <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
            <button type="submit" style={s.btnPrimary}>{editId ? '儲存修改' : '+ 新增'}</button>
            {editId && <button type="button" style={s.btnSecondary} onClick={() => { setForm(emptyAbxForm); setEditId(null) }}>取消</button>}
          </div>
        </form>
      </div>
      <div style={s.listCard}>
        <h4 style={s.formTitle}>抗生素（共 {list.length} 筆）</h4>
        {list.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '14px' }}>尚無資料</p> : (
          <table style={s.table}>
            <thead><tr>{['病歷號', '藥品名稱', '開始時間', '首次給藥', '結束時間', '啟用', '操作'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {list.map((i, n) => (
                <tr key={i.id} style={{ background: editId === i.id ? '#fef9c3' : n % 2 ? '#f9fafb' : '#fff' }}>
                  <td style={s.td}>{i.hhisnum || '—'}</td><td style={s.td}>{i.drugName || '—'}</td>
                  <td style={s.td}>{i.startDateTime || '—'}</td><td style={s.td}>{i.firstDoseDateTime || '—'}</td><td style={s.td}>{i.endDateTime || '—'}</td>
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
function Sidebar({ selectedMenu, onSelect, units = [] }) {
  const [expanded, setExpanded] = useState(new Set(['announcement']))

  // 切換某分組的展開/收合
  const toggle = id => setExpanded(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  // 通用群組（無 unit）恆顯示；站別群組（有 unit）依角色可管理單位過濾
  const groups = MENU_CONFIG.filter(g => !g.unit || units.includes(g.unit))

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
  const { role, roleInfo, logout } = useAuth()      // 登入身份資訊與登出方法
  const navigate = useNavigate()
  const units = roleInfo?.unitCodes ?? []           // 此身份可管理的單位清單
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
      case 'w52-info':       return <UnitInfoSection key="W52i" unitCode="W52" />
      case 'icu-info':       return <UnitInfoSection key="ICUi" unitCode="ICU" />
      case 'or-info':        return <UnitInfoSection key="ORi"  unitCode="OR" />
      case 'er-info':        return <UnitInfoSection key="ERi"  unitCode="ER" />
      // 站別：病人臨床補充（各站固定 unitCode，直接渲染 Section）
      case 'w52-exam':       return <ExamConsultSection key="W52e" unitCode="W52" />
      case 'icu-exam':       return <ExamConsultSection key="ICUe" unitCode="ICU" />
      case 'icu-abx':        return <AntibioticSection key="ICUabx" />
      case 'er-exam':        return <ExamConsultSection key="ERe"  unitCode="ER" />
      case 'w52-ext':        return <WardExtSection key="W52" unitCode="W52" />
      case 'icu-ext':        return <WardExtSection key="ICU" unitCode="ICU" />
      case 'or-ext':         return <WardExtSection key="OR"  unitCode="OR" />
      case 'er-ext':         return <WardExtSection key="ER"  unitCode="ER" />
      case 'er-oncall':      return <ErOnCallManager />
      case 'or-schedule':    return <OrScheduleManager />
      case 'or-handover':    return <OrHandoverManager />
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
        <Sidebar selectedMenu={selectedMenu} onSelect={setSelectedMenu} units={units} />

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
  unitTabActive: { color: '#2D7A55', borderBottomColor: '#2D7A55', background: '#f0fdf4' },
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
