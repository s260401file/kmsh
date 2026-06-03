import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, ROLES } from '../context/AuthContext'
import * as marqueeApi from '../services/marqueeApi'

const UNIT_LABELS = { W52: 'W52 病房', ICU: 'ICU 加護', OR: 'OR 手術室', ER: 'ER 急診室' }

const emptyForm = { title: '', content: '', sortOrder: 0, isActive: true }

function MarqueeTab({ unitCode }) {
  const [list, setList] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [msg, setMsg] = useState({ text: '', error: false })

  const showMsg = (text, error = false) => {
    setMsg({ text, error })
    setTimeout(() => setMsg({ text: '', error: false }), 3000)
  }

  const load = useCallback(async () => {
    try {
      const data = await marqueeApi.getAll(unitCode)
      setList(data ?? [])
    } catch {
      showMsg('讀取失敗', true)
    }
  }, [unitCode])

  useEffect(() => { load() }, [load])

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
      setForm(emptyForm)
      setEditId(null)
      load()
    } catch {
      showMsg('操作失敗', true)
    }
  }

  const handleEdit = (item) => {
    setEditId(item.id)
    setForm({ title: item.title ?? '', content: item.content, sortOrder: item.sortOrder, isActive: item.isActive })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('確定刪除？')) return
    try {
      await marqueeApi.remove(id)
      showMsg('刪除成功')
      load()
    } catch {
      showMsg('刪除失敗', true)
    }
  }

  const handleToggle = async (item) => {
    try {
      await marqueeApi.update(item.id, { ...item, isActive: !item.isActive, unitCode, category: 'marquee' })
      load()
    } catch {
      showMsg('操作失敗', true)
    }
  }

  return (
    <div>
      {msg.text && (
        <div style={{ ...s.msg, background: msg.error ? '#fee2e2' : '#d1fae5', color: msg.error ? '#991b1b' : '#065f46' }}>
          {msg.text}
        </div>
      )}

      {/* 表單 */}
      <div style={s.formCard}>
        <h3 style={s.formTitle}>{editId ? `修改訊息 (ID: ${editId})` : '新增跑馬燈訊息'}</h3>
        <form onSubmit={handleSubmit}>
          <div style={s.formRow}>
            <label style={s.label}>標題（選填）</label>
            <input style={s.input} value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div style={s.formRow}>
            <label style={s.label}>訊息內容 *</label>
            <textarea style={{ ...s.input, height: '72px', resize: 'vertical' }}
              value={form.content} required
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={s.formRow}>
              <label style={s.label}>排序</label>
              <input type="number" style={{ ...s.input, width: '80px' }} value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isActive}
                onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
              啟用
            </label>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            <button type="submit" style={s.btnPrimary}>{editId ? '儲存修改' : '+ 新增'}</button>
            {editId && (
              <button type="button" style={s.btnSecondary} onClick={() => { setForm(emptyForm); setEditId(null) }}>取消</button>
            )}
          </div>
        </form>
      </div>

      {/* 清單 */}
      <div style={s.listCard}>
        <h3 style={s.formTitle}>訊息清單（共 {list.length} 筆）</h3>
        {list.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>尚無訊息，請新增</p>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                {['ID', '標題', '內容', '排序', '啟用', '操作'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((item, i) => (
                <tr key={item.id} style={{ background: editId === item.id ? '#fef9c3' : i % 2 ? '#f9fafb' : '#fff' }}>
                  <td style={s.td}>{item.id}</td>
                  <td style={s.td}>{item.title || '—'}</td>
                  <td style={{ ...s.td, maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.content}
                  </td>
                  <td style={s.td}>{item.sortOrder}</td>
                  <td style={s.td}>
                    <button onClick={() => handleToggle(item)}
                      style={{ ...s.badge, background: item.isActive ? '#d1fae5' : '#f3f4f6', color: item.isActive ? '#065f46' : '#6b7280' }}>
                      {item.isActive ? '✓ 啟用' : '停用'}
                    </button>
                  </td>
                  <td style={s.td}>
                    <button style={s.btnEdit} onClick={() => handleEdit(item)}>編輯</button>
                    <button style={s.btnDel} onClick={() => handleDelete(item.id)}>刪除</button>
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

export default function AdminPage() {
  const { role, roleInfo, logout } = useAuth()
  const navigate = useNavigate()
  const units = roleInfo?.unitCodes ?? []
  const [activeUnit, setActiveUnit] = useState(units[0] ?? 'W52')

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div style={s.page}>
      {/* Navbar */}
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

      <main style={s.main}>
        <h2 style={s.sectionTitle}>▌ 跑馬燈管理</h2>

        {/* Tab bar */}
        <div style={s.tabs}>
          {units.map(u => (
            <button key={u} style={{ ...s.tab, ...(activeUnit === u ? s.tabActive : {}) }}
              onClick={() => setActiveUnit(u)}>
              {UNIT_LABELS[u]}
            </button>
          ))}
        </div>

        {/* Content */}
        <MarqueeTab key={activeUnit} unitCode={activeUnit} />
      </main>
    </div>
  )
}

/* ── Styles ── */
const s = {
  page: { minHeight: '100vh', background: '#f4f6f9', fontFamily: '"Microsoft JhengHei","Segoe UI",sans-serif' },
  nav: { background: '#1a2332', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' },
  navLeft: { display: 'flex', alignItems: 'center', gap: '10px' },
  navLogo: { fontSize: '22px' },
  navTitle: { color: '#e2e8f0', fontSize: '17px', fontWeight: '700' },
  navRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  roleBadge: { background: '#2D7A55', color: '#fff', padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: '600' },
  logoutBtn: { background: 'transparent', border: '1px solid #4a5568', color: '#a0aec0', padding: '5px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' },
  main: { maxWidth: '960px', margin: '0 auto', padding: '28px 20px 60px' },
  sectionTitle: { fontSize: '18px', color: '#0f3460', margin: '0 0 20px', paddingLeft: '12px', borderLeft: '4px solid #2e7dff' },
  tabs: { display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '2px solid #e5e7eb', paddingBottom: '0' },
  tab: { padding: '10px 20px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '15px', fontWeight: '600', color: '#6b7280', borderRadius: '6px 6px 0 0', fontFamily: 'inherit', borderBottom: '2px solid transparent', marginBottom: '-2px' },
  tabActive: { color: '#2D7A55', borderBottomColor: '#2D7A55', background: '#f0fdf4' },
  msg: { padding: '10px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' },
  formCard: { background: '#fff', borderRadius: '10px', padding: '20px 24px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  listCard: { background: '#fff', borderRadius: '10px', padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  formTitle: { margin: '0 0 16px', fontSize: '15px', color: '#374151', fontWeight: '700' },
  formRow: { marginBottom: '12px' },
  label: { display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '4px', fontWeight: '500' },
  input: { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box' },
  btnPrimary: { padding: '9px 20px', background: '#2D7A55', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' },
  btnSecondary: { padding: '9px 20px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { padding: '10px 12px', background: '#2D7A55', color: '#fff', textAlign: 'left', fontWeight: '600' },
  td: { padding: '9px 12px', borderBottom: '1px solid #e5e7eb', verticalAlign: 'middle' },
  badge: { padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', border: 'none', cursor: 'pointer' },
  btnEdit: { padding: '4px 12px', background: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', marginRight: '4px', fontFamily: 'inherit' },
  btnDel: { padding: '4px 12px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' },
}
