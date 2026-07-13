import type { NextRequest } from 'next/server'
import { ok } from '@/lib/server/api-response'
import { createDepartment } from '@/lib/server/repository'
import { isAuthFailure, mutationError, readJson, requireRole } from '@/lib/server/route-helpers'

export async function POST(request: NextRequest) {
  const auth = await requireRole(['super_admin', 'admin'])
  if (isAuthFailure(auth)) return auth.response

  const payload = await readJson(request)
  if (!payload) return mutationError(new Error('Payload departemen wajib berupa JSON object.'))

  try {
    return ok(await createDepartment(payload))
  } catch (error) {
    return mutationError(error)
  }
}
