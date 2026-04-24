import { NextRequest, NextResponse } from 'next/server'
import { exchangeCode } from '@/lib/strava'
import { createServerClient } from '@/lib/supabase'
import { createSession, setSessionCookie } from '@/lib/session'
import { JAN_CONFIG } from '@/lib/user-plan'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code  = searchParams.get('code')
  const error = searchParams.get('error')
  const mode  = searchParams.get('state') ?? 'guest' // 'jan' | 'guest'

  if (error || !code) {
    return NextResponse.redirect(new URL('/?error=access_denied', req.url))
  }

  try {
    const { tokens, athlete } = await exchangeCode(code)

    // Jan's route: enforce the single-athlete guard
    const allowedId = Number(process.env.STRAVA_ATHLETE_ID)
    if (mode === 'jan') {
      if (allowedId && athlete.id !== allowedId) {
        return NextResponse.redirect(new URL('/?error=unauthorized', req.url))
      }
    }

    const db = createServerClient()

    // Upsert user record
    const { data: user, error: dbError } = await db
      .from('users')
      .upsert(
        {
          strava_id:                  athlete.id,
          strava_access_token:        tokens.accessToken,
          strava_refresh_token:       tokens.refreshToken,
          strava_token_expires_at:    new Date(tokens.expiresAt * 1000).toISOString(),
          name:                       `${athlete.firstname} ${athlete.lastname}`,
          profile_photo_url:          athlete.profile,
          updated_at:                 new Date().toISOString(),
        },
        { onConflict: 'strava_id' }
      )
      .select()
      .single()

    if (dbError || !user) {
      console.error('DB upsert failed:', dbError)
      return NextResponse.redirect(new URL('/?error=db_error', req.url))
    }

    // Auto-seed plan config for the primary athlete (Jan)
    if (allowedId && athlete.id === allowedId) {
      const { data: existing } = await db
        .from('user_plans')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!existing) {
        await db.from('user_plans').insert({
          user_id:      user.id,
          race_date:    JAN_CONFIG.raceDate,
          goal_seconds: JAN_CONFIG.goalSeconds,
          weekly_km:    JAN_CONFIG.weeklyKm,
        })
      }
    }

    // Create session JWT
    const token = await createSession({
      userId:   user.id,
      stravaId: athlete.id,
      name:     `${athlete.firstname} ${athlete.lastname}`,
    })

    // Guests without a plan config go to onboarding
    const isJan = allowedId && athlete.id === allowedId
    let destination = '/plan'

    if (!isJan) {
      const { data: planRow } = await db
        .from('user_plans')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!planRow) destination = '/onboarding'
    }

    const response = NextResponse.redirect(new URL(destination, req.url))
    return setSessionCookie(response, token)
  } catch (err) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(new URL('/?error=server_error', req.url))
  }
}
