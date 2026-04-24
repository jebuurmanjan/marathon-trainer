import { createServerClient } from '@/lib/supabase'
import { generatePlan, getWeekNumber, calcPaces, UserPlanConfig, PlanPaces } from './plan-generator'
import { Week } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserPlan {
  config:        UserPlanConfig
  plan:          Week[]
  paces:         PlanPaces
  planStartDate: string
  currentWeek:   number
}

// ─── Jan's default config (auto-seeded on first login) ───────────────────────

export const JAN_CONFIG: UserPlanConfig = {
  raceDate:    '2026-11-01',
  goalSeconds: 12600,   // 3:30:00
  weeklyKm:    50,
}

// ─── Load + generate ──────────────────────────────────────────────────────────

/**
 * Load the user's plan config from the DB and return the generated plan.
 * Returns null if the user has not completed onboarding yet.
 * Auto-seeds Jan's config if this is the primary athlete's first login.
 */
export async function getUserPlan(
  userId:   string,
  stravaId: number,
): Promise<UserPlan | null> {
  const db = createServerClient()

  const { data } = await db
    .from('user_plans')
    .select('race_date, goal_seconds, weekly_km')
    .eq('user_id', userId)
    .maybeSingle()

  if (data) {
    return build({
      raceDate:    data.race_date,
      goalSeconds: data.goal_seconds,
      weeklyKm:    data.weekly_km,
    })
  }

  // Auto-seed the primary athlete (Jan) on first visit
  const primaryId = Number(process.env.STRAVA_ATHLETE_ID)
  if (primaryId && stravaId === primaryId) {
    await db.from('user_plans').insert({
      user_id:      userId,
      race_date:    JAN_CONFIG.raceDate,
      goal_seconds: JAN_CONFIG.goalSeconds,
      weekly_km:    JAN_CONFIG.weeklyKm,
    })
    return build(JAN_CONFIG)
  }

  return null // guest: needs onboarding
}

function build(config: UserPlanConfig): UserPlan {
  const plan          = generatePlan(config)
  const planStartDate = plan[0].startDate
  const currentWeek   = getWeekNumber(planStartDate, config.raceDate)
  const paces         = calcPaces(config.goalSeconds)
  return { config, plan, paces, planStartDate, currentWeek }
}
