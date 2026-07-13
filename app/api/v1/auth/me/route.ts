import { cookies } from 'next/headers'
import { notFound, ok } from '@/lib/server/api-response'
import { SESSION_COOKIE } from '@/lib/server/auth'
import { getUserFromSession } from '@/lib/server/repository'

export async function GET() {
  const cookieStore = await cookies()
  const user = await getUserFromSession(cookieStore.get(SESSION_COOKIE)?.value)
  if (!user) return notFound('Sesi tidak aktif')
  return ok(user)
}
