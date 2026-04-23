import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { syncSingleActivity } from '@/lib/strava'

// GET — Strava webhook subscription verification
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ 'hub.challenge': challenge })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// POST — Strava sends activity events here
export async function POST(req: NextRequest) {
  try {
    const event = await req.json()

    // We only care about activity create/update events
    if (event.object_type !== 'activity' || !['create', 'update'].includes(event.aspect_type)) {
      return NextResponse.json({ ok: true })
    }

    const stravaAthleteId = event.owner_id
    const activityId = event.object_id

    // Find the user in our DB by Strava athlete ID
    const db = createServerClient()
    const { data: user } = await db
      .from('users')
      .select('id')
      .eq('strava_id', stravaAthleteId)
      .single()

    if (!user) {
      return NextResponse.json({ ok: true })
    }

    // Fetch and store the activity
    await syncSingleActivity(user.id, activityId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
