import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'marathon_session'
const MAX_AGE = 60 * 60 * 24 * 30 // 30 days

function getSecret() {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET env var is not set')
  return new TextEncoder().encode(secret)
}

export interface SessionPayload {
  userId: string
  stravaId: number
  name: string
}

export async function createSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret())
}

export async function getSession(req?: NextRequest): Promise<SessionPayload | null> {
  try {
    let token: string | undefined

    if (req) {
      token = req.cookies.get(COOKIE_NAME)?.value
    } else {
      const cookieStore = await cookies()
      token = cookieStore.get(COOKIE_NAME)?.value
    }

    if (!token) return null

    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export function setSessionCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  })
  return response
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.delete(COOKIE_NAME)
  return response
}
