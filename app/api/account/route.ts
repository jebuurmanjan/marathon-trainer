import { NextResponse } from 'next/server'
import { getSession, clearSessionCookie } from '@/lib/session'
import { createServerClient } from '@/lib/supabase'

// DELETE /api/account — permanently delete the authenticated user's account and all data.
// Deletes in FK-safe order, clears the session cookie, and returns { ok: true }.
// The client is responsible for redirecting to / after receiving the response.
export async function DELETE() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db  = createServerClient()
  const uid = session.userId

  try {
    // 1. Strength completions (references training_plans)
    await db.from('strength_completions').delete().eq('user_id', uid)

    // 2. Celebration events
    await db.from('celebration_events').delete().eq('user_id', uid)

    // 3. AI suggestions
    await db.from('ai_suggestions').delete().eq('user_id', uid)

    // 4. HR zone config
    await db.from('hr_zone_configs').delete().eq('user_id', uid)

    // 5. Actual runs
    await db.from('actual_runs').delete().eq('user_id', uid)

    // 6. Training plans (after child tables)
    await db.from('training_plans').delete().eq('user_id', uid)

    // 7. User record (last — everything references this)
    const { error } = await db.from('users').delete().eq('id', uid)
    if (error) throw error
  } catch (err) {
    console.error('Account deletion error:', err)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }

  // Clear the session cookie
  const response = NextResponse.json({ ok: true })
  return clearSessionCookie(response)
}
