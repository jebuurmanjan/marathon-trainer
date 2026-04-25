import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase'

// GET /api/settings — return current user's account settings
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServerClient()
  const { data: user, error } = await db
    .from('users')
    .select('name, display_name, profile_photo_url, preferred_units, theme')
    .eq('id', session.userId)
    .single()

  if (error || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({
    stravaName:      user.name,
    displayName:     user.display_name ?? null,
    effectiveName:   user.display_name ?? user.name,
    profilePhotoUrl: user.profile_photo_url ?? null,
    units:           user.preferred_units ?? 'km',
    theme:           user.theme ?? 'light',
  })
}

// PATCH /api/settings — update one or more preference fields
export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { displayName, units, theme } = body as {
    displayName?: string | null
    units?:       string
    theme?:       string
  }

  // Validate provided fields
  if (units !== undefined && !['km', 'miles'].includes(units)) {
    return NextResponse.json({ error: 'units must be "km" or "miles"' }, { status: 400 })
  }
  if (theme !== undefined && !['light', 'dark'].includes(theme)) {
    return NextResponse.json({ error: 'theme must be "light" or "dark"' }, { status: 400 })
  }
  if (displayName !== undefined && displayName !== null && displayName.length > 60) {
    return NextResponse.json({ error: 'Display name must be 60 characters or fewer' }, { status: 400 })
  }

  // Build update object — only include fields that were provided
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (displayName !== undefined) updates.display_name    = displayName || null  // empty string → null
  if (units       !== undefined) updates.preferred_units = units
  if (theme       !== undefined) updates.theme           = theme

  const db = createServerClient()
  const { error } = await db
    .from('users')
    .update(updates)
    .eq('id', session.userId)

  if (error) {
    console.error('Settings update error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
