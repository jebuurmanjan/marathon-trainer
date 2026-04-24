import { createServerClient } from '@/lib/supabase'
import { generatePlan, getWeekNumber, calcPaces, UserPlanConfig, PlanPaces, formatGoalTime } from './plan-generator'
import { Week } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserPlan {
  planId:        string
  planName:      string
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function generatePlanName(raceDate: string, goalSeconds: number): string {
  const h = Math.floor(goalSeconds / 3600)
  const m = Math.floor((goalSeconds % 3600) / 60)
  const goalLabel = `Sub ${h}:${String(m).padStart(2, '0')}`
  const date = new Date(raceDate + 'T12:00:00Z')
  const monthYear = date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  return `${goalLabel} · ${monthYear}`
}

// ─── Load + generate ──────────────────────────────────────────────────────────

/**
 * Load the user's active plan config from the DB and return the generated plan.
 * Returns null only for true new guests who have never used the app.
 *
 * Auto-seed priority:
 *  1. User already has an active training_plans row → use it
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

  // ── 1. Existing active plan ────────────────────────────────────────────────
  const { data } = await db
    .from('training_plans')
    .select('id, name, race_date, goal_seconds, weekly_km')
    .eq('user_id', userId)
    .eq('is_active', true)
    .is('archived_at', null)
    .maybeSingle()

  if (data) {
    return build(
      data.id,
      data.name || generatePlanName(data.race_date, data.goal_seconds),
      {
        raceDate:    data.race_date,
        goalSeconds: data.goal_seconds,
        weeklyKm:    data.weekly_km,
      }
    )
  }

  // ── 2. Primary athlete identified by env var ───────────────────────────────
  const primaryId = Number(process.env.STRAVA_ATHLETE_ID)
  if (!isNaN(primaryId) && primaryId > 0 && stravaId === primaryId) {
    const id = await tryInsertDefault(db, userId)
    return build(id ?? 'jan-default', generatePlanName(JAN_CONFIG.raceDate, JAN_CONFIG.goalSeconds), JAN_CONFIG)
  }

  // ── 3. Fallback: user has runs → pre-dates the multi-user update ───────────
  const { count } = await db
    .from('actual_runs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if ((count ?? 0) > 0) {
    const id = await tryInsertDefault(db, userId)
    return build(id ?? 'jan-default', generatePlanName(JAN_CONFIG.raceDate, JAN_CONFIG.goalSeconds), JAN_CONFIG)
  }

  // ── 4. True new guest — needs onboarding ──────────────────────────────────
  return null
}

async function tryInsertDefault(
  db: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<string | null> {
  // First check if a plan already exists (any active plan)
  const { data: existing } = await db
    .from('training_plans')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .is('archived_at', null)
    .maybeSingle()

  if (existing) return existing.id

  const { data } = await db
    .from('training_plans')
    .insert({
      user_id:      userId,
      name:         generatePlanName(JAN_CONFIG.raceDate, JAN_CONFIG.goalSeconds),
      race_date:    JAN_CONFIG.raceDate,
      goal_seconds: JAN_CONFIG.goalSeconds,
      weekly_km:    JAN_CONFIG.weeklyKm,
      is_active:    true,
    })
    .select('id')
    .single()
    .then((r) => r, () => ({ data: null }))

  return data?.id ?? null
}

function build(planId: string, planName: string, config: UserPlanConfig): UserPlan {
  const plan          = generatePlan(config)
  const planStartDate = plan[0].startDate
  const currentWeek   = getWeekNumber(planStartDate, config.raceDate)
  const paces         = calcPaces(config.goalSeconds)
  return { planId, planName, config, plan, paces, planStartDate, currentWeek }
}
