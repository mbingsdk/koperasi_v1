import type { NextRequest } from 'next/server'
import { ok } from '@/lib/server/api-response'
import { listDues } from '@/lib/server/repository'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const dues = await listDues({
    period: params.get('period') ?? undefined,
    fundId: params.get('fundId') ?? undefined,
    departmentId: params.get('departmentId') ?? undefined,
    paymentStatus: (params.get('paymentStatus') ?? 'all') as 'all' | 'paid' | 'unpaid',
  })

  return ok(dues, { count: dues.length })
}
