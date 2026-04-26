import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase'

// GET /api/plan-overrides?planId=xxx
// Returns all run date overrides for the plan
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
    .from('plan_run_overrides')
    .select('original_date, run_type, new_date')
    .eq('plan_id', planId)

  if (error) {
    console.error('plan-overrides GET error:', error)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }

  const overrides = (data ?? []).map((r) => ({
    originalDate: r.original_date as string,
    runType:      r.run_type as string,
    newDate:      r.new_date as string,
  }))

  return NextResponse.json({ overrides })
}

// PATCH /api/plan-overrides — move a run to a new date
// Body: { planId, originalDate, runType, newDate }
export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let planId: string, originalDate: string, runType: string, newDate: string
  try {
    ;({ planId, originalDate, runType, newDate } = await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!planId || !originalDate || !runType || !newDate) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(originalDate) || !dateRegex.test(newDate)) {
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
    .from('plan_run_overrides')
    .upsert(
      { plan_id: planId, original_date: originalDate, run_type: runType, new_date: newDate },
      { onConflict: 'plan_id,original_date,run_type' }
    )

  if (error) {
    console.error('plan-overrides PATCH error:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/plan-overrides — reset a run back to its original date
// Body: { planId, originalDate, runType }
export async function DELETE(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let planId: string, originalDate: string, runType: string
  try {
    ;({ planId, originalDate, runType } = await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!planId || !originalDate || !runType) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const db = createServerClient()

  const { error } = await db
    .from('plan_run_overrides')
    .delete()
    .eq('plan_id', planId)
    .eq('original_date', originalDate)
    .eq('run_type', runType)

  if (error) {
    console.error('plan-overrides DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
