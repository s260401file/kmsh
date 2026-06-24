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
  {
    id: 'ward', label: '病室動態',
    children: [
      { id: 'ward-ext',  label: '病人臨床補充',     available: true  },  // 補 Board_bed 不足欄位
      { id: 'er-bed',    label: 'ER 床位主檔',       available: true  },  // ER 病室動態平面圖（床碼/分區/座標）
      { id: 'or-room',   label: 'OR 刀房主檔',       available: true  },  // OR 手術動態房卡（房號↔R代碼）
      { id: 'er-oncall', label: '急診各科值班醫師', available: true  },  // ER 病室動態面板
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
// 補 Board_bed 不足的臨床欄位（科別/主治/責護/診斷/病況/狀態/各註記旗標/管路…），
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
const SURGERY_STATUS_OPTS = ['', '準備中', '手術中', '已完成']

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
          以「病歷號」對應 Board_bed 真實在床病人。基本（姓名/性別/生日/床）由院方 API 提供，此處只補臨床欄位。
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
            <div style={s.formRow}><label style={s.label}>病歷號 *</label><input style={s.input} value={form.hhisnum} required onChange={e => setF('hhisnum', e.target.value)} placeholder="19021524" /></div>
            <div style={s.formRow}><label style={s.label}>科別</label><input style={s.input} value={form.department} onChange={e => setF('department', e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>主治醫師</label><input style={s.input} value={form.attendingDoctor} onChange={e => setF('attendingDoctor', e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>責任護理師</label><input style={s.input} value={form.primaryNurse} onChange={e => setF('primaryNurse', e.target.value)} /></div>
            <div style={s.formRow}><label style={s.label}>入院日(MM/DD)</label><input style={s.input} value={form.admissionDate} onChange={e => setF('admissionDate', e.target.value)} placeholder="06/18" /></div>
            <div style={s.formRow}><label style={s.label}>病況等級</label><select style={s.input} value={form.condition} onChange={e => setF('condition', e.target.value)}>{COND_OPTS.map(o => <option key={o} value={o}>{o || '（無）'}</option>)}</select></div>
            <div style={s.formRow}><label style={s.label}>床位狀態</label><select style={s.input} value={form.bedStatus} onChange={e => setF('bedStatus', e.target.value)}>{BEDSTATUS_OPTS.map(o => <option key={o} value={o}>{o || '（占床 occupied）'}</option>)}</select></div>
            <div style={s.formRow}><label style={s.label}>隔離</label><select style={s.input} value={form.isolation} onChange={e => setF('isolation', e.target.value)}>{ISO_OPTS.map(o => <option key={o} value={o}>{o || '（無）'}</option>)}</select></div>
            <div style={s.formRow}><label style={s.label}>運送</label><select style={s.input} value={form.transport} onChange={e => setF('transport', e.target.value)}>{TRANSPORT_OPTS.map(o => <option key={o} value={o}>{o || '（無）'}</option>)}</select></div>
            <div style={s.formRow}><label style={s.label}>依賴度</label><select style={s.input} value={form.dependency} onChange={e => setF('dependency', e.target.value)}>{DEP_OPTS.map(o => <option key={o} value={o}>{o || '（無）'}</option>)}</select></div>
          </div>
          <div style={s.formRow}><label style={s.label}>診斷</label><input style={s.input} value={form.diagnosis} onChange={e => setF('diagnosis', e.target.value)} /></div>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px', marginBottom: '8px' }}>
                <div style={s.formRow}><label style={s.label}>手術狀態</label><select style={s.input} value={form.surgeryStatus} onChange={e => setF('surgeryStatus', e.target.value)}>{SURGERY_STATUS_OPTS.map(o => <option key={o} value={o}>{o || '（排程）'}</option>)}</select></div>
                <div style={s.formRow}><label style={s.label}>刷手護理師</label><input style={s.input} value={form.scrubNurse} onChange={e => setF('scrubNurse', e.target.value)} /></div>
                <div style={s.formRow}><label style={s.label}>流動護理師</label><input style={s.input} value={form.circNurse} onChange={e => setF('circNurse', e.target.value)} /></div>
                <div style={s.formRow}><label style={s.label}>實際進刀房(HH:mm)</label><input style={s.input} value={form.startTime} onChange={e => setF('startTime', e.target.value)} placeholder="09:05" /></div>
                <div style={s.formRow}><label style={s.label}>實際出刀房(HH:mm)</label><input style={s.input} value={form.endTime} onChange={e => setF('endTime', e.target.value)} placeholder="10:18" /></div>
              </div>
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
            <thead><tr>{['病歷號','床號','科別','主治','責護','病況','狀態','旗標','啟用','操作'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {list.map((item, i) => {
                const flags = WARD_BOOLS.filter(([k]) => item[k]).map(([, l]) => l)
                  .concat(item.isolation && item.isolation !== '無' ? ['隔離'] : [])
                return (
                  <tr key={item.id} style={{ background: editId === item.id ? '#fef9c3' : i % 2 ? '#f9fafb' : '#fff' }}>
                    <td style={s.td}>{item.hhisnum}</td>
                    <td style={s.td}>{occ[item.hhisnum?.trim()]
                      ? <span style={{ ...s.badge, background: '#dbeafe', color: '#1e40af' }}>{occ[item.hhisnum.trim()]}</span>
                      : <span style={{ color: '#9ca3af', fontSize: '12px' }}>已離床</span>}</td>
                    <td style={s.td}>{item.department || '—'}</td>
                    <td style={s.td}>{item.attendingDoctor || '—'}</td>
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

// 病室動態臨床補充 Manager（含單位切換）
function WardExtManager({ units }) {
  const [activeUnit, setActiveUnit] = useState(units[0] ?? 'W52')
  return (
    <div>
      <div style={s.unitTabs}>
        {units.map(u => <button key={u} style={{ ...s.unitTab, ...(activeUnit === u ? s.unitTabActive : {}) }} onClick={() => setActiveUnit(u)}>{UNIT_LABELS[u]}</button>)}
      </div>
      <WardExtSection key={activeUnit} unitCode={activeUnit} />
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

// ── ER 床位主檔（ErBed）──────────────────────────────────────────
// 存床碼＋分區＋平面圖座標(GridCol/GridRow)；ER 病室動態照主檔擺床、顯示空床。
// Board_ER 在室病人以 bedId merge 上去；床碼未建此表者會落白板「未配置床位」溢位區。
const emptyErBedForm = { bedId: '', ward: '', zone: '', gridCol: '', gridRow: '', sortOrder: 0, isActive: true }

function ErBedSection() {
  const [list, setList]     = useState([])
  const [form, setForm]     = useState(emptyErBedForm)
  const [editId, setEditId] = useState(null)
  const [msg, setMsg]       = useState({ text: '', error: false })

  const showMsg = (text, error = false) => { setMsg({ text, error }); setTimeout(() => setMsg({ text: '', error: false }), 3000) }
  const load = useCallback(async () => {
    try   { setList((await wardApi.getErBeds('ER', true)) ?? []) }
    catch { showMsg('讀取失敗', true) }
  }, [])
  useEffect(() => { load() }, [load])

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...form, unitCode: 'ER',
      gridCol: form.gridCol === '' ? null : Number(form.gridCol),
      gridRow: form.gridRow === '' ? null : Number(form.gridRow),
    }
    try {
      if (editId) { await wardApi.updateErBed(editId, payload); showMsg('修改成功') }
      else        { await wardApi.createErBed(payload); showMsg('新增成功') }
      setForm(emptyErBedForm); setEditId(null); load()
    } catch { showMsg('操作失敗（床號是否重複？）', true) }
  }
  const handleEdit = item => { setEditId(item.id); setForm({ bedId: item.bedId, ward: item.ward ?? '', zone: item.zone ?? '', gridCol: item.gridCol ?? '', gridRow: item.gridRow ?? '', sortOrder: item.sortOrder, isActive: item.isActive }) }
  const handleDelete = async id => { if (!window.confirm('確定刪除？')) return; try { await wardApi.removeErBed(id); showMsg('刪除成功'); load() } catch { showMsg('刪除失敗', true) } }

  return (
    <div>
      {msg.text && <div style={{ ...s.msg, background: msg.error ? '#fee2e2' : '#d1fae5', color: msg.error ? '#991b1b' : '#065f46' }}>{msg.text}</div>}
      <div style={s.formCard}>
        <h4 style={s.formTitle}>{editId ? `修改床位 (ID: ${editId})` : '新增 ER 床位'}</h4>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>
          床號需與 Board_ER 的「病房＋床位」對應（如 MER+007 → <b>MER07</b>）。GridCol/GridRow 為平面圖座標（11 欄×8 列；護理站在 col4 row5）。停用則白板不顯示該床。
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
            <div style={s.formRow}><label style={s.label}>床號 *</label><input style={s.input} value={form.bedId} required onChange={e => setF('bedId', e.target.value)} placeholder="MER07" /></div>
            <div style={s.formRow}><label style={s.label}>病房前綴</label><input style={s.input} value={form.ward} onChange={e => setF('ward', e.target.value)} placeholder="MER" /></div>
            <div style={s.formRow}><label style={s.label}>分區</label><input style={s.input} value={form.zone} onChange={e => setF('zone', e.target.value)} placeholder="第一診療區" /></div>
            <div style={s.formRow}><label style={s.label}>GridCol(欄 1-11)</label><input type="number" style={s.input} value={form.gridCol} onChange={e => setF('gridCol', e.target.value)} placeholder="11" /></div>
            <div style={s.formRow}><label style={s.label}>GridRow(列 1-8)</label><input type="number" style={s.input} value={form.gridRow} onChange={e => setF('gridRow', e.target.value)} placeholder="3" /></div>
            <div style={s.formRow}><label style={s.label}>排序</label><input type="number" style={s.input} value={form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer', marginTop: '4px' }}>
            <input type="checkbox" checked={form.isActive} onChange={e => setF('isActive', e.target.checked)} />啟用
          </label>
          <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
            <button type="submit" style={s.btnPrimary}>{editId ? '儲存修改' : '+ 新增'}</button>
            {editId && <button type="button" style={s.btnSecondary} onClick={() => { setForm(emptyErBedForm); setEditId(null) }}>取消</button>}
          </div>
        </form>
      </div>
      <div style={s.listCard}>
        <h4 style={s.formTitle}>ER 床位主檔（共 {list.length} 床）</h4>
        {list.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '14px' }}>尚無資料，請新增</p> : (
          <table style={s.table}>
            <thead><tr>{['排序','床號','病房','分區','座標(欄,列)','啟用','操作'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {list.map((item, i) => (
                <tr key={item.id} style={{ background: editId === item.id ? '#fef9c3' : i % 2 ? '#f9fafb' : '#fff' }}>
                  <td style={s.td}>{item.sortOrder}</td>
                  <td style={s.td}>{item.bedId}</td>
                  <td style={s.td}>{item.ward || '—'}</td>
                  <td style={s.td}>{item.zone || '—'}</td>
                  <td style={s.td}>{(item.gridCol != null && item.gridRow != null) ? `${item.gridCol}, ${item.gridRow}` : '—'}</td>
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

function ErBedManager() {
  return (
    <div>
      <div style={s.sectionSub}>ER 床位主檔（病室動態平面圖；床碼＋分區＋座標）</div>
      <ErBedSection />
    </div>
  )
}

// ── OR 刀房主檔（OrRoom）──────────────────────────────────────────
// 做白板房號 RoomId(OR-01…) ↔ Board_OR 刀房代碼 ApiRoom(R1…) 對應與排序；
// OR 手術動態照主檔鋪 4×2 房卡，Board_OR 今日手術以 ApiRoom merge 上去。
const emptyOrRoomForm = { roomId: '', apiRoom: '', sortOrder: 0, isActive: true }

function OrRoomSection() {
  const [list, setList]     = useState([])
  const [form, setForm]     = useState(emptyOrRoomForm)
  const [editId, setEditId] = useState(null)
  const [msg, setMsg]       = useState({ text: '', error: false })

  const showMsg = (text, error = false) => { setMsg({ text, error }); setTimeout(() => setMsg({ text: '', error: false }), 3000) }
  const load = useCallback(async () => {
    try   { setList((await wardApi.getOrRooms('OR', true)) ?? []) }
    catch { showMsg('讀取失敗', true) }
  }, [])
  useEffect(() => { load() }, [load])

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = { ...form, unitCode: 'OR' }
    try {
      if (editId) { await wardApi.updateOrRoom(editId, payload); showMsg('修改成功') }
      else        { await wardApi.createOrRoom(payload); showMsg('新增成功') }
      setForm(emptyOrRoomForm); setEditId(null); load()
    } catch { showMsg('操作失敗（房號是否重複？）', true) }
  }
  const handleEdit = item => { setEditId(item.id); setForm({ roomId: item.roomId, apiRoom: item.apiRoom ?? '', sortOrder: item.sortOrder, isActive: item.isActive }) }
  const handleDelete = async id => { if (!window.confirm('確定刪除？')) return; try { await wardApi.removeOrRoom(id); showMsg('刪除成功'); load() } catch { showMsg('刪除失敗', true) } }

  return (
    <div>
      {msg.text && <div style={{ ...s.msg, background: msg.error ? '#fee2e2' : '#d1fae5', color: msg.error ? '#991b1b' : '#065f46' }}>{msg.text}</div>}
      <div style={s.formCard}>
        <h4 style={s.formTitle}>{editId ? `修改刀房 (ID: ${editId})` : '新增 OR 刀房'}</h4>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px' }}>
          房號＝白板顯示（OR-01…OR-08，無 OR-04）；ApiRoom＝Board_OR「刀房」代碼（R1…R7），手術以此對應上板。停用則白板不顯示該房。
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
            <div style={s.formRow}><label style={s.label}>房號 *</label><input style={s.input} value={form.roomId} required onChange={e => setF('roomId', e.target.value)} placeholder="OR-01" /></div>
            <div style={s.formRow}><label style={s.label}>ApiRoom(R1…)</label><input style={s.input} value={form.apiRoom} onChange={e => setF('apiRoom', e.target.value)} placeholder="R1" /></div>
            <div style={s.formRow}><label style={s.label}>排序</label><input type="number" style={s.input} value={form.sortOrder} onChange={e => setF('sortOrder', Number(e.target.value))} /></div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer', marginTop: '4px' }}>
            <input type="checkbox" checked={form.isActive} onChange={e => setF('isActive', e.target.checked)} />啟用
          </label>
          <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
            <button type="submit" style={s.btnPrimary}>{editId ? '儲存修改' : '+ 新增'}</button>
            {editId && <button type="button" style={s.btnSecondary} onClick={() => { setForm(emptyOrRoomForm); setEditId(null) }}>取消</button>}
          </div>
        </form>
      </div>
      <div style={s.listCard}>
        <h4 style={s.formTitle}>OR 刀房主檔（共 {list.length} 房）</h4>
        {list.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '14px' }}>尚無資料，請新增</p> : (
          <table style={s.table}>
            <thead><tr>{['排序','房號','ApiRoom','啟用','操作'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {list.map((item, i) => (
                <tr key={item.id} style={{ background: editId === item.id ? '#fef9c3' : i % 2 ? '#f9fafb' : '#fff' }}>
                  <td style={s.td}>{item.sortOrder}</td>
                  <td style={s.td}>{item.roomId}</td>
                  <td style={s.td}>{item.apiRoom || '—'}</td>
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

function OrRoomManager() {
  return (
    <div>
      <div style={s.sectionSub}>OR 刀房主檔（手術動態房卡；房號 ↔ Board_OR R 代碼對應）</div>
      <OrRoomSection />
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
      case 'ward-ext':       return <WardExtManager units={units} />
      case 'er-bed':         return <ErBedManager />
      case 'or-room':        return <OrRoomManager />
      case 'er-oncall':      return <ErOnCallManager />
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
