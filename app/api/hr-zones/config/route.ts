import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase'
import { DEFAULT_ZONES, ZoneConfig } from '@/lib/hr-zones'

// GET /api/hr-zones/config — return current user's zone boundaries (or defaults)
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const db = createServerClient()
    const { data } = await db
      .from('hr_zone_configs')
      .select('*')
      .eq('user_id', session.userId)
      .single()

    if (!data) return NextResponse.json({ config: DEFAULT_ZONES })

    const config: ZoneConfig = {
      zone1Max: data.zone1_max,
      zone2Max: data.zone2_max,
      zone3Max: data.zone3_max,
      zone4Max: data.zone4_max,
      zone5Max: data.zone5_max,
    }
    return NextResponse.json({ config })
  } catch {
    return NextResponse.json({ config: DEFAULT_ZONES })
  }
}

// PUT /api/hr-zones/config — save updated zone boundaries
export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as ZoneConfig

  // Validate: each boundary must be a positive integer, and strictly increasing
  const vals = [body.zone1Max, body.zone2Max, body.zone3Max, body.zone4Max, body.zone5Max]
  if (vals.some((v) => !Number.isInteger(v) || v < 50 || v > 250)) {
    return NextResponse.json({ error: 'Invalid zone values' }, { status: 400 })
  }
  for (let i = 1; i < vals.length; i++) {
    if (vals[i] <= vals[i - 1]) {
      return NextResponse.json({ error: 'Zone boundaries must be strictly increasing' }, { status: 400 })
    }
  }

  try {
    const db = createServerClient()
    await db.from('hr_zone_configs').upsert({
      user_id:   session.userId,
      zone1_max: body.zone1Max,
      zone2_max: body.zone2Max,
      zone3_max: body.zone3Max,
      zone4_max: body.zone4Max,
      zone5_max: body.zone5Max,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Zone config save error:', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
