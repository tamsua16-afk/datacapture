import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

// Tự động khởi tạo database khi server khởi động lần đầu (Demo Mode)
if (process.env.DEMO_MODE === 'true') {
  import('@/lib/database/init').then(({ ensureDbInitialized }) => {
    ensureDbInitialized().catch(console.error)
  })
}

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Data Capture - Ứng dụng số hóa',
    template: '%s | Data Capture - Ứng dụng số hóa',
  },
  description: 'Hệ thống số hóa phiếu nhập xuất kho – trích xuất dữ liệu bằng AI',
  keywords: ['kho', 'nhập kho', 'xuất kho', 'kiểm kê', 'AI', 'OCR', 'phiếu kho'],
  authors: [{ name: 'Data Capture - Ứng dụng số hóa' }],
  creator: 'Data Capture - Ứng dụng số hóa',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DC',
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'Data Capture - Ứng dụng số hóa',
    title: 'Data Capture - Ứng dụng số hóa',
    description: 'Hệ thống số hóa phiếu nhập xuất kho – trích xuất dữ liệu bằng AI',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1e40af' },
    { media: '(prefers-color-scheme: dark)', color: '#1e3a8a' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icons/icon-192.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
