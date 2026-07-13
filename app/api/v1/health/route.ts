import { ok } from '@/lib/server/api-response'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  let database: 'ok' | 'unavailable' = 'ok'

  try {
    await prisma.$queryRaw`select 1`
  } catch {
    database = 'unavailable'
  }

  return ok({
    status: 'ok',
    service: 'koperasi-ledger-api',
    version: 'v1',
    storage: 'postgres',
    database,
  })
}
