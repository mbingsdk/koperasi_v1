import type { NextRequest } from 'next/server'
import { ok } from '@/lib/server/api-response'
import { createMember, listMembers } from '@/lib/server/repository'
import { isAuthFailure, mutationError, readJson, requireRole } from '@/lib/server/route-helpers'
import type { EmployeeType, MemberStatus } from '@/lib/types'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const members = await listMembers({
    search: params.get('search') ?? undefined,
    departmentId: params.get('departmentId') ?? undefined,
    employeeType: (params.get('employeeType') ?? 'all') as EmployeeType | 'all',
    status: (params.get('status') ?? 'all') as MemberStatus | 'all',
  })

  return ok(members, { count: members.length })
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(['super_admin', 'admin'])
  if (isAuthFailure(auth)) return auth.response

  const payload = await readJson(request)
  if (!payload) return mutationError(new Error('Payload anggota wajib berupa JSON object.'))

  try {
    const member = await createMember(payload)
    return ok(member)
  } catch (error) {
    return mutationError(error)
  }
}
