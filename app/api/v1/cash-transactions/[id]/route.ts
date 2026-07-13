import { notFound, ok } from '@/lib/server/api-response'
import { deleteCashTransaction, updateCashTransaction } from '@/lib/server/repository'
import { isAuthFailure, mutationError, readJson, requireRole } from '@/lib/server/route-helpers'

interface Params {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireRole(['super_admin', 'admin'])
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const payload = await readJson(request)
  if (!payload) return mutationError(new Error('Payload transaksi wajib berupa JSON object.'))

  try {
    const transaction = await updateCashTransaction(id, payload)
    if (!transaction) return notFound('Transaksi tidak ditemukan')
    return ok(transaction)
  } catch (error) {
    return mutationError(error)
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireRole(['super_admin', 'admin'])
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

  try {
    const deleted = await deleteCashTransaction(id)
    if (!deleted) return notFound('Transaksi tidak ditemukan')
    return ok({ deleted: true, id })
  } catch (error) {
    return mutationError(error)
  }
}
