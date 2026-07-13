import type { Role } from '@/lib/types'

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin Ledger',
  viewer: 'Viewer',
}

export function roleLabel(role?: Role | null) {
  return role ? ROLE_LABELS[role] : 'Memuat sesi'
}
