import type { NextRequest } from 'next/server'
import { ok } from '@/lib/server/api-response'
import { createContributionRate } from '@/lib/server/repository'
import { isAuthFailure, mutationError, readJson, requireRole } from '@/lib/server/route-helpers'

export async function POST(request: NextRequest) {
  const auth = await requireRole(['super_admin', 'admin'])
  if (isAuthFailure(auth)) return auth.response

  const payload = await readJson(request)
  if (!payload) return mutationError(new Error('Payload tarif iuran wajib berupa JSON object.'))

  try {
    return ok(await createContributionRate(payload))
  } catch (error) {
    return mutationError(error)
  }
}
