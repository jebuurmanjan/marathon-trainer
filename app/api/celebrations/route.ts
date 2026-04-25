import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase'
import { getUserPlan } from '@/lib/user-plan'
import { calcWeekScore } from '@/lib/score'
import { ActualRun } from '@/types'

const YEAR    = new Date().getFullYear()
const GOAL_KM = 1000

// ─── GET: detect new celebrations, return oldest unshown ─────────────────────
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ celebration: null })

  const userPlan = await getUserPlan(session.userId, session.stravaId)
  if (!userPlan) return NextResponse.json({ celebration: null }) // no plan yet

  const { plan, currentWeek, config } = userPlan
  const db = createServerClient()

  // 1. Existing celebration records for this user
  const { data: existingRows } = await db
    .from('celebration_events')
    .select('celebration_type, context_key')
    .eq('user_id', session.userId)

  const existingSet = new Set(
    (existingRows ?? []).map((e) => `${e.celebration_type}:${e.context_key}`)
  )

  // 2. All actual runs for this year
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

  const today   = new Date().toISOString().slice(0, 10)
  const todayMs = new Date(`${today}T12:00:00Z`).getTime()
  const newCelebrations: { type: string; key: string }[] = []

  // ── Goal 1: Daily run completed ──────────────────────────────────────────────
  for (const week of plan) {
    for (const planned of week.runs) {
      if (planned.type === 'strength') continue  // strength sessions are not running events

      const plannedMs = new Date(`${planned.date}T12:00:00Z`).getTime()
      const daysAgo   = (todayMs - plannedMs) / 86_400_000
      if (daysAgo < 0 || daysAgo > 1.5) continue

      const key = `daily-${planned.date}`
      if (existingSet.has(`daily_run:${key}`)) continue

      const match = allRuns.find((r) => {
        const rMs = new Date(`${r.runDate}T12:00:00Z`).getTime()
        return Math.abs(rMs - plannedMs) <= 86_400_000 * 1.5 &&
               r.distanceKm >= planned.targetDistanceKm * 0.9
      })
      if (match) newCelebrations.push({ type: 'daily_run', key })
    }
  }

  // ── Goal 2: Week score ≥ 65 — trigger on first day of next week ──────────────
  if (currentWeek > 1) {
    const lastWeekNum = currentWeek - 1
    const lastWeek    = plan.find((w) => w.weekNumber === lastWeekNum)
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

  // ── Goal 3: Yearly 1,000 km ─────────────────────────────────────────────────
  {
    const key = `yearly-1000-${YEAR}`
    if (!existingSet.has(`yearly_1000:${key}`)) {
      const totalKm = allRuns.reduce((s, r) => s + r.distanceKm, 0)
      if (totalKm >= GOAL_KM) newCelebrations.push({ type: 'yearly_1000', key })
    }
  }

  // ── Goal 4: All plan weeks completed ─────────────────────────────────────────
  {
    const key = `full-plan-${YEAR}`
    if (!existingSet.has(`full_plan:${key}`) && currentWeek > plan.length) {
      newCelebrations.push({ type: 'full_plan', key })
    }
  }

  // ── Goal 5: Marathon sub goal time on race date ──────────────────────────────
  {
    // Key is goal-specific so runners with different targets get distinct records
    const goalMins = Math.floor(config.goalSeconds / 60)
    const celebType = `marathon_sub_${goalMins}`
    const key = `marathon-sub-${goalMins}-${YEAR}`
    if (!existingSet.has(`${celebType}:${key}`)) {
      // Accept any run ≥ 90% of marathon distance on or after race date
      const goalPace = config.goalSeconds / 42.195 / 60
      const hit = allRuns.find(
        (r) => r.runDate >= config.raceDate &&
               r.distanceKm >= 42.195 * 0.90 &&
               r.paceMinPerKm <= goalPace * 1.005 // 0.5% tolerance for GPS
      )
      if (hit) newCelebrations.push({ type: celebType, key })
    }
  }

  // 3. Persist newly triggered celebrations
  if (newCelebrations.length > 0) {
    const { error: insertError } = await db.from('celebration_events').insert(
      newCelebrations.map((c) => ({
        user_id:          session.userId,
        celebration_type: c.type,
        context_key:      c.key,
      }))
    )
    if (insertError) console.error('Failed to insert celebrations:', insertError)
  }

  // 4. Return oldest unshown celebration
  const { data: unshown } = await db
    .from('celebration_events')
    .select('*')
    .eq('user_id', session.userId)
    .is('shown_at', null)
    .order('triggered_at', { ascending: true })
    .limit(1)

  return NextResponse.json({ celebration: unshown?.[0] ?? null })
}

// ─── POST: mark shown ────────────────────────────────────────────────────────
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
