import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { verifySignedUrlToken } from '@/lib/services/storage'
import { getRawClient } from '@/lib/database/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token || !verifySignedUrlToken(id, token)) {
    return NextResponse.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Signed URL không hợp lệ hoặc đã hết hạn truy cập',
        },
      },
      { status: 403 }
    )
  }

  try {
    const client = getRawClient()
    const result = await client.execute({
      sql: `SELECT * FROM attachments WHERE id = ? LIMIT 1`,
      args: [id],
    })

    if (result.rows.length === 0) {
      // Direct file serving for temp generated signed URLs in demo mode
      const placeholderSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
          <rect width="400" height="300" fill="#f1f5f9"/>
          <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#64748b">
            Xưởng Data Capture – Private Storage File
          </text>
        </svg>
      `
      return new NextResponse(placeholderSvg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'private, max-age=3600',
        },
      })
    }

    const att = result.rows[0] as any
    const uploadsBaseDir = path.resolve(process.cwd(), 'data', 'uploads')
    const fullPath = path.resolve(uploadsBaseDir, att.storage_path)

    // Security: Prevent path traversal outside data/uploads
    if (!fullPath.startsWith(uploadsBaseDir)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Truy cập đường dẫn tệp không hợp lệ (Path Traversal bị chặn)' } },
        { status: 403 }
      )
    }

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Tệp không tồn tại trên hệ thống storage' } },
        { status: 404 }
      )
    }

    const fileBuffer = fs.readFileSync(fullPath)
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': att.mime_type || 'image/jpeg',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    )
  }
}
