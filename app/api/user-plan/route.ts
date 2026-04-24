import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getUserPlan } from '@/lib/user-plan'
import { formatPaceDisplay } from '@/lib/training-plan'
import { formatGoalTime } from '@/lib/plan-generator'

// GET /api/user-plan — returns the logged-in user's generated plan + metadata
// Used by client-component pages (Plan, Suggestions) that can't call DB directly.
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userPlan = await getUserPlan(session.userId, session.stravaId)

  if (!userPlan) {
    // Guest user who hasn't completed onboarding
    return NextResponse.json({ needsOnboarding: true }, { status: 404 })
  }

  const { config, plan, paces, planStartDate, currentWeek } = userPlan

  return NextResponse.json({
    config,
    plan,
    paces,
    planStartDate,
    currentWeek,
    goalLabel:   formatGoalTime(config.goalSeconds),
    mpLabel:     formatPaceDisplay(paces.mp),
    raceDateLabel: new Date(config.raceDate + 'T12:00:00Z').toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    }),
  })
}
