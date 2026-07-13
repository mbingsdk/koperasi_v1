import { notFound, ok } from '@/lib/server/api-response'
import { deactivateMember, getMemberProfile, updateMember } from '@/lib/server/repository'
import { isAuthFailure, mutationError, readJson, requireRole } from '@/lib/server/route-helpers'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params
  const profile = await getMemberProfile(id)
  if (!profile) return notFound('Anggota tidak ditemukan')
  return ok(profile)
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireRole(['super_admin', 'admin'])
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const payload = await readJson(request)
  if (!payload) return mutationError(new Error('Payload anggota wajib berupa JSON object.'))

  try {
    const member = await updateMember(id, payload)
    if (!member) return notFound('Anggota tidak ditemukan')
    return ok(member)
  } catch (error) {
    return mutationError(error)
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireRole(['super_admin', 'admin'])
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

  try {
    const member = await deactivateMember(id)
    if (!member) return notFound('Anggota tidak ditemukan')
    return ok(member)
  } catch (error) {
    return mutationError(error)
  }
}
