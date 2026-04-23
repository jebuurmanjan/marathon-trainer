import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase'
import { isoWeekKey } from '@/lib/hr-zones'

const YEAR_START = `${new Date().getFullYear()}-01-01`
const YEAR_END   = `${new Date().getFullYear()}-12-31`

export interface WeeklyZoneRow {
  weekKey:   string   // "2026-W04"
  weekLabel: string   // "W4"
  zones:     number[] // [z1s, z2s, z3s, z4s, z5s, z6s] in seconds
  total:     number   // total seconds across all zones
}

export interface ZoneDataResponse {
  hasData:      boolean
  syncedCount:  number         // activities with zone data (incl. those with no HR)
  totalCount:   number         // total activities in year
  totalZones:   number[]       // [z1s, z2s, ..., z6s] summed across all activities
  totalSeconds: number
  weekly:       WeeklyZoneRow[]
}

// GET /api/hr-zones/data
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServerClient()

  // Total activities for the year
  const { data: allRuns } = await db
    .from('actual_runs')
    .select('strava_activity_id')
    .eq('user_id', session.userId)
    .gte('run_date', YEAR_START)
    .lte('run_date', YEAR_END)

  const totalCount = (allRuns ?? []).length

  // Zone data rows
  let zoneRows: Array<{
    run_date: string
    zone1_seconds: number
    zone2_seconds: number
    zone3_seconds: number
    zone4_seconds: number
    zone5_seconds: number
    zone6_seconds: number
  }> = []

  try {
    const { data } = await db
      .from('activity_hr_zones')
      .select('run_date, zone1_seconds, zone2_seconds, zone3_seconds, zone4_seconds, zone5_seconds, zone6_seconds')
      .eq('user_id', session.userId)
      .gte('run_date', YEAR_START)
      .lte('run_date', YEAR_END)
      .order('run_date', { ascending: true })

    zoneRows = data ?? []
  } catch {
    // Table may not exist yet — return empty state
    return NextResponse.json({
      hasData: false, syncedCount: 0, totalCount,
      totalZones: [0, 0, 0, 0, 0, 0], totalSeconds: 0, weekly: [],
    } satisfies ZoneDataResponse)
  }

  const syncedCount = zoneRows.length

  // Only count activities that actually had HR data (any zone > 0)
  const withHR = zoneRows.filter(
    (r) => r.zone1_seconds + r.zone2_seconds + r.zone3_seconds + r.zone4_seconds + r.zone5_seconds + r.zone6_seconds > 0
  )

  const hasData = withHR.length > 0

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totalZones = [0, 0, 0, 0, 0, 0]
  for (const r of withHR) {
    totalZones[0] += r.zone1_seconds
    totalZones[1] += r.zone2_seconds
    totalZones[2] += r.zone3_seconds
    totalZones[3] += r.zone4_seconds
    totalZones[4] += r.zone5_seconds
    totalZones[5] += r.zone6_seconds
  }
  const totalSeconds = totalZones.reduce((a, b) => a + b, 0)

  // ── Weekly breakdown ────────────────────────────────────────────────────────
  const weekMap = new Map<string, number[]>()
  for (const r of withHR) {
    const key = isoWeekKey(r.run_date)
    const existing = weekMap.get(key) ?? [0, 0, 0, 0, 0, 0]
    existing[0] += r.zone1_seconds
    existing[1] += r.zone2_seconds
    existing[2] += r.zone3_seconds
    existing[3] += r.zone4_seconds
    existing[4] += r.zone5_seconds
    existing[5] += r.zone6_seconds
    weekMap.set(key, existing)
  }

  const weekly: WeeklyZoneRow[] = [...weekMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, zones]) => ({
      weekKey:   key,
      weekLabel: `W${parseInt(key.split('-W')[1])}`,
      zones,
      total: zones.reduce((a, b) => a + b, 0),
    }))

  return NextResponse.json({
    hasData, syncedCount, totalCount, totalZones, totalSeconds, weekly,
  } satisfies ZoneDataResponse)
}
