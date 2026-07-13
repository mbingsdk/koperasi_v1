import { notFound, ok } from '@/lib/server/api-response'
import { updateDepartment } from '@/lib/server/repository'
import { isAuthFailure, mutationError, readJson, requireRole } from '@/lib/server/route-helpers'

interface Params {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireRole(['super_admin', 'admin'])
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const payload = await readJson(request)
  if (!payload) return mutationError(new Error('Payload departemen wajib berupa JSON object.'))

  try {
    const department = await updateDepartment(id, payload)
    if (!department) return notFound('Departemen tidak ditemukan')
    return ok(department)
  } catch (error) {
    return mutationError(error)
  }
}
