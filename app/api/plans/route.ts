import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase'
import { generatePlanName } from '@/lib/user-plan'

// GET /api/plans — list training plans for the current user
// ?all=true includes archived plans
export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const includeArchived = searchParams.get('all') === 'true'

  const db = createServerClient()
  let query = db
    .from('training_plans')
    .select('id, name, race_date, goal_seconds, weekly_km, is_active, archived_at, created_at')
    .eq('user_id', session.userId)
    .order('created_at', { ascending: false })

  if (!includeArchived) {
    query = query.is('archived_at', null)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Failed to load plans' }, { status: 500 })

  const plans = (data ?? []).map((p) => ({
    id:          p.id,
    name:        p.name || generatePlanName(p.race_date, p.goal_seconds),
    raceDate:    p.race_date,
    goalSeconds: p.goal_seconds,
    weeklyKm:    p.weekly_km,
    isActive:    p.is_active,
    archivedAt:  p.archived_at ?? null,
    createdAt:   p.created_at,
  }))

  return NextResponse.json({ plans })
}

// PATCH /api/plans — activate, archive, or unarchive a plan
// Body: { planId, action: 'activate' | 'archive' | 'unarchive' }
export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let planId: string, action: string
  try {
    ;({ planId, action } = await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!planId || !action) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const db = createServerClient()

  // Verify plan belongs to this user
  const { data: plan } = await db
    .from('training_plans')
    .select('id, is_active, archived_at')
    .eq('id', planId)
    .eq('user_id', session.userId)
    .maybeSingle()

  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  if (action === 'activate') {
    // Deactivate all plans, then activate selected
    await db
      .from('training_plans')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', session.userId)

    await db
      .from('training_plans')
      .update({ is_active: true, archived_at: null, updated_at: new Date().toISOString() })
      .eq('id', planId)

  } else if (action === 'archive') {
    // If this is the active plan, auto-activate the next newest non-archived plan
    if (plan.is_active) {
      const { data: next } = await db
        .from('training_plans')
        .select('id')
        .eq('user_id', session.userId)
        .is('archived_at', null)
        .eq('is_active', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!next) {
        return NextResponse.json(
          { error: 'Create or activate another plan before archiving this one.' },
          { status: 400 }
        )
      }

      // Activate the fallback plan
      await db
        .from('training_plans')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', next.id)
    }

    // Archive the target plan
    await db
      .from('training_plans')
      .update({ is_active: false, archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', planId)

  } else if (action === 'unarchive') {
    // Simply remove the archived_at timestamp (stays inactive — user can activate separately)
    await db
      .from('training_plans')
      .update({ archived_at: null, updated_at: new Date().toISOString() })
      .eq('id', planId)

  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/plans — permanently delete a plan
// Body: { planId }
export async function DELETE(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let planId: string
  try {
    ;({ planId } = await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!planId) return NextResponse.json({ error: 'Missing planId' }, { status: 400 })

  const db = createServerClient()

  // Verify ownership
  const { data: plan } = await db
    .from('training_plans')
    .select('id, is_active')
    .eq('id', planId)
    .eq('user_id', session.userId)
    .maybeSingle()

  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  // Prevent deleting the active plan if it's the only non-archived one
  if (plan.is_active) {
    const { data: others } = await db
      .from('training_plans')
      .select('id')
      .eq('user_id', session.userId)
      .is('archived_at', null)
      .neq('id', planId)
      .limit(1)

    if (!others?.length) {
      return NextResponse.json(
        { error: 'Cannot delete your only active plan. Create a new one first.' },
        { status: 400 }
      )
    }

    // Auto-activate the next plan
    const { data: next } = await db
      .from('training_plans')
      .select('id')
      .eq('user_id', session.userId)
      .is('archived_at', null)
      .eq('is_active', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (next) {
      await db
        .from('training_plans')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', next.id)
    }
  }

  await db.from('training_plans').delete().eq('id', planId)

  return NextResponse.json({ ok: true })
}
