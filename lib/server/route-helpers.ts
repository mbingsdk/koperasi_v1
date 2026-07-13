import { cookies } from 'next/headers'
import { badRequest, conflict, forbidden, serverError, unauthorized } from '@/lib/server/api-response'
import { SESSION_COOKIE } from '@/lib/server/auth'
import { getUserFromSession } from '@/lib/server/repository'
import type { Role } from '@/lib/types'

type AuthFailure = { response: ReturnType<typeof unauthorized> | ReturnType<typeof forbidden> }
type AuthSuccess = { user: NonNullable<Awaited<ReturnType<typeof getUserFromSession>>> }
type AuthResult = AuthFailure | AuthSuccess

export async function readJson(request: Request) {
  try {
    const payload = await request.json()
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return null
    }
    return payload as Record<string, unknown>
  } catch {
    return null
  }
}

export function mutationError(error: unknown) {
  if (error instanceof Error) {
    const maybePrisma = error as Error & { code?: string }
    if (maybePrisma.code === 'P2002') {
      return conflict('Data dengan nilai unik tersebut sudah ada.')
    }
    if (maybePrisma.code === 'P2003') {
      return badRequest('Relasi data tidak valid. Pastikan pilihan anggota, dana, atau sumber kas tersedia.')
    }
    return badRequest(error.message)
  }

  return serverError()
}

export async function requireRole(allowedRoles: Role[]): Promise<AuthResult> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const user = await getUserFromSession(token)

  if (!user) {
    return { response: unauthorized() }
  }

  if (!allowedRoles.includes(user.role)) {
    return { response: forbidden() }
  }

  return { user }
}

export function isAuthFailure(result: AuthResult): result is AuthFailure {
  return 'response' in result
}
