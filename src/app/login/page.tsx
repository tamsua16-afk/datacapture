import type { Metadata } from 'next'
import LoginForm from './LoginForm'

export const metadata: Metadata = {
  title: 'Đăng nhập',
  description: 'Đăng nhập vào hệ thống Data Capture - Ứng dụng số hóa',
}

export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="login-bg">
        <div className="login-bg-orb login-bg-orb-1" />
        <div className="login-bg-orb login-bg-orb-2" />
        <div className="login-bg-orb login-bg-orb-3" />
      </div>

      <div className="login-container">
        {/* Logo & Header */}
        <div className="login-header animate-slide-up">
          <div className="login-logo">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
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
        <div className="login-card card card-elevated animate-fade-in">
          <LoginForm />
        </div>

        {/* Demo Accounts Info */}
        <div className="login-demo-hint animate-fade-in">
          <p>
            <span className="demo-badge">DEMO</span>
            Dùng tài khoản mẫu để khám phá hệ thống
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
          overflow: hidden;
        }

        .login-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .login-bg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.15;
          animation: float 8s ease-in-out infinite;
        }

        .login-bg-orb-1 {
          width: 400px; height: 400px;
          background: #3b82f6;
          top: -100px; left: -100px;
          animation-delay: 0s;
        }

        .login-bg-orb-2 {
          width: 300px; height: 300px;
          background: #60a5fa;
          bottom: -50px; right: -50px;
          animation-delay: -3s;
        }

        .login-bg-orb-3 {
          width: 250px; height: 250px;
          background: #93c5fd;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          animation-delay: -6s;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }

        .login-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
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
          gap: 12px;
        }

        .login-logo {
          width: 72px;
          height: 72px;
          background: rgba(255,255,255,0.1);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,255,255,0.2);
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }

        .login-title {
          font-size: 1.75rem;
          font-weight: 700;
          letter-spacing: -0.03em;
          margin: 0;
          color: white;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .login-subtitle {
          font-size: 0.9375rem;
          color: rgba(255,255,255,0.7);
          margin: 0;
          letter-spacing: -0.01em;
        }

        .login-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 32px;
          border: 1px solid rgba(255,255,255,0.3);
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }

        .login-demo-hint {
          text-align: center;
          color: rgba(255,255,255,0.6);
          font-size: 0.8125rem;
        }

        .demo-badge {
          display: inline-block;
          background: rgba(59, 130, 246, 0.3);
          color: #93c5fd;
          border: 1px solid rgba(59, 130, 246, 0.4);
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          margin-right: 6px;
        }
      `}</style>
    </main>
  )
}
