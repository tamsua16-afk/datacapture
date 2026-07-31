import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const isDemo = process.env.DEMO_MODE === 'true'

    return NextResponse.json({
      status: 'ok',
      mode: isDemo ? 'demo' : 'production',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '1.0.0',
    })
  } catch (err) {
    return NextResponse.json(
      { status: 'error', message: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    )
  }
}
