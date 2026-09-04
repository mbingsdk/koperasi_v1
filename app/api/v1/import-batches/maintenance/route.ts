import { ok } from '@/lib/server/api-response'
import { cleanupImportPreviewBatches } from '@/lib/server/repository'
import { isAuthFailure, mutationError, requireRole } from '@/lib/server/route-helpers'

function queryNumber(value: string | null, fallback: number) {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export async function DELETE(request: Request) {
  const auth = await requireRole(['super_admin', 'admin'])
  if (isAuthFailure(auth)) return auth.response

  const url = new URL(request.url)
  const olderThanDays = queryNumber(url.searchParams.get('days'), 7)
  const dryRun = ['1', 'true', 'yes'].includes((url.searchParams.get('dryRun') ?? '').toLowerCase())

  try {
    const result = await cleanupImportPreviewBatches({ olderThanDays, dryRun })
    return ok(result)
  } catch (error) {
    return mutationError(error)
  }
}
