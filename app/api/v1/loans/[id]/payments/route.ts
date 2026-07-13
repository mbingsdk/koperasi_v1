import { notFound, ok } from '@/lib/server/api-response'
import { createLoanPayment } from '@/lib/server/repository'
import { isAuthFailure, mutationError, readJson, requireRole } from '@/lib/server/route-helpers'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireRole(['super_admin', 'admin'])
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const payload = await readJson(request)
  if (!payload) return mutationError(new Error('Payload pembayaran wajib berupa JSON object.'))

  try {
    const loan = await createLoanPayment(id, payload)
    if (!loan) return notFound('Pinjaman tidak ditemukan')
    return ok(loan)
  } catch (error) {
    return mutationError(error)
  }
}
