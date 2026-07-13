import { ok } from '@/lib/server/api-response'
import { getBootstrapState } from '@/lib/server/repository'

export async function GET() {
  const data = await getBootstrapState()
  return ok(data)
}
