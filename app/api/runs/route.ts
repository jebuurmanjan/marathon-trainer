import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getActualRuns } from '@/lib/strava'
import { createServerClient } from '@/lib/supabase'
import { getUserPlan } from '@/lib/user-plan'

// GET /api/runs — returns all actual runs for the user's plan period + display name
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userPlan = await getUserPlan(session.userId, session.stravaId)

  // If no plan yet, return empty — client will redirect to onboarding
  const startDate = userPlan?.planStartDate ?? new Date().toISOString().slice(0, 10)
  const endDate   = userPlan?.config.raceDate ?? new Date().toISOString().slice(0, 10)

  const runs = await getActualRuns(session.userId, startDate, endDate)

  const db = createServerClient()
  const { data: user } = await db
    .from('users')
    .select('name')
    .eq('id', session.userId)
    .single()

  return NextResponse.json({
    runs,
    userName:    user?.name ?? session.name,
    needsOnboarding: !userPlan,
  })
}
