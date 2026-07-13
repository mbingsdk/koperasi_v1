import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/server/auth'
import { recordLogout } from '@/lib/server/repository'

export async function POST() {
  const cookieStore = await cookies()
  await recordLogout(cookieStore.get(SESSION_COOKIE)?.value)

  const response = NextResponse.json({
    data: { loggedOut: true },
    meta: {
      generatedAt: new Date().toISOString(),
      source: 'postgres',
    },
  })
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  return response
}
