import { Suspense } from 'react'
import type { Metadata } from 'next'
import CaptureWizard from '@/components/mobile/CaptureWizard'

export const metadata: Metadata = {
  title: 'Tạo phiếu kho mới',
}

export default function NewTransactionPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Đang tải...</div>}>
      <CaptureWizard />
    </Suspense>
  )
}
