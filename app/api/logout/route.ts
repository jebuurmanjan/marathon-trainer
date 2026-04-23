import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/session'

export async function GET(req: NextRequest) {
  // Redirect back to the same host — works on localhost and any Vercel URL
  const host = req.headers.get('host') ?? 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const response = NextResponse.redirect(`${protocol}://${host}/`)
  return clearSessionCookie(response)
}
