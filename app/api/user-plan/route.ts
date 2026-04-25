import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getUserPlan } from '@/lib/user-plan'
import { createServerClient } from '@/lib/supabase'
import { formatPaceDisplay } from '@/lib/training-plan'
import { formatGoalTime } from '@/lib/plan-generator'

// GET /api/user-plan — returns the logged-in user's generated plan + metadata
// Used by client-component pages (Plan, Suggestions) that can't call DB directly.
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [userPlan, userRow] = await Promise.all([
    getUserPlan(session.userId, session.stravaId),
    createServerClient()
      .from('users')
      .select('display_name, profile_photo_url, preferred_units, theme')
      .eq('id', session.userId)
      .single()
      .then((r) => r.data),
  ])

  if (!userPlan) {
    // User who hasn't completed onboarding yet
    return NextResponse.json({ needsOnboarding: true }, { status: 404 })
  }

  const { planId, planName, config, plan, paces, planStartDate, currentWeek } = userPlan
  const effectiveName = userRow?.display_name ?? session.name

  return NextResponse.json({
    planId,
    planName,
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
    // Account fields for Navigation / SideMenu
    userName:        effectiveName,
    profilePhotoUrl: userRow?.profile_photo_url ?? null,
    preferredUnits:  (userRow?.preferred_units ?? 'km') as 'km' | 'miles',
    theme:           (userRow?.theme ?? 'light') as 'light' | 'dark',
  })
}
