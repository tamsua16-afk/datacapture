import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth/session'
import { getDashboardData, DashboardFilter } from '@/lib/services/dashboardService'

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeRange = (searchParams.get('timeRange') || '30d') as DashboardFilter['timeRange']
    const workshopId = (searchParams.get('workshopId') || 'all') as DashboardFilter['workshopId']

    // Nếu là nhân viên xưởng hoặc quản lý xưởng, áp dụng giới hạn workshopId nếu họ truyền khác xưởng họ
    let effectiveWorkshopId = workshopId
    if (['WORKSHOP_STAFF', 'WORKSHOP_MANAGER'].includes(session.role) && session.workshopId) {
      effectiveWorkshopId = session.workshopId
    }

    const data = await getDashboardData({
      timeRange,
      workshopId: effectiveWorkshopId,
    })

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('API /api/dashboard/stats error:', error)
    return NextResponse.json(
      { error: error.message || 'Lỗi lấy dữ liệu dashboard' },
      { status: 500 }
    )
  }
}
