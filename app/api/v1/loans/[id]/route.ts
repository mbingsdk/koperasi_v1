import { notFound, ok } from '@/lib/server/api-response'
import { deleteLoan, updateLoan } from '@/lib/server/repository'
import { isAuthFailure, mutationError, readJson, requireRole } from '@/lib/server/route-helpers'

interface Params {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireRole(['super_admin', 'admin'])
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const payload = await readJson(request)
  if (!payload) return mutationError(new Error('Payload pinjaman wajib berupa JSON object.'))

  try {
    const loan = await updateLoan(id, payload)
    if (!loan) return notFound('Pinjaman tidak ditemukan')
    return ok(loan)
  } catch (error) {
    return mutationError(error)
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireRole(['super_admin', 'admin'])
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

  try {
    const deleted = await deleteLoan(id)
    if (!deleted) return notFound('Pinjaman tidak ditemukan')
    return ok({ deleted: true, id })
  } catch (error) {
    return mutationError(error)
  }
}
