import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase'
import { StrengthOverride } from '@/types'

// GET /api/plan-strength-overrides?planId=xxx
export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const planId = searchParams.get('planId')
  if (!planId) return NextResponse.json({ error: 'Missing planId' }, { status: 400 })

  const db = createServerClient()

  // Verify plan belongs to user
  const { data: plan } = await db
    .from('training_plans')
    .select('id')
    .eq('id', planId)
    .eq('user_id', session.userId)
    .maybeSingle()

  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const { data, error } = await db
    .from('plan_strength_overrides')
    .select('session_date, week_number, workout_id, strength_workouts(name, category, exercises, duration_minutes)')
    .eq('plan_id', planId)

  if (error) {
    console.error('plan-strength-overrides GET error:', error)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }

  const overrides: StrengthOverride[] = (data ?? []).map((r) => {
    const w = r.strength_workouts as unknown as { name: string; category: string; exercises: string[]; duration_minutes: number }
    return {
      sessionDate:     r.session_date as string,
      weekNumber:      r.week_number as number,
      workoutId:       r.workout_id as string,
      workoutName:     w.name,
      workoutCategory: w.category as StrengthOverride['workoutCategory'],
      exercises:       w.exercises as string[],
      durationMinutes: w.duration_minutes,
    }
  })

  return NextResponse.json({ overrides })
}

// PATCH /api/plan-strength-overrides — save a workout swap
// Body: { planId, sessionDate, weekNumber, workoutId }
export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let planId: string, sessionDate: string, weekNumber: number, workoutId: string
  try {
    ;({ planId, sessionDate, weekNumber, workoutId } = await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!planId || !sessionDate || weekNumber === undefined || !workoutId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(sessionDate)) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
  }

  const db = createServerClient()

  // Verify plan belongs to user
  const { data: plan } = await db
    .from('training_plans')
    .select('id')
    .eq('id', planId)
    .eq('user_id', session.userId)
    .maybeSingle()

  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const { error } = await db
    .from('plan_strength_overrides')
    .upsert(
      { plan_id: planId, session_date: sessionDate, week_number: weekNumber, workout_id: workoutId },
      { onConflict: 'plan_id,session_date' }
    )

  if (error) {
    console.error('plan-strength-overrides PATCH error:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/plan-strength-overrides — reset to default
// Body: { planId, sessionDate }
export async function DELETE(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let planId: string, sessionDate: string
  try {
    ;({ planId, sessionDate } = await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!planId || !sessionDate) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const db = createServerClient()

  const { error } = await db
    .from('plan_strength_overrides')
    .delete()
    .eq('plan_id', planId)
    .eq('session_date', sessionDate)

  if (error) {
    console.error('plan-strength-overrides DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
