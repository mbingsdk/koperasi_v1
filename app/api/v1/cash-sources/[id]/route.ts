import { notFound, ok } from '@/lib/server/api-response'
import { updateCashSource } from '@/lib/server/repository'
import { isAuthFailure, mutationError, readJson, requireRole } from '@/lib/server/route-helpers'

interface Params {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireRole(['super_admin', 'admin'])
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const payload = await readJson(request)
  if (!payload) return mutationError(new Error('Payload sumber kas wajib berupa JSON object.'))

  try {
    const cashSource = await updateCashSource(id, payload)
    if (!cashSource) return notFound('Sumber kas tidak ditemukan')
    return ok(cashSource)
  } catch (error) {
    return mutationError(error)
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireRole(['super_admin', 'admin'])
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

  try {
    const cashSource = await updateCashSource(id, { isActive: false })
    if (!cashSource) return notFound('Sumber kas tidak ditemukan')
    return ok(cashSource)
  } catch (error) {
    return mutationError(error)
  }
}
