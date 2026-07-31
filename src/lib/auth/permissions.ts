import { UserRole } from '@/types/enums'
import { SessionUser } from './session'

export type AppPermission =
  | 'VIEW_TRANSACTION'
  | 'CREATE_TRANSACTION'
  | 'UPDATE_TRANSACTION'
  | 'SUBMIT_TRANSACTION'
  | 'APPROVE_TRANSACTION'
  | 'REJECT_TRANSACTION'
  | 'POST_TRANSACTION'
  | 'CANCEL_TRANSACTION'
  | 'VIEW_QUEUE'
  | 'VIEW_LEDGER'
  | 'MANAGE_STOCKTAKE'
  | 'MANAGE_SYSTEM'

const ROLE_PERMISSIONS: Record<UserRole, AppPermission[]> = {
  WORKSHOP_STAFF: [
    'VIEW_TRANSACTION',
    'CREATE_TRANSACTION',
    'UPDATE_TRANSACTION',
    'SUBMIT_TRANSACTION',
  ],
  WORKSHOP_MANAGER: [
    'VIEW_TRANSACTION',
    'CREATE_TRANSACTION',
    'UPDATE_TRANSACTION',
    'SUBMIT_TRANSACTION',
    'APPROVE_TRANSACTION',
    'REJECT_TRANSACTION',
    'CANCEL_TRANSACTION',
    'VIEW_LEDGER',
    'MANAGE_STOCKTAKE',
  ],
  WAREHOUSE_ACCOUNTANT: [
    'VIEW_TRANSACTION',
    'CREATE_TRANSACTION',
    'UPDATE_TRANSACTION',
    'SUBMIT_TRANSACTION',
    'APPROVE_TRANSACTION',
    'REJECT_TRANSACTION',
    'POST_TRANSACTION',
    'CANCEL_TRANSACTION',
    'VIEW_QUEUE',
    'VIEW_LEDGER',
    'MANAGE_STOCKTAKE',
  ],
  ACCOUNTING_MANAGER: [
    'VIEW_TRANSACTION',
    'APPROVE_TRANSACTION',
    'REJECT_TRANSACTION',
    'POST_TRANSACTION',
    'CANCEL_TRANSACTION',
    'VIEW_QUEUE',
    'VIEW_LEDGER',
    'MANAGE_STOCKTAKE',
  ],
  ADMIN: [
    'VIEW_TRANSACTION',
    'CREATE_TRANSACTION',
    'UPDATE_TRANSACTION',
    'SUBMIT_TRANSACTION',
    'APPROVE_TRANSACTION',
    'REJECT_TRANSACTION',
    'POST_TRANSACTION',
    'CANCEL_TRANSACTION',
    'VIEW_QUEUE',
    'VIEW_LEDGER',
    'MANAGE_STOCKTAKE',
    'MANAGE_SYSTEM',
  ],
  VIEWER: [
    'VIEW_TRANSACTION',
    'VIEW_LEDGER',
    'VIEW_QUEUE',
  ],
}

const ROUTE_ROLES: Record<string, UserRole[]> = {
  '/admin': ['ADMIN'],
  '/accounting': ['WAREHOUSE_ACCOUNTANT', 'ACCOUNTING_MANAGER', 'ADMIN'],
  '/dashboard': ['ACCOUNTING_MANAGER', 'ADMIN', 'VIEWER', 'WORKSHOP_MANAGER'],
  '/mobile': ['WORKSHOP_STAFF', 'WORKSHOP_MANAGER', 'WAREHOUSE_ACCOUNTANT', 'ACCOUNTING_MANAGER', 'ADMIN'],
}

/**
 * Kiểm tra xem vai trò người dùng có quyền thực hiện hành động hay không
 */
export function hasPermission(role: UserRole, permission: AppPermission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

/**
 * Kiểm tra xem vai trò người dùng có thể truy cập tuyến đường (route) không
 */
export function canAccessRoute(role: UserRole, pathname: string): boolean {
  for (const [routePrefix, allowedRoles] of Object.entries(ROUTE_ROLES)) {
    if (pathname.startsWith(routePrefix)) {
      return allowedRoles.includes(role)
    }
  }
  return true
}

/**
 * Server-side authorization check cho mọi Mutation (POST, PUT, PATCH, DELETE)
 * Yêu cầu: VIEWER bị CHẶN tuyệt đối khỏi mọi mutation.
 */
export function authorizeMutation(session: SessionUser | null): { allowed: boolean; status: number; message: string } {
  if (!session) {
    return { allowed: false, status: 401, message: 'Chưa đăng nhập' }
  }

  if (session.role === 'VIEWER') {
    return {
      allowed: false,
      status: 403,
      message: 'Tài khoản Viewer chỉ có quyền xem, không được tạo hoặc sửa dữ liệu',
    }
  }

  return { allowed: true, status: 200, message: 'OK' }
}

/**
 * Kiểm tra quyền truy cập tài nguyên theo xưởng (Workshop Level)
 */
export function canAccessWorkshopData(session: SessionUser, targetWorkshopId: string): boolean {
  // ADMIN, WAREHOUSE_ACCOUNTANT, ACCOUNTING_MANAGER, VIEWER được xem toàn bộ xưởng
  if (['ADMIN', 'WAREHOUSE_ACCOUNTANT', 'ACCOUNTING_MANAGER', 'VIEWER'].includes(session.role)) {
    return true
  }

  // WORKSHOP_STAFF và WORKSHOP_MANAGER chỉ được xem xưởng của chính mình
  return session.workshopId === targetWorkshopId
}
