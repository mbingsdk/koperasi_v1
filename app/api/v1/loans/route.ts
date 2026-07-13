import type { NextRequest } from 'next/server'
import { ok } from '@/lib/server/api-response'
import { createLoan, listLoans } from '@/lib/server/repository'
import { isAuthFailure, mutationError, readJson, requireRole } from '@/lib/server/route-helpers'
import type { LoanStatus } from '@/lib/types'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const loans = await listLoans({
    status: (params.get('status') ?? 'all') as LoanStatus | 'all',
    cashSourceId: params.get('cashSourceId') ?? undefined,
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
  })

  return ok(loans, { count: loans.length })
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(['super_admin', 'admin'])
  if (isAuthFailure(auth)) return auth.response

  const payload = await readJson(request)
  if (!payload) return mutationError(new Error('Payload pinjaman wajib berupa JSON object.'))

  try {
    const loan = await createLoan(payload)
    return ok(loan)
  } catch (error) {
    return mutationError(error)
  }
}
