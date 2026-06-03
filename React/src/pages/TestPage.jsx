import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import * as textApi from '../services/textApi'

const emptyForm = { title: '', content: '', category: '', unitCode: '', sortOrder: 0 }

function TestPage() {
  const [list, setList] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [msg, setMsg] = useState({ text: '', error: false })
  const [loading, setLoading] = useState(false)

  const load = async () => {
    try {
      const data = await textApi.getAll()
      setList(data)
    } catch (e) {
      showMsg(e.message, true)
    }
  }

  useEffect(() => { load() }, [])

  const showMsg = (text, error = false) => {
    setMsg({ text, error })
    setTimeout(() => setMsg({ text: '', error: false }), 3000)
  }

  const handleChange = e => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: name === 'sortOrder' ? Number(value) : value }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      if (editId) {
        await textApi.update(editId, { ...form, isActive: true })
        showMsg('修改成功')
      } else {
        await textApi.create(form)
        showMsg('新增成功')
      }
      setForm(emptyForm)
      setEditId(null)
      await load()
    } catch (err) {
      showMsg(err.message, true)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = item => {
    setEditId(item.id)
    setForm({
      title: item.title ?? '',
      content: item.content,
      category: item.category ?? '',
      unitCode: item.unitCode ?? '',
      sortOrder: item.sortOrder,
    })
    window.scrollTo(0, 0)
  }

  const handleDelete = async id => {
    if (!window.confirm('確定刪除？')) return
    try {
      await textApi.remove(id)
      showMsg('刪除成功')
      await load()
    } catch (err) {
      showMsg(err.message, true)
    }
  }

  const handleCancel = () => {
    setForm(emptyForm)
    setEditId(null)
  }

  return (
    <div style={{ padding: 24, maxWidth: 860, margin: '0 auto' }}>
      <Link to="/">← 返回首頁</Link>
      <h1>Text CRUD 測試</h1>

      {msg.text && (
        <p style={{ padding: '8px 12px', background: msg.error ? '#fee' : '#efe', border: `1px solid ${msg.error ? '#f99' : '#9c9'}` }}>
          {msg.text}
        </p>
      )}

      {/* ── 表單 ── */}
      <fieldset style={{ marginBottom: 32, padding: 16 }}>
        <legend><strong>{editId ? `修改（Id: ${editId}）` : '新增'}</strong></legend>
        <form onSubmit={handleSubmit}>
          <table>
            <tbody>
              <tr>
                <td style={{ paddingRight: 8 }}>Title</td>
                <td><input name="title" value={form.title} onChange={handleChange} /></td>
              </tr>
              <tr>
                <td>Content *</td>
                <td><textarea name="content" value={form.content} onChange={handleChange} required rows={3} style={{ width: 360 }} /></td>
              </tr>
              <tr>
                <td>Category</td>
                <td><input name="category" value={form.category} onChange={handleChange} /></td>
              </tr>
              <tr>
                <td>UnitCode</td>
                <td><input name="unitCode" value={form.unitCode} onChange={handleChange} /></td>
              </tr>
              <tr>
                <td>SortOrder</td>
                <td><input name="sortOrder" type="number" value={form.sortOrder} onChange={handleChange} style={{ width: 80 }} /></td>
              </tr>
            </tbody>
          </table>
          <div style={{ marginTop: 12 }}>
            <button type="submit" disabled={loading}>{editId ? '儲存修改' : '新增'}</button>
            {editId && (
              <button type="button" onClick={handleCancel} style={{ marginLeft: 8 }}>取消</button>
            )}
          </div>
        </form>
      </fieldset>

      {/* ── 清單 ── */}
      <h2>清單（共 {list.length} 筆）</h2>
      {list.length === 0 ? (
        <p>尚無資料</p>
      ) : (
        <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead style={{ background: '#f0f0f0' }}>
            <tr>
              <th>Id</th>
              <th>Title</th>
              <th>Content</th>
              <th>Category</th>
              <th>UnitCode</th>
              <th>Sort</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map(item => (
              <tr key={item.id} style={{ background: editId === item.id ? '#fff9e6' : '' }}>
                <td>{item.id}</td>
                <td>{item.title}</td>
                <td>{item.content}</td>
                <td>{item.category}</td>
                <td>{item.unitCode}</td>
                <td>{item.sortOrder}</td>
                <td>
                  <button onClick={() => handleEdit(item)}>修改</button>
                  <button onClick={() => handleDelete(item.id)} style={{ marginLeft: 4 }}>刪除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default TestPage
