import { notFound, ok } from '@/lib/server/api-response'
import { commitImportBatch } from '@/lib/server/repository'
import { isAuthFailure, mutationError, requireRole } from '@/lib/server/route-helpers'

interface Params {
  params: Promise<{ id: string }>
}

async function readBody(request: Request) {
  if (!request.headers.get('content-type')?.includes('application/json')) return {}

  try {
    const body = await request.json()
    return body && typeof body === 'object' && !Array.isArray(body)
      ? body as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireRole(['super_admin', 'admin'])
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const body = await readBody(request)

  try {
    const batch = await commitImportBatch(id, body)
    if (!batch) return notFound('Batch impor tidak ditemukan')
    return ok(batch)
  } catch (error) {
    return mutationError(error)
  }
}
