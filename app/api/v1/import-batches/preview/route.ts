import { ok } from '@/lib/server/api-response'
import { createImportPreview } from '@/lib/server/repository'
import { isAuthFailure, mutationError, requireRole } from '@/lib/server/route-helpers'
import { parseImportWorkbook } from '@/lib/server/import-parser'

function asText(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value : ''
}

async function readImportPayload(request: Request) {
  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData()
    const file = form.get('file')
    const fileName = file && typeof file === 'object' && 'name' in file
      ? String((file as { name?: unknown }).name ?? '')
      : ''
    const workbookSummary = file && typeof file === 'object' && 'arrayBuffer' in file
      ? await parseImportWorkbook(await (file as Blob).arrayBuffer())
      : undefined

    return {
      originalFileName: fileName || asText(form.get('originalFileName')) || asText(form.get('fileName')),
      summary: workbookSummary,
      membersDetected: asText(form.get('membersDetected')),
      contributionsDetected: asText(form.get('contributionsDetected')),
      transactionsDetected: asText(form.get('transactionsDetected')),
      loansDetected: asText(form.get('loansDetected')),
      warnings: asText(form.get('warnings')),
      errors: asText(form.get('errors')),
    }
  }

  const payload = await request.json().catch(() => null)
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  return payload as Record<string, unknown>
}

export async function POST(request: Request) {
  const auth = await requireRole(['super_admin', 'admin'])
  if (isAuthFailure(auth)) return auth.response

  const payload = await readImportPayload(request)
  if (!payload) return mutationError(new Error('Payload impor wajib berupa JSON object atau FormData.'))

  try {
    const batch = await createImportPreview(payload)
    return ok(batch)
  } catch (error) {
    return mutationError(error)
  }
}
