import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

const PUBLIC_PATHS = ['/', '/api/strava/auth', '/api/strava/callback', '/api/strava/webhook']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const session = await getSession(req)
  if (!session) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
