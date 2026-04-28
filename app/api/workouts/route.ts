import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase'

// GET /api/workouts — returns the full strength workout library
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServerClient()
  const { data, error } = await db
    .from('strength_workouts')
    .select('id, slug, name, equipment, category, phases, duration_minutes, exercises')
    .order('sort_order')

  if (error) {
    console.error('workouts GET error:', error)
    return NextResponse.json({ error: 'Failed to load workouts' }, { status: 500 })
  }

  return NextResponse.json({ workouts: data ?? [] })
}
