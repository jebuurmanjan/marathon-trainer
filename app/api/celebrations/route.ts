import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase'
import { trainingPlan, getCurrentWeekNumber } from '@/lib/training-plan'
import { calcWeekScore } from '@/lib/score'
import { ActualRun } from '@/types'

const YEAR     = 2026
const GOAL_KM  = 1000
const RACE_DATE = '2026-11-01'
// sub 3:30 over a marathon = 210 min / 42.195 km ≈ 4.976 min/km
const MARATHON_PACE_LIMIT = 4.98

// ─── GET: detect new celebrations, return oldest unshown ─────────────────────
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ celebration: null })

  const db = createServerClient()

  // 1. Load existing celebration records for this user
  const { data: existingRows } = await db
    .from('celebration_events')
    .select('celebration_type, context_key')
    .eq('user_id', session.userId)

  const existingSet = new Set(
    (existingRows ?? []).map((e) => `${e.celebration_type}:${e.context_key}`)
  )

  // 2. Load all actual runs for this year (DB only, no Strava API call)
  const { data: runsData } = await db
    .from('actual_runs')
    .select('*')
    .eq('user_id', session.userId)
    .gte('run_date', `${YEAR}-01-01`)
    .lte('run_date', `${YEAR}-12-31`)
    .order('run_date', { ascending: true })

  const allRuns: ActualRun[] = (runsData ?? []).map((r) => ({
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

  const today     = new Date().toISOString().slice(0, 10)
  const todayMs   = new Date(`${today}T12:00:00`).getTime()
  const currentWeek = getCurrentWeekNumber()

  const newCelebrations: { type: string; key: string }[] = []

  // ── Goal 1: Daily run completed ──────────────────────────────────────────────
  // For each planned run in the last 1.5 days: if an actual run covers ≥ 90% of the distance, celebrate.
  for (const week of trainingPlan) {
    for (const planned of week.runs) {
      const plannedMs  = new Date(`${planned.date}T12:00:00`).getTime()
      const daysAgo    = (todayMs - plannedMs) / 86_400_000
      if (daysAgo < 0 || daysAgo > 1.5) continue // only today + yesterday

      const key = `daily-${planned.date}`
      if (existingSet.has(`daily_run:${key}`)) continue

      const match = allRuns.find((r) => {
        const rMs = new Date(`${r.runDate}T12:00:00`).getTime()
        return (
          Math.abs(rMs - plannedMs) <= 86_400_000 * 1.5 &&
          r.distanceKm >= planned.targetDistanceKm * 0.9
        )
      })
      if (match) newCelebrations.push({ type: 'daily_run', key })
    }
  }

  // ── Goal 2: Week score ≥ 65 — trigger on first day of next week ──────────────
  if (currentWeek > 1) {
    const lastWeekNum = currentWeek - 1
    const lastWeek    = trainingPlan.find((w) => w.weekNumber === lastWeekNum)
    if (lastWeek) {
      const key = `good-week-${lastWeekNum}`
      if (!existingSet.has(`good_week:${key}`)) {
        const weekRuns = allRuns.filter(
          (r) => r.runDate >= lastWeek.startDate && r.runDate <= lastWeek.endDate
        )
        const score = calcWeekScore(lastWeek, weekRuns, false)
        if (score.total !== null && score.total >= 65) {
          newCelebrations.push({ type: 'good_week', key })
        }
      }
    }
  }

  // ── Goal 3: Yearly 1,000 km reached ─────────────────────────────────────────
  {
    const key = `yearly-1000-${YEAR}`
    if (!existingSet.has(`yearly_1000:${key}`)) {
      const totalKm = allRuns.reduce((s, r) => s + r.distanceKm, 0)
      if (totalKm >= GOAL_KM) {
        newCelebrations.push({ type: 'yearly_1000', key })
      }
    }
  }

  // ── Goal 4: All 27 weeks of the plan completed ───────────────────────────────
  {
    const key = `full-plan-${YEAR}`
    if (!existingSet.has(`full_plan:${key}`) && currentWeek > 27) {
      newCelebrations.push({ type: 'full_plan', key })
    }
  }

  // ── Goal 5: Marathon finished in sub 3:30 on Nov 1 ──────────────────────────
  {
    const key = `marathon-sub330-${YEAR}`
    if (!existingSet.has(`marathon_sub330:${key}`)) {
      const hit = allRuns.find(
        (r) =>
          r.runDate >= RACE_DATE &&
          r.distanceKm >= 38 &&
          r.paceMinPerKm <= MARATHON_PACE_LIMIT
      )
      if (hit) newCelebrations.push({ type: 'marathon_sub330', key })
    }
  }

  // 3. Persist any newly triggered celebrations
  if (newCelebrations.length > 0) {
    await db.from('celebration_events').insert(
      newCelebrations.map((c) => ({
        user_id:          session.userId,
        celebration_type: c.type,
        context_key:      c.key,
      }))
    )
  }

  // 4. Return the oldest celebration that hasn't been shown yet
  const { data: unshown } = await db
    .from('celebration_events')
    .select('*')
    .eq('user_id', session.userId)
    .is('shown_at', null)
    .order('triggered_at', { ascending: true })
    .limit(1)

  return NextResponse.json({ celebration: unshown?.[0] ?? null })
}

// ─── POST: mark a celebration as shown ──────────────────────────────────────
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = createServerClient()
  await db
    .from('celebration_events')
    .update({ shown_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', session.userId)

  return NextResponse.json({ ok: true })
}
