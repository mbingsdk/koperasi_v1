import { ok } from '@/lib/server/api-response'
import { resetDemoDatabase } from '@/lib/server/repository'
import { isAuthFailure, mutationError, requireRole } from '@/lib/server/route-helpers'

export async function POST() {
  const auth = await requireRole(['super_admin'])
  if (isAuthFailure(auth)) return auth.response

  try {
    const state = await resetDemoDatabase()
    return ok(state)
  } catch (error) {
    return mutationError(error)
  }
}
