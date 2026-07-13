import { notFound, ok } from '@/lib/server/api-response'
import { updateUser } from '@/lib/server/repository'
import { isAuthFailure, mutationError, readJson, requireRole } from '@/lib/server/route-helpers'

interface Params {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireRole(['super_admin'])
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const payload = await readJson(request)
  if (!payload) return mutationError(new Error('Payload pengguna wajib berupa JSON object.'))

  try {
    const user = await updateUser(id, payload)
    if (!user) return notFound('Pengguna tidak ditemukan')
    return ok(user)
  } catch (error) {
    return mutationError(error)
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireRole(['super_admin'])
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

  try {
    const user = await updateUser(id, { isActive: false })
    if (!user) return notFound('Pengguna tidak ditemukan')
    return ok(user)
  } catch (error) {
    return mutationError(error)
  }
}
