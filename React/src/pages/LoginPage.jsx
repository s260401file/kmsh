// LoginPage.jsx — 管理後台登入頁
// 以「員編＋密碼」登入（後端 AD／LDAP 認證；過渡期 LDAP 未啟用時密碼可留空、以員編登入）。
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import * as wardApi from '../services/wardApi'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [empNo, setEmpNo] = useState('')
  const [pwd, setPwd] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!empNo.trim()) { setErr('請輸入員編'); return }
    setErr(''); setBusy(true)
    try {
      const identity = await wardApi.login(empNo.trim(), pwd)
      login(identity)
      navigate('/admin')
    } catch (ex) {
      setErr(ex.message || '登入失敗')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={styles.page}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <div style={styles.logo}>🏥</div>
        <h1 style={styles.title}>護理白板系統</h1>
        <p style={styles.subtitle}>管理後台登入</p>

        <div style={styles.divider} />

        <input style={styles.input} placeholder="員編" value={empNo} autoFocus
          onChange={e => setEmpNo(e.target.value)} />
        <input style={styles.input} type="password" placeholder="密碼" value={pwd}
          onChange={e => setPwd(e.target.value)} />

        {err && <div style={styles.err}>{err}</div>}

        <button style={{ ...styles.btn, opacity: busy ? 0.6 : 1 }} type="submit" disabled={busy}>
          {busy ? '登入中…' : '登入'}
        </button>

        <div style={styles.info}>
          <div style={styles.infoTitle}>📢 登入方式已更新（改用 AD 帳號）</div>
          <div>‧ 帳號：您的<b>員編</b></div>
          <div>‧ 初始密碼：<b>Kmsh@</b> 加上您的員編</div>
          <div style={{ color: '#527a63' }}>　例：員編 <b>MB69</b> → 密碼 <b>Kmsh@MB69</b></div>
          <div style={styles.infoNote}>忘記或需修改密碼，請洽資訊室。</div>
        </div>
      </form>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Microsoft JhengHei", "Segoe UI", sans-serif' },
  card: { background: '#fff', borderRadius: '16px', padding: '48px 40px', width: '380px', maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', textAlign: 'center', display: 'flex', flexDirection: 'column' },
  logo: { fontSize: '48px', lineHeight: '1', marginBottom: '24px' },
  title: { margin: '0 0 4px', fontSize: '24px', fontWeight: '800', color: '#1a2635' },
  subtitle: { margin: '0', fontSize: '16px', color: '#6b7c93' },
  divider: { height: '1px', background: '#e5e7eb', margin: '28px 0 20px' },
  input: { padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '16px', fontFamily: 'inherit', marginBottom: '12px', outline: 'none' },
  err: { color: '#b91c1c', background: '#fee2e2', borderRadius: '8px', padding: '8px 10px', fontSize: '14px', marginBottom: '12px' },
  btn: { padding: '13px', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', background: '#2D7A55', marginTop: '4px' },
  devNote: { margin: '18px 0 0', fontSize: '12px', color: '#9ca3af', lineHeight: '1.5' },
  info: { marginTop: '18px', textAlign: 'left', background: '#f0f7f3', border: '1px solid #cfe6da', borderRadius: '10px', padding: '12px 14px', fontSize: '13.5px', lineHeight: '1.7', color: '#274a3a' },
  infoTitle: { fontWeight: '800', color: '#1A7040', marginBottom: '6px', fontSize: '14px' },
  infoRow: { display: 'flex', gap: '8px' },
  infoLbl: { flex: '0 0 60px', color: '#6b7c93', fontWeight: '700' },
  infoNote: { marginTop: '6px', color: '#9ca3af', fontSize: '12.5px' },
}
