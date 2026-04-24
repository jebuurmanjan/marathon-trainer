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
 * Returns null only for true new guests who have never used the app.
 *
 * Auto-seed priority:
 *  1. User already has a user_plans row → use it
 *  2. STRAVA_ATHLETE_ID env var matches → primary athlete (Jan), seed default config
 *  3. User has existing actual_runs → pre-existing user before multi-user update,
 *     seed default config (avoids getting stuck in onboarding on existing accounts)
 *  4. None of the above → true new guest, redirect to onboarding
 */
export async function getUserPlan(
  userId:   string,
  stravaId: number,
): Promise<UserPlan | null> {
  const db = createServerClient()

  // ── 1. Existing plan config ────────────────────────────────────────────────
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

  // ── 2. Primary athlete identified by env var ───────────────────────────────
  const primaryId = Number(process.env.STRAVA_ATHLETE_ID)
  if (!isNaN(primaryId) && primaryId > 0 && stravaId === primaryId) {
    await tryInsertDefault(db, userId)
    return build(JAN_CONFIG)
  }

  // ── 3. Fallback: user has runs → pre-dates the multi-user update ───────────
  // This handles the case where STRAVA_ATHLETE_ID is not configured but the
  // user (Jan) is already actively using the app with synced Strava data.
  const { count } = await db
    .from('actual_runs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if ((count ?? 0) > 0) {
    await tryInsertDefault(db, userId)
    return build(JAN_CONFIG)
  }

  // ── 4. True new guest — needs onboarding ──────────────────────────────────
  return null
}

async function tryInsertDefault(db: ReturnType<typeof createServerClient>, userId: string) {
  // Ignore errors — table may not exist yet (migration pending) or row may
  // already exist (race condition). The plan is returned from JAN_CONFIG either way.
  await db.from('user_plans').insert({
    user_id:      userId,
    race_date:    JAN_CONFIG.raceDate,
    goal_seconds: JAN_CONFIG.goalSeconds,
    weekly_km:    JAN_CONFIG.weeklyKm,
  }).then(() => {}, () => {})
}

function build(config: UserPlanConfig): UserPlan {
  const plan          = generatePlan(config)
  const planStartDate = plan[0].startDate
  const currentWeek   = getWeekNumber(planStartDate, config.raceDate)
  const paces         = calcPaces(config.goalSeconds)
  return { config, plan, paces, planStartDate, currentWeek }
}
