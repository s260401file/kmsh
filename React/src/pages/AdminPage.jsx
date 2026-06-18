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
const emptyBulletinForm = { title: '', content: '', priority: '一般', sortOrder: 0, isActive: true }

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
    const payload = { ...form, unitCode, category }
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

  const handleEdit   = item => { setEditId(item.id); setForm({ title: item.title ?? '', content: item.content, priority: item.priority ?? '一般', sortOrder: item.sortOrder, isActive: item.isActive }) }
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
              <tr>{['ID','標題','內容','優先度','排序','啟用','操作'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
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
function Sidebar({ selectedMenu, onSelect }) {
  const [expanded, setExpanded] = useState(new Set(['announcement']))

  // 切換某分組的展開/收合
  const toggle = id => setExpanded(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  return (
    <nav style={s.sidebar}>
      {MENU_CONFIG.map(group => (
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
      // bulletin is now handled above
      // duty-contact and common-contact handled above
      case 'evac-image':    return <ComingSoon label="避難圖管理" />
      default:              return null
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
        <Sidebar selectedMenu={selectedMenu} onSelect={setSelectedMenu} />

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
  menuGroupBtn: { width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '12px', fontWeight: '800', letterSpacing: '1px', cursor: 'pointer', textTransform: 'uppercase', fontFamily: 'inherit', textAlign: 'left' },
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
