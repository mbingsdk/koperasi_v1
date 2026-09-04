import { notFound, ok } from '@/lib/server/api-response'
import { simulateImportCommitBatch } from '@/lib/server/repository'
import { isAuthFailure, mutationError, readJson, requireRole } from '@/lib/server/route-helpers'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireRole(['super_admin', 'admin'])
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const payload = await readJson(request) ?? {}

  try {
    const simulation = await simulateImportCommitBatch(id, payload)
    if (!simulation) return notFound('Batch impor tidak ditemukan')
    return ok(simulation)
  } catch (error) {
    return mutationError(error)
  }
}
