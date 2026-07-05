import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase'

// GET /api/strava/debug — returns token state and Strava connectivity test
// Temporary diagnostic endpoint; safe to remove once sync is working.
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServerClient()
  const { data: user } = await db
    .from('users')
    .select('strava_access_token, strava_refresh_token, strava_token_expires_at')
    .eq('id', session.userId)
    .single()

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const now = Math.floor(Date.now() / 1000)
  const expiresAt = Math.floor(new Date(user.strava_token_expires_at).getTime() / 1000)

  // Test the token against Strava's athlete endpoint (requires only 'read' scope)
  const athleteRes = await fetch('https://www.strava.com/api/v3/athlete', {
    headers: { Authorization: `Bearer ${user.strava_access_token}` },
  })
  const athleteBody = await athleteRes.json().catch(() => null)

  // Test the activities endpoint (requires 'activity:read_all')
  const activitiesRes = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=1', {
    headers: { Authorization: `Bearer ${user.strava_access_token}` },
  })
  const activitiesStatus = activitiesRes.status
  const activitiesBody = await activitiesRes.json().catch(() => null)

  return NextResponse.json({
    tokenExpiresAt: user.strava_token_expires_at,
    tokenExpiresInSeconds: expiresAt - now,
    tokenExpired: expiresAt <= now,
    athleteEndpoint: { status: athleteRes.status, name: athleteBody?.firstname },
    activitiesEndpoint: { status: activitiesStatus, body: activitiesBody },
  })
}
