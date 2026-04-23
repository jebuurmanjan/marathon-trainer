import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getValidAccessToken } from '@/lib/strava'
import { createServerClient } from '@/lib/supabase'
import { DEFAULT_ZONES, ZoneConfig, computeZoneSeconds } from '@/lib/hr-zones'

const STRAVA_API  = 'https://www.strava.com/api/v3'
const BATCH_SIZE  = 20     // activities per call — avoids Strava rate limits & serverless timeouts
const YEAR_START  = `${new Date().getFullYear()}-01-01`
const YEAR_END    = `${new Date().getFullYear()}-12-31`

// POST /api/hr-zones/sync
// Syncs up to BATCH_SIZE activities that don't yet have HR zone data.
// Client should keep calling until `remaining === 0`.
export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServerClient()

  // ── 1. Fetch user's zone config ───────────────────────────────────────────
  let cfg: ZoneConfig = DEFAULT_ZONES
  try {
    const { data } = await db
      .from('hr_zone_configs')
      .select('*')
      .eq('user_id', session.userId)
      .single()
    if (data) {
      cfg = { zone1Max: data.zone1_max, zone2Max: data.zone2_max, zone3Max: data.zone3_max, zone4Max: data.zone4_max, zone5Max: data.zone5_max }
    }
  } catch { /* use defaults */ }

  // ── 2. Find activities without zone data ──────────────────────────────────
  const { data: allRuns } = await db
    .from('actual_runs')
    .select('id, strava_activity_id, run_date')
    .eq('user_id', session.userId)
    .gte('run_date', YEAR_START)
    .lte('run_date', YEAR_END)

  const { data: alreadySynced } = await db
    .from('activity_hr_zones')
    .select('strava_activity_id')
    .eq('user_id', session.userId)

  const syncedIds = new Set((alreadySynced ?? []).map((r) => String(r.strava_activity_id)))
  const pending   = (allRuns ?? []).filter((r) => !syncedIds.has(String(r.strava_activity_id)))
  const batch     = pending.slice(0, BATCH_SIZE)
  const remaining = pending.length - batch.length

  if (batch.length === 0) {
    return NextResponse.json({ synced: 0, remaining: 0 })
  }

  // ── 3. Fetch HR streams from Strava and compute zone seconds ──────────────
  let accessToken: string
  try {
    accessToken = await getValidAccessToken(session.userId)
  } catch (err) {
    console.error('Token error:', err)
    return NextResponse.json({ error: 'Strava token error' }, { status: 500 })
  }

  let synced = 0

  for (const run of batch) {
    try {
      const res = await fetch(
        `${STRAVA_API}/activities/${run.strava_activity_id}/streams?keys=heartrate,time&key_by_type=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      if (!res.ok) {
        // Activity might not have HR data — insert zeros so we don't retry it
        await db.from('activity_hr_zones').upsert(
          { user_id: session.userId, strava_activity_id: run.strava_activity_id, run_date: run.run_date,
            zone1_seconds: 0, zone2_seconds: 0, zone3_seconds: 0, zone4_seconds: 0, zone5_seconds: 0, zone6_seconds: 0,
            synced_at: new Date().toISOString() },
          { onConflict: 'user_id,strava_activity_id' }
        )
        synced++
        continue
      }

      const streams = await res.json() as {
        heartrate?: { data: number[] }
        time?:      { data: number[] }
      }

      const hrData   = streams.heartrate?.data ?? []
      const timeData = streams.time?.data      ?? []

      // No HR stream → store zeros so we don't retry endlessly
      if (hrData.length === 0 || timeData.length === 0) {
        await db.from('activity_hr_zones').upsert(
          { user_id: session.userId, strava_activity_id: run.strava_activity_id, run_date: run.run_date,
            zone1_seconds: 0, zone2_seconds: 0, zone3_seconds: 0, zone4_seconds: 0, zone5_seconds: 0, zone6_seconds: 0,
            synced_at: new Date().toISOString() },
          { onConflict: 'user_id,strava_activity_id' }
        )
        synced++
        continue
      }

      const [z1, z2, z3, z4, z5, z6] = computeZoneSeconds(hrData, timeData, cfg)

      await db.from('activity_hr_zones').upsert(
        { user_id: session.userId, strava_activity_id: run.strava_activity_id, run_date: run.run_date,
          zone1_seconds: z1, zone2_seconds: z2, zone3_seconds: z3, zone4_seconds: z4, zone5_seconds: z5, zone6_seconds: z6,
          synced_at: new Date().toISOString() },
        { onConflict: 'user_id,strava_activity_id' }
      )
      synced++
    } catch (err) {
      console.error(`Zone sync error for activity ${run.strava_activity_id}:`, err)
      // Don't let one bad activity abort the whole batch — just skip it
    }
  }

  return NextResponse.json({ synced, remaining })
}
