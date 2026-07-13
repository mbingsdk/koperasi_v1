import type { NextRequest } from 'next/server'
import { ok } from '@/lib/server/api-response'
import { upsertDuesBatch } from '@/lib/server/repository'
import { isAuthFailure, mutationError, readJson, requireRole } from '@/lib/server/route-helpers'

export async function POST(request: NextRequest) {
  const auth = await requireRole(['super_admin', 'admin'])
  if (isAuthFailure(auth)) return auth.response

  const payload = await readJson(request)
  if (!payload) return mutationError(new Error('Payload iuran wajib berupa JSON object.'))

  try {
    const dues = await upsertDuesBatch(payload)
    return ok(dues, { count: dues.length })
  } catch (error) {
    return mutationError(error)
  }
}
