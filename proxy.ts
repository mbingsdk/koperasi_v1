import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth-constants'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value)

  if (pathname === '/login' && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (pathname !== '/login' && !hasSession) {
    const url = new URL('/login', request.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/members/:path*',
    '/dues/:path*',
    '/cash/:path*',
    '/loans/:path*',
    '/reports/:path*',
    '/import/:path*',
    '/settings/:path*',
    '/login',
  ],
}
