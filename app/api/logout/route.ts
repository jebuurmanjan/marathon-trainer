import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/session'

export async function GET() {
  const response = NextResponse.redirect(
    new URL('/', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
  )
  return clearSessionCookie(response)
}
