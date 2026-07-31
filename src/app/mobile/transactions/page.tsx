import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { TRANSACTION_TYPE_LABELS, TRANSACTION_STATUS_LABELS } from '@/types/enums'

export const metadata: Metadata = {
  title: 'Danh sách phiếu kho',
}

export default async function MobileTransactionsListPage() {
  return (
    <div className="transactions-list-page">
      <header className="page-header glass">
        <Link href="/mobile" className="back-link">
          ← Trang chủ
        </Link>
        <h1 className="header-title">Danh sách phiếu kho</h1>
        <Link href="/mobile/transactions/new" className="new-btn">
          + Tạo mới
        </Link>
      </header>

      <main className="page-content">
        <div className="filter-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Tìm theo mã phiếu, xưởng..."
          />
        </div>

        <div className="tx-list">
          {DEMO_TRANSACTIONS.map((tx) => (
            <Link
              key={tx.id}
              href={`/mobile/transactions/${tx.id}`}
              className="tx-card card"
            >
              <div className="tx-header">
                <span className="tx-code">{tx.transactionCode}</span>
                <span className={`status-badge status-${tx.status}`}>
                  {TRANSACTION_STATUS_LABELS[tx.status as keyof typeof TRANSACTION_STATUS_LABELS] || tx.status}
                </span>
              </div>

              <div className="tx-body">
                <span className="tx-type">
                  {TRANSACTION_TYPE_LABELS[tx.transactionType as keyof typeof TRANSACTION_TYPE_LABELS] || tx.transactionType}
                </span>
                <span className="tx-workshop">{tx.workshopName}</span>
              </div>

              <div className="tx-footer">
                <span className="tx-date">{tx.updatedAt}</span>
                <span className="tx-attachments">📷 {tx.attachmentCount} ảnh</span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <style>{`
        .transactions-list-page {
          min-height: 100dvh;
          background: var(--color-surface-soft, #f8fafc);
          padding-bottom: 80px;
        }

        .page-header {
          position: sticky;
          top: 0;
          z-index: 50;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #e2e8f0;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
        }

        .back-link {
          font-size: 0.875rem;
          color: #2563eb;
          text-decoration: none;
          font-weight: 500;
        }

        .header-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .new-btn {
          font-size: 0.875rem;
          font-weight: 600;
          color: #fff;
          background: #2563eb;
          padding: 6px 12px;
          border-radius: 8px;
          text-decoration: none;
        }

        .page-content {
          padding: 16px;
          max-width: 600px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .search-input {
          width: 100%;
          height: 44px;
          padding: 0 14px;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          font-size: 0.875rem;
          background: #fff;
        }

        .tx-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .tx-card {
          padding: 14px;
          background: #fff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .tx-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .tx-code {
          font-family: var(--font-mono, monospace);
          font-weight: 700;
          font-size: 0.9375rem;
          color: #0f172a;
        }

        .status-badge {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 6px;
        }

        .status-DRAFT { background: #f1f5f9; color: #475569; }
        .status-IMAGE_UPLOADED { background: #eff6ff; color: #1d4ed8; }
        .status-AI_EXTRACTED { background: #f0fdf4; color: #15803d; }

        .tx-body {
          display: flex;
          justify-content: space-between;
          font-size: 0.8125rem;
          color: #475569;
        }

        .tx-footer {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: #94a3b8;
          border-top: 1px dashed #f1f5f9;
          padding-top: 6px;
        }
      `}</style>
    </div>
  )
}

const DEMO_TRANSACTIONS = [
  {
    id: 'tx-001',
    transactionCode: 'NK-20240730-1092',
    transactionType: 'PURCHASE_RECEIPT',
    workshopName: 'Xưởng Bê tông Đô Thành',
    status: 'AI_EXTRACTED',
    attachmentCount: 2,
    updatedAt: '30/07/2024 14:20',
  },
  {
    id: 'tx-002',
    transactionCode: 'XK-20240730-8831',
    transactionType: 'MATERIAL_ISSUE',
    workshopName: 'Xưởng Đúc Thép Nam Hà',
    status: 'IMAGE_UPLOADED',
    attachmentCount: 1,
    updatedAt: '30/07/2024 11:45',
  },
  {
    id: 'tx-003',
    transactionCode: 'CK-20240729-3321',
    transactionType: 'TRANSFER_OUT',
    workshopName: 'Xưởng Bê tông Đô Thành',
    status: 'DRAFT',
    attachmentCount: 1,
    updatedAt: '29/07/2024 16:10',
  },
]
