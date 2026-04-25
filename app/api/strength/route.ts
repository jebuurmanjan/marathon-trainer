import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase'

// GET /api/strength?planId=xxx
// Returns all completed strength session dates for the plan
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
    .from('strength_completions')
    .select('session_date')
    .eq('plan_id', planId)
    .eq('user_id', session.userId)

  if (error) {
    console.error('Strength GET error:', error)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }

  const completions = (data ?? []).map((r) => r.session_date as string)
  return NextResponse.json({ completions })
}

// POST /api/strength — mark a strength session complete
// Body: { planId, weekNumber, sessionDate }
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let planId: string, weekNumber: number, sessionDate: string
  try {
    ;({ planId, weekNumber, sessionDate } = await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!planId || weekNumber == null || !sessionDate) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (!Number.isInteger(weekNumber) || weekNumber < 1) {
    return NextResponse.json({ error: 'Invalid weekNumber' }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
    return NextResponse.json({ error: 'Invalid sessionDate format' }, { status: 400 })
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
    .from('strength_completions')
    .upsert(
      {
        user_id:      session.userId,
        plan_id:      planId,
        week_number:  weekNumber,
        session_date: sessionDate,
      },
      { onConflict: 'user_id,plan_id,session_date' }
    )

  if (error) {
    console.error('Strength POST error:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/strength — unmark a strength session
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
    return NextResponse.json({ error: 'Invalid sessionDate format' }, { status: 400 })
  }

  const db = createServerClient()

  const { error } = await db
    .from('strength_completions')
    .delete()
    .eq('user_id', session.userId)
    .eq('plan_id', planId)
    .eq('session_date', sessionDate)

  if (error) {
    console.error('Strength DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
