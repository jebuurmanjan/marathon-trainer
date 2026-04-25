import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase'
import { generatePlanName } from '@/lib/user-plan'

// POST /api/onboarding — save a new plan config (deactivates any existing active plan)
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { raceDate, goalSeconds, weeklyKm, runsPerWeek, strengthDays, equipmentType, planWeeks } = body as {
    raceDate: string; goalSeconds: number; weeklyKm: number
    runsPerWeek?: number; strengthDays?: number; equipmentType?: string; planWeeks?: number
  }

  if (!raceDate || !goalSeconds || !weeklyKm) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Basic validation
  const race = new Date(raceDate)
  const now  = new Date()
  const weeksAway = (race.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 7)
  if (isNaN(race.getTime()) || weeksAway < 4) {
    return NextResponse.json({ error: 'Race date must be at least 4 weeks away' }, { status: 400 })
  }
  if (goalSeconds < 9000 || goalSeconds > 16200) { // 2:30 – 4:30
    return NextResponse.json({ error: 'Invalid goal time' }, { status: 400 })
  }
  if (weeklyKm < 10 || weeklyKm > 150) {
    return NextResponse.json({ error: 'Weekly km out of range' }, { status: 400 })
  }

  const db = createServerClient()

  // Deactivate any currently active plan for this user
  await db
    .from('training_plans')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_id', session.userId)
    .eq('is_active', true)

  // Insert the new active plan
  const { error } = await db
    .from('training_plans')
    .insert({
      user_id:        session.userId,
      name:           generatePlanName(raceDate, Math.round(goalSeconds)),
      race_date:      raceDate,
      goal_seconds:   Math.round(goalSeconds),
      weekly_km:      Math.round(weeklyKm),
      runs_per_week:  runsPerWeek    ?? 4,
      strength_days:  strengthDays   ?? 0,
      equipment_type: equipmentType  ?? 'bodyweight',
      plan_weeks:     planWeeks      ?? 27,
      is_active:      true,
    })

  if (error) {
    console.error('Onboarding save error:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
