import type { NextRequest } from 'next/server'
import { ok } from '@/lib/server/api-response'
import { createCashTransaction, listCashTransactions } from '@/lib/server/repository'
import { isAuthFailure, mutationError, readJson, requireRole } from '@/lib/server/route-helpers'
import type { TransactionDirection } from '@/lib/types'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const transactions = await listCashTransactions({
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
    fundId: params.get('fundId') ?? undefined,
    direction: (params.get('direction') ?? 'all') as TransactionDirection | 'all',
    category: params.get('category') ?? undefined,
  })

  return ok(transactions, { count: transactions.length })
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(['super_admin', 'admin'])
  if (isAuthFailure(auth)) return auth.response

  const payload = await readJson(request)
  if (!payload) return mutationError(new Error('Payload transaksi wajib berupa JSON object.'))

  try {
    const transaction = await createCashTransaction(payload)
    return ok(transaction)
  } catch (error) {
    return mutationError(error)
  }
}
