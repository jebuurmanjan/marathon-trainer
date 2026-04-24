import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase'
import { generatePlanName } from '@/lib/user-plan'

// GET /api/plans — list all training plans for the current user
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServerClient()
  const { data, error } = await db
    .from('training_plans')
    .select('id, name, race_date, goal_seconds, weekly_km, is_active, created_at')
    .eq('user_id', session.userId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to load plans' }, { status: 500 })

  const plans = (data ?? []).map((p) => ({
    id:          p.id,
    name:        p.name || generatePlanName(p.race_date, p.goal_seconds),
    raceDate:    p.race_date,
    goalSeconds: p.goal_seconds,
    weeklyKm:    p.weekly_km,
    isActive:    p.is_active,
    createdAt:   p.created_at,
  }))

  return NextResponse.json({ plans })
}

// PATCH /api/plans — switch the active plan
// Body: { planId: string }
export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { planId } = await req.json()
  if (!planId) return NextResponse.json({ error: 'Missing planId' }, { status: 400 })

  const db = createServerClient()

  // Verify the plan belongs to this user
  const { data: plan } = await db
    .from('training_plans')
    .select('id')
    .eq('id', planId)
    .eq('user_id', session.userId)
    .maybeSingle()

  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  // Deactivate all plans for this user
  await db
    .from('training_plans')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_id', session.userId)

  // Activate the selected plan
  await db
    .from('training_plans')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', planId)

  return NextResponse.json({ ok: true })
}
