import { createServerClient } from '@/lib/supabase'
import { ActualRun } from '@/types'

const STRAVA_API = 'https://www.strava.com/api/v3'

export interface StravaTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number  // unix timestamp
}

// Exchange code for tokens (OAuth callback)
export async function exchangeCode(code: string): Promise<{
  tokens: StravaTokens
  athlete: { id: number; firstname: string; lastname: string; profile: string }
}> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })

  if (!res.ok) throw new Error(`Strava token exchange failed: ${res.status}`)
  const data = await res.json()

  return {
    tokens: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
    },
    athlete: data.athlete,
  }
}

// Refresh an expired access token
export async function refreshToken(refreshToken: string): Promise<StravaTokens> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`)
  const data = await res.json()

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
  }
}

// Get a valid access token for a user, refreshing if needed
export async function getValidAccessToken(userId: string): Promise<string> {
  const db = createServerClient()
  const { data: user } = await db.from('users').select('*').eq('id', userId).single()
  if (!user) throw new Error('User not found')

  const now = Math.floor(Date.now() / 1000)
  const expiresAt = Math.floor(new Date(user.strava_token_expires_at).getTime() / 1000)
  if (expiresAt > now + 300) {
    return user.strava_access_token
  }

  // Token expired — refresh it
  const tokens = await refreshToken(user.strava_refresh_token)
  await db
    .from('users')
    .update({
      strava_access_token: tokens.accessToken,
      strava_refresh_token: tokens.refreshToken,
      strava_token_expires_at: new Date(tokens.expiresAt * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  return tokens.accessToken
}

// Fetch activities from Strava and store new ones in the DB
export async function syncActivities(userId: string, afterDate?: Date): Promise<number> {
  const accessToken = await getValidAccessToken(userId)
  const db = createServerClient()

  const after = afterDate
    ? Math.floor(afterDate.getTime() / 1000)
    : Math.floor(new Date('2026-04-01').getTime() / 1000)

  let page = 1
  let synced = 0

  while (true) {
    const res = await fetch(
      `${STRAVA_API}/athlete/activities?after=${after}&per_page=50&page=${page}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (res.status === 401 || res.status === 403) {
      throw new Error(`STRAVA_REAUTH:${res.status}`)
    }
    if (!res.ok) throw new Error(`Strava activities fetch failed: ${res.status}`)
    const activities = await res.json()
    if (!activities.length) break

    for (const activity of activities) {
      // Strava deprecated `type` in 2023 in favour of `sport_type`.
      // Accept either field so old and new activities both pass through.
      const activityType = activity.sport_type ?? activity.type
      if (activityType !== 'Run') continue

      const distanceKm = activity.distance / 1000
      // Guard against zero-distance activities (would produce Infinity pace)
      if (distanceKm <= 0) continue

      const paceMinPerKm = activity.moving_time / 60 / distanceKm

      const { error: upsertError } = await db
        .from('actual_runs')
        .upsert(
          {
            user_id: userId,
            strava_activity_id: activity.id,
            run_date: activity.start_date.slice(0, 10),
            distance_km: Math.round(distanceKm * 100) / 100,
            moving_time_seconds: activity.moving_time,
            pace_min_per_km: Math.round(paceMinPerKm * 100) / 100,
            average_heartrate: activity.average_heartrate ?? null,
            max_heartrate: activity.max_heartrate ?? null,
            name: activity.name,
          },
          { onConflict: 'strava_activity_id' }
        )
      if (upsertError) {
        console.error('Failed to upsert activity', activity.id, upsertError)
        throw new Error(`DB upsert failed for activity ${activity.id}: ${upsertError.message}`)
      }
      synced++
    }

    if (activities.length < 50) break
    page++
  }

  return synced
}

// Fetch a single activity from Strava and upsert into DB
export async function syncSingleActivity(userId: string, activityId: number): Promise<void> {
  const accessToken = await getValidAccessToken(userId)
  const db = createServerClient()

  const res = await fetch(`${STRAVA_API}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return

  const activity = await res.json()
  const activityType = activity.sport_type ?? activity.type
  if (activityType !== 'Run') return

  const distanceKm = activity.distance / 1000
  if (distanceKm <= 0) return
  const paceMinPerKm = activity.moving_time / 60 / distanceKm

  await db.from('actual_runs').upsert(
    {
      user_id: userId,
      strava_activity_id: activity.id,
      run_date: activity.start_date.slice(0, 10),
      distance_km: Math.round(distanceKm * 100) / 100,
      moving_time_seconds: activity.moving_time,
      pace_min_per_km: Math.round(paceMinPerKm * 100) / 100,
      average_heartrate: activity.average_heartrate ?? null,
      max_heartrate: activity.max_heartrate ?? null,
      name: activity.name,
    },
    { onConflict: 'strava_activity_id' }
  )
}

// Load actual runs from DB for a user within a date range
export async function getActualRuns(
  userId: string,
  startDate: string,
  endDate: string
): Promise<ActualRun[]> {
  const db = createServerClient()
  const { data } = await db
    .from('actual_runs')
    .select('*')
    .eq('user_id', userId)
    .gte('run_date', startDate)
    .lte('run_date', endDate)
    .order('run_date', { ascending: true })

  return (data ?? []).map((r) => ({
    id: r.id,
    stravaActivityId: String(r.strava_activity_id),
    runDate: r.run_date,
    distanceKm: r.distance_km,
    movingTimeSeconds: r.moving_time_seconds,
    paceMinPerKm: r.pace_min_per_km,
    averageHeartrate: r.average_heartrate,
    maxHeartrate: r.max_heartrate,
    name: r.name,
  }))
}

// Format seconds to HH:MM:SS
export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

// Format pace (decimal min/km) to MM:SS/km
export function formatPace(paceMinPerKm: number): string {
  const min = Math.floor(paceMinPerKm)
  const sec = Math.round((paceMinPerKm - min) * 60)
  return `${min}:${String(sec).padStart(2, '0')}/km`
}
