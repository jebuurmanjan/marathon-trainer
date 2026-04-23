import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { syncActivities } from '@/lib/strava'

// POST /api/strava/sync — pull all runs from Strava since Jan 1 of current year
// Syncing from year start (not just plan start) ensures the Statistics page
// has full-year data even for runs completed before the marathon plan began.
export async function POST() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const yearStart = new Date(`${new Date().getFullYear()}-01-01T00:00:00Z`)
    const count = await syncActivities(session.userId, yearStart)
    return NextResponse.json({ ok: true, synced: count })
  } catch (err) {
    console.error('Sync error:', err)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
