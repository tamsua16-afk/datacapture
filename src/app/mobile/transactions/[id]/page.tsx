import type { Metadata } from 'next'
import Link from 'next/link'
import { getTransactionById } from '@/lib/services/transactions'
import { TRANSACTION_TYPE_LABELS, TRANSACTION_STATUS_LABELS } from '@/types/enums'

export const metadata: Metadata = {
  title: 'Chi tiết phiếu kho',
}

export default async function MobileTransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const tx = await getTransactionById(id)

  const isDemo = !tx

  const displayData = tx || {
    id,
    transactionCode: 'NK-20240730-1092',
    transactionType: 'PURCHASE_RECEIPT',
    workshopName: 'Xưởng Bê tông Đô Thành',
    sourceWarehouseName: 'Kho Nguyên Vật Liệu',
    documentNumber: 'HD-99201',
    status: 'AI_EXTRACTED',
    overallConfidence: 0.94,
    notes: 'Phiếu giao hàng xi măng đợt 1',
    attachments: [
      {
        id: 'att-1',
        originalFilename: 'phieu_nhap_xi_mang.jpg',
        fileSize: 485000,
        fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      },
    ],
    lines: [
      {
        lineNumber: 1,
        rawItemName: 'Xi măng PCB40',
        confirmedUnit: 'bao',
        confirmedQuantity: 50,
        itemConfidence: 0.96,
        lineStatus: 'OK',
      },
      {
        lineNumber: 2,
        rawItemName: 'Thép D10 Hòa Phát',
        confirmedUnit: 'kg',
        confirmedQuantity: 1200,
        itemConfidence: 0.92,
        lineStatus: 'OK',
      },
    ],
  }

  return (
    <div className="tx-detail-page">
      <header className="page-header glass">
        <Link href="/mobile/transactions" className="back-link">
          ← Danh sách
        </Link>
        <h1 className="header-title">{displayData.transactionCode}</h1>
        <span className={`status-badge status-${displayData.status}`}>
          {TRANSACTION_STATUS_LABELS[displayData.status as keyof typeof TRANSACTION_STATUS_LABELS] || displayData.status}
        </span>
      </header>

      <main className="page-content">
        <div className="card info-card">
          <h2 className="card-heading">Thông tin phiếu</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Loại giao dịch:</span>
              <span className="value">
                {TRANSACTION_TYPE_LABELS[displayData.transactionType as keyof typeof TRANSACTION_TYPE_LABELS]}
              </span>
            </div>

            <div className="info-item">
              <span className="label">Xưởng:</span>
              <span className="value">{displayData.workshopName || '---'}</span>
            </div>

            <div className="info-item">
              <span className="label">Kho nguồn:</span>
              <span className="value">{displayData.sourceWarehouseName || '---'}</span>
            </div>

            <div className="info-item">
              <span className="label">Số chứng từ:</span>
              <span className="value">{displayData.documentNumber || '---'}</span>
            </div>
          </div>
        </div>

        {/* Attachments Card */}
        <div className="card attachments-card">
          <h2 className="card-heading">Ảnh chứng từ gốc ({displayData.attachments.length})</h2>
          <div className="att-list">
            {displayData.attachments.map((att: any) => (
              <div key={att.id} className="att-item">
                <span className="att-icon">📷</span>
                <div className="att-info">
                  <span className="att-name">{att.originalFilename}</span>
                  <span className="att-meta">
                    {(att.fileSize / 1024).toFixed(1)} KB • SHA-256: {att.fileHash.slice(0, 12)}...
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Extracted Lines Card */}
        <div className="card lines-card">
          <div className="lines-header">
            <h2 className="card-heading">Kết quả trích xuất AI</h2>
            {displayData.overallConfidence && (
              <span className="confidence-badge">
                Độ tin cậy: {(displayData.overallConfidence * 100).toFixed(0)}%
              </span>
            )}
          </div>

          <div className="lines-table-container">
            <table className="lines-table">
              aria-label="Danh sách mặt hàng trích xuất"
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên vật tư (AI)</th>
                  <th>ĐVT</th>
                  <th>Số lượng</th>
                </tr>
              </thead>
              <tbody>
                {displayData.lines.map((line: any) => (
                  <tr key={line.lineNumber}>
                    <td className="text-center">{line.lineNumber}</td>
                    <td className="font-semibold">{line.rawItemName}</td>
                    <td>{line.confirmedUnit || '---'}</td>
                    <td className="font-bold text-right">{line.confirmedQuantity ?? '---'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <style>{`
        .tx-detail-page {
          min-height: 100dvh;
          background: #f8fafc;
          padding-bottom: 40px;
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
        }

        .header-title {
          font-size: 1rem;
          font-weight: 700;
          font-family: var(--font-mono, monospace);
          margin: 0;
        }

        .status-badge {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 6px;
        }

        .status-AI_EXTRACTED { background: #f0fdf4; color: #15803d; }
        .status-DRAFT { background: #f1f5f9; color: #475569; }

        .page-content {
          padding: 16px;
          max-width: 600px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .card {
          padding: 16px;
          background: #fff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .card-heading {
          font-size: 0.9375rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 12px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          font-size: 0.8125rem;
        }

        .info-item {
          display: flex;
          flex-direction: column;
        }

        .info-item .label {
          color: #64748b;
          font-size: 0.75rem;
        }

        .info-item .value {
          font-weight: 600;
          color: #0f172a;
        }

        .att-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .att-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          background: #f8fafc;
          border-radius: 8px;
        }

        .att-icon { font-size: 1.25rem; }

        .att-info {
          display: flex;
          flex-direction: column;
        }

        .att-name {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #0f172a;
        }

        .att-meta {
          font-size: 0.6875rem;
          color: #64748b;
        }

        .lines-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .confidence-badge {
          font-size: 0.75rem;
          font-weight: 600;
          color: #047857;
          background: #ecfdf5;
          padding: 2px 8px;
          border-radius: 10px;
        }

        .lines-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8125rem;
        }

        .lines-table th, .lines-table td {
          padding: 8px 6px;
          border-bottom: 1px solid #f1f5f9;
        }

        .lines-table th {
          text-align: left;
          color: #64748b;
          font-weight: 600;
        }

        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-semibold { font-weight: 600; }
        .font-bold { font-weight: 700; }
      `}</style>
    </div>
  )
}
