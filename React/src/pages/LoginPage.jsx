import { useNavigate } from 'react-router-dom'
import { useAuth, ROLES } from '../context/AuthContext'

const ROLE_COLORS = {
  admin: '#2D7A55',
  w52:   '#1565C0',
  icu:   '#6A1B9A',
  or:    '#1A7040',
  er:    '#C62828',
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = (role) => {
    login(role)
    navigate('/admin')
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>🏥</div>
        <h1 style={styles.title}>護理白板系統</h1>
        <p style={styles.subtitle}>管理後台</p>

        <div style={styles.divider} />

        <p style={styles.hint}>請選擇登入身份</p>

        <div style={styles.btnGrid}>
          {Object.entries(ROLES).map(([role, { label }]) => (
            <button
              key={role}
              style={{ ...styles.roleBtn, background: ROLE_COLORS[role] }}
              onClick={() => handleLogin(role)}
            >
              {label}
            </button>
          ))}
        </div>

        <p style={styles.devNote}>※ 開發模式：點擊直接登入，正式環境將需要密碼驗證</p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f0f4f8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '"Microsoft JhengHei", "Segoe UI", sans-serif',
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '48px 40px',
    width: '420px',
    maxWidth: '90vw',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    textAlign: 'center',
  },
  logo: { fontSize: '48px', marginBottom: '12px' },
  title: { margin: '0 0 4px', fontSize: '24px', fontWeight: '800', color: '#1a2635' },
  subtitle: { margin: '0', fontSize: '16px', color: '#6b7c93' },
  divider: { height: '1px', background: '#e5e7eb', margin: '28px 0' },
  hint: { margin: '0 0 20px', fontSize: '15px', color: '#374151', fontWeight: '600' },
  btnGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '24px',
  },
  roleBtn: {
    padding: '14px',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'opacity .15s, transform .1s',
  },
  devNote: {
    margin: '0',
    fontSize: '12px',
    color: '#9ca3af',
    lineHeight: '1.5',
  },
}
