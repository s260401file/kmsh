// useCrudSection.js — 後台管理 CRUD 區塊共用邏輯
// 抽取 AdminPage 內大量重複的「list/form/editId/msg + load/submit/edit/delete/toggle」樣板。
// 呼叫端的 Section 元件多半以 key={unitCode} 被父層 Manager 整個重建（切單位＝重掛載），
// 故 fetchList 只需在掛載時執行一次；用 ref 保存最新的 fetchList 閉包，
// 避免把 unitCode 等外部值放進 useCallback deps（違反本專案 eslint 對 deps 陣列字面量的要求）。
import { useState, useEffect, useCallback, useRef } from 'react'

export function useCrudSection({ emptyForm, fetchList, create, update, remove, toPayload, toForm, failMsg = '操作失敗' }) {
  const [list, setList] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [msg, setMsg] = useState({ text: '', error: false })

  const fetchListRef = useRef(fetchList)
  useEffect(() => { fetchListRef.current = fetchList })

  const showMsg = useCallback((text, error = false) => {
    setMsg({ text, error })
    setTimeout(() => setMsg({ text: '', error: false }), 3000)
  }, [])

  const load = useCallback(async () => {
    try { setList((await fetchListRef.current()) ?? []) }
    catch { showMsg('讀取失敗', true) }
  }, [showMsg])

  useEffect(() => { load() }, [load])

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const resetForm = () => { setForm(emptyForm); setEditId(null) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = toPayload(form)
    try {
      if (editId) { await update(editId, payload); showMsg('修改成功') }
      else { await create(payload); showMsg('新增成功') }
      resetForm(); load()
    } catch { showMsg(failMsg, true) }
  }

  const handleEdit = (item) => { setEditId(item.id); setForm(toForm(item)) }

  const handleDelete = async (id, confirmMsg = '確定刪除？') => {
    if (!window.confirm(confirmMsg)) return
    try { await remove(id); showMsg('刪除成功'); load() }
    catch { showMsg('刪除失敗', true) }
  }

  // 僅切換 isActive；沿用 toPayload 附加該 Section 固定的情境欄位（如 unitCode/category）
  const handleToggle = async (item) => {
    try { await update(item.id, toPayload({ ...item, isActive: !item.isActive })); load() }
    catch { showMsg('操作失敗', true) }
  }

  return { list, form, setForm, setField, editId, msg, showMsg, load, handleSubmit, handleEdit, handleDelete, handleToggle, resetForm }
}
