import type { NextRequest } from 'next/server'
import { ok } from '@/lib/server/api-response'
import { getReportSummary } from '@/lib/server/repository'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const summary = await getReportSummary({
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
  })

  return ok(summary)
}
