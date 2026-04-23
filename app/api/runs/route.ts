import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getActualRuns } from '@/lib/strava'
import { createServerClient } from '@/lib/supabase'
import { PLAN_START_DATE, RACE_DATE } from '@/lib/training-plan'

// GET /api/runs — returns all actual runs + the logged-in user's name
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const runs = await getActualRuns(session.userId, PLAN_START_DATE, RACE_DATE)

  // Fetch user's display name from DB
  const db = createServerClient()
  const { data: user } = await db
    .from('users')
    .select('name')
    .eq('id', session.userId)
    .single()

  return NextResponse.json({
    runs,
    userName: user?.name ?? session.name,
  })
}
