import type { Metadata } from 'next'
import LoginForm from './LoginForm'

export const metadata: Metadata = {
  title: 'Đăng nhập',
  description: 'Đăng nhập vào hệ thống Data Capture - Ứng dụng số hóa',
}

export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="login-container">
        {/* Logo & Header */}
        <div className="login-header">
          <div className="login-logo">
            <svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect width="48" height="48" rx="14" fill="url(#logoGrad)" />
              <path d="M12 16L24 10L36 16V32L24 38L12 32V16Z" stroke="white" strokeWidth="2.5" strokeLinejoin="round" fill="none" />
              <path d="M24 10V38M12 16L36 32M36 16L12 32" stroke="white" strokeWidth="1.5" strokeOpacity="0.5" />
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="48" y2="48">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#1e40af" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="login-title">Data Capture - Ứng dụng số hóa</h1>
          <p className="login-subtitle">Hệ thống số hóa phiếu kho bằng AI</p>
        </div>

        {/* Login Card */}
        <div className="login-card">
          <LoginForm />
        </div>

        {/* Demo Accounts Info */}
        <div className="login-demo-hint">
          <p>
            <span className="demo-badge">DEMO MODE</span>
            Bấm nút &quot;Đăng nhập →&quot; cạnh vai trò bất kỳ để vào trải nghiệm ngay
          </p>
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #172554 100%);
          position: relative;
          box-sizing: border-box;
        }

        .login-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 440px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .login-header {
          text-align: center;
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .login-logo {
          width: 64px;
          height: 64px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }

        .login-title {
          font-size: 1.625rem;
          font-weight: 700;
          letter-spacing: -0.03em;
          margin: 0;
          color: white;
        }

        .login-subtitle {
          font-size: 0.9375rem;
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
        }

        .login-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 28px 24px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 20px 40px rgba(0,0,0,0.25);
        }

        .login-demo-hint {
          text-align: center;
          color: rgba(255, 255, 255, 0.75);
          font-size: 0.8125rem;
        }

        .demo-badge {
          display: inline-block;
          background: rgba(59, 130, 246, 0.4);
          color: #bfdbfe;
          border: 1px solid rgba(147, 197, 253, 0.4);
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          margin-right: 6px;
        }
      `}</style>
    </main>
  )
}
