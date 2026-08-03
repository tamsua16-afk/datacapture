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
  const [showDemoAccounts, setShowDemoAccounts] = useState(true) // Mặc định mở tài khoản demo cho dễ chọn

  async function executeLogin(targetEmail: string, targetPass: string) {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: targetPass }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error?.message ?? 'Đăng nhập thất bại. Vui lòng kiểm tra lại.')
        setLoading(false)
        return
      }

      // Redirect dựa theo role
      const role = data.user?.role
      let targetUrl = '/mobile'
      if (role === 'WAREHOUSE_ACCOUNTANT' || role === 'ACCOUNTING_MANAGER') {
        targetUrl = '/accounting/queue'
      } else if (role === 'ADMIN') {
        targetUrl = '/admin/users'
      } else if (role === 'VIEWER') {
        targetUrl = '/dashboard'
      }

      router.push(targetUrl)
      router.refresh()
    } catch {
      setError('Lỗi kết nối máy chủ. Vui lòng thử lại.')
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      setError('Vui lòng nhập Email và Mật khẩu')
      return
    }
    await executeLogin(email, password)
  }

  async function selectDemoUser(user: DemoUser) {
    setEmail(user.email)
    setPassword(user.password)
    setError(null)
    await executeLogin(user.email, user.password)
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8, color: '#0f172a', letterSpacing: '-0.02em' }}>
        Đăng nhập
      </h2>
      <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 20 }}>
        Chọn tài khoản demo hoặc nhập thông tin đăng nhập
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {/* Email */}
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="email" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9375rem',
              outline: 'none',
              boxSizing: 'border-box',
              background: '#f8fafc',
            }}
            placeholder="staff@demo.local"
            aria-label="Địa chỉ email"
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: 18 }}>
          <label htmlFor="password" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
            Mật khẩu
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9375rem',
              outline: 'none',
              boxSizing: 'border-box',
              background: '#f8fafc',
            }}
            placeholder="••••••••"
            aria-label="Mật khẩu"
          />
        </div>

        {/* Error Notification */}
        {error && (
          <div style={{
            padding: '10px 14px',
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '10px',
            color: '#991b1b',
            fontSize: '0.8125rem',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }} role="alert">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '12px',
            background: loading ? '#94a3b8' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: 'white',
            fontWeight: 600,
            fontSize: '0.9375rem',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: 16,
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.15s ease',
          }}
          aria-label="Đăng nhập vào hệ thống"
        >
          {loading ? (
            <>
              <span className="spinner" />
              Đang xác thực...
            </>
          ) : (
            'Đăng nhập'
          )}
        </button>

        {/* Toggle Demo Accounts Button */}
        <button
          type="button"
          onClick={() => setShowDemoAccounts(!showDemoAccounts)}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '10px',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            color: '#334155',
            fontWeight: 600,
            fontSize: '0.8125rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
          aria-expanded={showDemoAccounts}
          aria-label="Danh sách tài khoản Demo"
        >
          <span>🧑‍💼 Chọn nhanh tài khoản Demo</span>
          <span style={{ fontSize: '0.75rem' }}>{showDemoAccounts ? '▲' : '▼'}</span>
        </button>

        {/* Demo Users Quick Picker */}
        {showDemoAccounts && (
          <div style={{
            marginTop: 12,
            border: '1px solid #cbd5e1',
            borderRadius: 12,
            overflow: 'hidden',
            background: '#ffffff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          }}>
            {DEMO_USERS.map((user) => (
              <button
                key={user.email}
                type="button"
                onClick={() => selectDemoUser(user)}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '10px 14px',
                  borderBottom: '1px solid #f1f5f9',
                  background: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderTop: 'none',
                  textAlign: 'left',
                  cursor: loading ? 'wait' : 'pointer',
                  transition: 'background 0.15s ease',
                  minHeight: 44,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                aria-label={`Đăng nhập nhanh vai trò ${user.role}`}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>
                    {user.label}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {user.email}
                  </div>
                </div>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#2563eb',
                  background: '#dbeafe',
                  padding: '4px 8px',
                  borderRadius: '6px',
                }}>
                  Đăng nhập →
                </span>
              </button>
            ))}
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
