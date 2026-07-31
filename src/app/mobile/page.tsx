import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Trang chủ',
}

const MAIN_ACTIONS = [
  {
    id: 'receipt',
    label: 'Nhập kho',
    icon: '📥',
    description: 'Phiếu nhập nguyên vật liệu, hàng hóa',
    href: '/mobile/transactions/new?type=RECEIPT',
    color: 'var(--color-primary-600)',
    bg: '#eff6ff',
    border: '#bfdbfe',
  },
  {
    id: 'issue',
    label: 'Xuất kho',
    icon: '📤',
    description: 'Phiếu xuất nguyên vật liệu, thành phẩm',
    href: '/mobile/transactions/new?type=ISSUE',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
  },
  {
    id: 'transfer',
    label: 'Chuyển kho',
    icon: '🔄',
    description: 'Chuyển hàng giữa các kho trong xưởng',
    href: '/mobile/transactions/new?type=TRANSFER',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
  },
  {
    id: 'stocktake',
    label: 'Kiểm kê',
    icon: '📋',
    description: 'Kiểm kê và đối chiếu tồn kho',
    href: '/mobile/transactions/new?type=STOCKTAKE',
    color: '#047857',
    bg: '#ecfdf5',
    border: '#a7f3d0',
  },
]

export default async function MobileHomePage() {
  const headersList = await headers()
  const userRole = headersList.get('x-user-role') ?? ''

  const roleLabel: Record<string, string> = {
    WORKSHOP_STAFF: 'Nhân viên xưởng',
    WORKSHOP_MANAGER: 'Xưởng trưởng',
    WAREHOUSE_ACCOUNTANT: 'Kế toán kho',
    ACCOUNTING_MANAGER: 'Kế toán tổng hợp',
    ADMIN: 'Quản trị hệ thống',
    VIEWER: 'Ban lãnh đạo',
  }

  return (
    <div className="mobile-home">
      {/* Header */}
      <header className="mobile-header glass">
        <div className="header-content">
          <div className="header-logo">
            <svg width="28" height="28" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <rect width="48" height="48" rx="14" fill="url(#mobileLogoGrad)" />
              <path d="M12 16L24 10L36 16V32L24 38L12 32V16Z" stroke="white" strokeWidth="2.5" strokeLinejoin="round" fill="none" />
              <defs>
                <linearGradient id="mobileLogoGrad" x1="0" y1="0" x2="48" y2="48">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#1e40af" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="header-text">
            <h1 className="header-title">Data Capture - Ứng dụng số hóa</h1>
            <p className="header-subtitle">{roleLabel[userRole] ?? 'Người dùng'}</p>
          </div>
          <Link href="/api/auth/logout" className="logout-btn" aria-label="Đăng xuất">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </Link>
        </div>
      </header>

      <main className="mobile-main">
        {/* Welcome */}
        <section className="welcome-section animate-fade-in">
          <h2 className="welcome-title">Chọn loại giao dịch</h2>
          <p className="welcome-subtitle">Chụp ảnh chứng từ và để AI trích xuất dữ liệu</p>
        </section>

        {/* Main Action Buttons */}
        <section className="action-grid" aria-label="Các loại phiếu">
          {MAIN_ACTIONS.map((action, i) => (
            <Link
              key={action.id}
              href={action.href}
              className="action-card animate-slide-up"
              style={{
                animationDelay: `${i * 80}ms`,
                '--action-color': action.color,
                '--action-bg': action.bg,
                '--action-border': action.border,
              } as React.CSSProperties}
              aria-label={`Tạo phiếu ${action.label}: ${action.description}`}
            >
              <div className="action-icon" aria-hidden="true">{action.icon}</div>
              <div className="action-text">
                <span className="action-label">{action.label}</span>
                <span className="action-desc">{action.description}</span>
              </div>
              <svg className="action-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          ))}
        </section>

        {/* Stats */}
        <section className="stats-section animate-fade-in" aria-label="Thống kê nhanh">
          <h3 className="section-title">Hôm nay</h3>
          <div className="stats-grid">
            <StatCard label="Phiếu đang chờ" value="3" icon="⏳" color="#f59e0b" />
            <StatCard label="Cần bổ sung" value="1" icon="✏️" color="#ef4444" />
            <StatCard label="Đã duyệt" value="5" icon="✅" color="#10b981" />
          </div>
        </section>

        {/* Recent History */}
        <section className="history-section animate-fade-in" aria-label="Lịch sử gần đây">
          <div className="section-header">
            <h3 className="section-title">Phiếu gần đây</h3>
            <Link href="/mobile/transactions" className="see-all-link">Xem tất cả</Link>
          </div>

          <div className="history-list">
            {DEMO_RECENT_TRANSACTIONS.map((tx) => (
              <div key={tx.id} className="history-item card">
                <div className="history-icon">{tx.icon}</div>
                <div className="history-info">
                  <span className="history-code">{tx.code}</span>
                  <span className="history-desc">{tx.description}</span>
                  <span className="history-date">{tx.date}</span>
                </div>
                <span className={`badge badge-${tx.statusClass}`}>{tx.statusLabel}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <style>{`
        .mobile-home {
          min-height: 100dvh;
          background: var(--color-surface-soft);
          padding-bottom: calc(80px + var(--mobile-safe-bottom));
        }

        .mobile-header {
          position: sticky;
          top: 0;
          z-index: 50;
          padding: calc(16px + var(--mobile-safe-top)) 20px 16px;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-logo {
          flex-shrink: 0;
        }

        .header-text {
          flex: 1;
        }

        .header-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--color-primary-800);
          margin: 0;
          letter-spacing: -0.02em;
        }

        .header-subtitle {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin: 0;
        }

        .logout-btn {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          color: var(--color-text-muted);
          transition: all var(--transition-fast);
          text-decoration: none;
          flex-shrink: 0;
        }

        .logout-btn:hover {
          background: var(--color-surface-muted);
          color: var(--color-danger);
        }

        .mobile-main {
          padding: 20px 16px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          max-width: 480px;
          margin: 0 auto;
        }

        .welcome-section {
          text-align: center;
          padding: 4px 0;
        }

        .welcome-title {
          font-size: 1.375rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0 0 4px;
          letter-spacing: -0.02em;
        }

        .welcome-subtitle {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          margin: 0;
        }

        .action-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .action-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 20px 16px;
          background: var(--action-bg);
          border: 1.5px solid var(--action-border);
          border-radius: 16px;
          text-decoration: none;
          transition: all var(--transition-base);
          min-height: 120px;
          position: relative;
          overflow: hidden;
        }

        .action-card:hover, .action-card:active {
          transform: scale(0.97);
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        }

        .action-icon {
          font-size: 2rem;
          margin-bottom: 8px;
          line-height: 1;
        }

        .action-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .action-label {
          font-size: 1rem;
          font-weight: 700;
          color: var(--action-color);
          letter-spacing: -0.02em;
        }

        .action-desc {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          line-height: 1.4;
        }

        .action-arrow {
          position: absolute;
          bottom: 12px;
          right: 12px;
          color: var(--action-color);
          opacity: 0.6;
        }

        .stats-section {}

        .section-title {
          font-size: 1rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0 0 12px;
          letter-spacing: -0.02em;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .history-section {}

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .see-all-link {
          font-size: 0.8125rem;
          color: var(--color-primary-600);
          text-decoration: none;
          font-weight: 500;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .history-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
        }

        .history-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .history-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .history-code {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text-primary);
          font-family: var(--font-mono);
          letter-spacing: 0.02em;
        }

        .history-desc {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .history-date {
          font-size: 0.6875rem;
          color: var(--color-text-muted);
        }
      `}</style>
    </div>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <div className="stat-card card">
      <div className="stat-icon" style={{ fontSize: '1.25rem' }}>{icon}</div>
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
      <style>{`
        .stat-card {
          padding: 16px 12px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .stat-value {
          font-size: 1.75rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1;
        }
        .stat-label {
          font-size: 0.6875rem;
          color: var(--color-text-secondary);
          text-align: center;
          line-height: 1.3;
        }
      `}</style>
    </div>
  )
}

// Demo data for recent transactions display
const DEMO_RECENT_TRANSACTIONS = [
  { id: '1', code: 'NK-2024-001', description: 'Xi măng PCB40 – 2.500 kg', date: '30/07/2024 09:15', icon: '📥', statusLabel: 'Chờ duyệt', statusClass: 'pending' },
  { id: '2', code: 'XK-2024-004', description: 'Thép D10 – 850 kg', date: '29/07/2024 14:30', icon: '📤', statusLabel: 'Đã duyệt', statusClass: 'approved' },
  { id: '3', code: 'NK-2024-002', description: 'Cát vàng – 5.000 kg', date: '29/07/2024 10:00', icon: '📥', statusLabel: 'Cần bổ sung', statusClass: 'warning' },
  { id: '4', code: 'CK-2024-001', description: 'Đá 1x2 – 3.000 kg', date: '28/07/2024 16:45', icon: '🔄', statusLabel: 'Đã ghi sổ', statusClass: 'posted' },
]
