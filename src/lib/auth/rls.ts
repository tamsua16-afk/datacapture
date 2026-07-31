import { SessionUser } from './session'

export interface RLSValidationResult {
  allowed: boolean
  effectiveWorkshopId: string | null
  error?: { status: number; message: string }
}

/**
 * Đảm bảo RLS (Row Level Security) theo Xưởng.
 * Ngăn chặn tuyệt đối việc client tự gửi workshop_id giả mạo để vượt quyền.
 */
export function resolveEffectiveWorkshopId(
  session: SessionUser,
  requestedWorkshopId?: string | null
): RLSValidationResult {
  // Nếu là nhân viên hoặc quản lý xưởng
  if (session.role === 'WORKSHOP_STAFF' || session.role === 'WORKSHOP_MANAGER') {
    if (!session.workshopId) {
      return {
        allowed: false,
        effectiveWorkshopId: null,
        error: {
          status: 403,
          message: 'Tài khoản nhân viên xưởng chưa được gắn với xưởng cụ thể',
        },
      }
    }

    // Nếu client gửi workshopId khác xưởng được cấp -> Từ chối ngay lập tức
    if (requestedWorkshopId && requestedWorkshopId !== session.workshopId) {
      return {
        allowed: false,
        effectiveWorkshopId: session.workshopId,
        error: {
          status: 403,
          message: 'Bạn không có quyền truy cập dữ liệu của xưởng này (Bypass workshop_id bị chặn)',
        },
      }
    }

    // Luôn bắt buộc sử dụng workshopId từ session của server
    return {
      allowed: true,
      effectiveWorkshopId: session.workshopId,
    }
  }

  // Đối với Kế toán, Admin, Viewer: Được chọn xưởng tùy ý hoặc xem toàn bộ xưởng
  return {
    allowed: true,
    effectiveWorkshopId: requestedWorkshopId ?? null,
  }
}
