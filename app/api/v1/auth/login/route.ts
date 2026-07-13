import { NextResponse } from 'next/server'
import { authenticateUser } from '@/lib/server/repository'
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/server/auth'
import { mutationError, readJson } from '@/lib/server/route-helpers'

export async function POST(request: Request) {
  const payload = await readJson(request)
  if (!payload) return mutationError(new Error('Payload login wajib berupa JSON object.'))

  try {
    const session = await authenticateUser(payload)
    const response = NextResponse.json({
      data: session.user,
      meta: {
        generatedAt: new Date().toISOString(),
        source: 'postgres',
      },
    })
    response.cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions())
    return response
  } catch (error) {
    return mutationError(error)
  }
}
