import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase'

// POST /api/onboarding — save the guest user's plan config
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { raceDate, goalSeconds, weeklyKm } = body

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
  if (goalSeconds < 7200 || goalSeconds > 21600) { // 2h – 6h
    return NextResponse.json({ error: 'Invalid goal time' }, { status: 400 })
  }
  if (weeklyKm < 10 || weeklyKm > 150) {
    return NextResponse.json({ error: 'Weekly km out of range' }, { status: 400 })
  }

  const db = createServerClient()
  const { error } = await db
    .from('user_plans')
    .upsert(
      {
        user_id:      session.userId,
        race_date:    raceDate,
        goal_seconds: Math.round(goalSeconds),
        weekly_km:    Math.round(weeklyKm),
        updated_at:   new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (error) {
    console.error('Onboarding save error:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
