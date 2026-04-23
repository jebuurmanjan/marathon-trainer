import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { syncActivities } from '@/lib/strava'
import { PLAN_START_DATE } from '@/lib/training-plan'

// POST /api/strava/sync — manually pull all runs from Strava since plan start
export async function POST() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const afterDate = new Date(PLAN_START_DATE)
    const count = await syncActivities(session.userId, afterDate)
    return NextResponse.json({ ok: true, synced: count })
  } catch (err) {
    console.error('Sync error:', err)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
