'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DemoUser {
  email: string
  label: string
  role: string
  password: string
}

const DEMO_USERS: DemoUser[] = [
  { email: 'staff@demo.local',             role: 'Nhân viên xưởng',      label: '👷 Nhân viên xưởng',    password: 'demo1234' },
  { email: 'manager@demo.local',           role: 'Xưởng trưởng',         label: '🏭 Xưởng trưởng',       password: 'demo1234' },
  { email: 'accountant@demo.local',        role: 'Kế toán kho',           label: '📊 Kế toán kho',        password: 'demo1234' },
  { email: 'accounting.manager@demo.local',role: 'Kế toán tổng hợp',     label: '📈 Kế toán tổng hợp',   password: 'demo1234' },
  { email: 'admin@demo.local',             role: 'Quản trị hệ thống',     label: '⚙️ Quản trị hệ thống',  password: 'demo1234' },
  { email: 'viewer@demo.local',            role: 'Ban lãnh đạo',          label: '👁️ Ban lãnh đạo',       password: 'demo1234' },
]

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDemoAccounts, setShowDemoAccounts] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error?.message ?? 'Đăng nhập thất bại. Vui lòng kiểm tra lại.')
        return
      }

      // Redirect dựa theo role
      const role = data.user?.role
      if (role === 'WAREHOUSE_ACCOUNTANT' || role === 'ACCOUNTING_MANAGER') {
        router.push('/accounting/queue')
      } else if (role === 'ADMIN') {
        router.push('/admin/users')
      } else if (role === 'VIEWER') {
        router.push('/dashboard')
      } else {
        router.push('/mobile')
      }
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  function fillDemo(user: DemoUser) {
    setEmail(user.email)
    setPassword(user.password)
    setShowDemoAccounts(false)
    setError(null)
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
        Đăng nhập
      </h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 24 }}>
        Nhập thông tin tài khoản của bạn
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {/* Email */}
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="email" className="form-label">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="form-input"
            placeholder="ban@congty.vn"
            aria-label="Địa chỉ email"
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="password" className="form-label">
            Mật khẩu
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="form-input"
            placeholder="••••••••"
            aria-label="Mật khẩu"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="warning-block warning-error" role="alert" style={{ marginBottom: 16 }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          className="btn-mobile btn-primary"
          style={{ width: '100%', marginBottom: 12 }}
          disabled={loading || !email || !password}
          aria-label="Đăng nhập vào hệ thống"
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="spinner" />
              Đang đăng nhập...
            </span>
          ) : 'Đăng nhập'}
        </button>

        {/* Demo accounts */}
        <button
          type="button"
          onClick={() => setShowDemoAccounts(!showDemoAccounts)}
          className="btn-mobile btn-secondary"
          style={{ width: '100%' }}
          aria-expanded={showDemoAccounts}
          aria-label="Xem tài khoản demo"
        >
          🧑‍💼 Tài khoản Demo {showDemoAccounts ? '▲' : '▼'}
        </button>

        {showDemoAccounts && (
          <div style={{
            marginTop: 12,
            border: '1.5px solid var(--color-primary-100)',
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            {DEMO_USERS.map((user) => (
              <button
                key={user.email}
                type="button"
                onClick={() => fillDemo(user)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: '100%',
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--color-border)',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background var(--transition-fast)',
                  minHeight: 44,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-50)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                aria-label={`Đăng nhập với tài khoản ${user.role}`}
              >
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
                  {user.label}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {user.email}
                </span>
              </button>
            ))}
            <div style={{ padding: '8px 16px', background: 'var(--color-surface-muted)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Mật khẩu demo: <strong>demo1234</strong>
            </div>
          </div>
        )}
      </form>

      <style>{`
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          display: inline-block;
          flex-shrink: 0;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
