import { notFound, ok } from '@/lib/server/api-response'
import { updateFund } from '@/lib/server/repository'
import { isAuthFailure, mutationError, readJson, requireRole } from '@/lib/server/route-helpers'

interface Params {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireRole(['super_admin', 'admin'])
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const payload = await readJson(request)
  if (!payload) return mutationError(new Error('Payload dana wajib berupa JSON object.'))

  try {
    const fund = await updateFund(id, payload)
    if (!fund) return notFound('Dana tidak ditemukan')
    return ok(fund)
  } catch (error) {
    return mutationError(error)
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireRole(['super_admin', 'admin'])
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

  try {
    const fund = await updateFund(id, { isActive: false })
    if (!fund) return notFound('Dana tidak ditemukan')
    return ok(fund)
  } catch (error) {
    return mutationError(error)
  }
}
