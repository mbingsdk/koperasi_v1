import { notFound, ok } from '@/lib/server/api-response'
import { commitImportBatch } from '@/lib/server/repository'
import { isAuthFailure, mutationError, requireRole } from '@/lib/server/route-helpers'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, { params }: Params) {
  const auth = await requireRole(['super_admin', 'admin'])
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

  try {
    const batch = await commitImportBatch(id)
    if (!batch) return notFound('Batch impor tidak ditemukan')
    return ok(batch)
  } catch (error) {
    return mutationError(error)
  }
}
