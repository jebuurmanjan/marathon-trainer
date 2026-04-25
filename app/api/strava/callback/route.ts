import { NextRequest, NextResponse } from 'next/server'
import { exchangeCode } from '@/lib/strava'
import { createServerClient } from '@/lib/supabase'
import { createSession, setSessionCookie } from '@/lib/session'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/?error=access_denied', req.url))
  }

  try {
    const { tokens, athlete } = await exchangeCode(code)

    const db = createServerClient()

    // Upsert user record — update tokens and profile on every login
    const { data: user, error: dbError } = await db
      .from('users')
      .upsert(
        {
          strava_id:               athlete.id,
          strava_access_token:     tokens.accessToken,
          strava_refresh_token:    tokens.refreshToken,
          strava_token_expires_at: new Date(tokens.expiresAt * 1000).toISOString(),
          name:                    `${athlete.firstname} ${athlete.lastname}`,
          profile_photo_url:       athlete.profile,
          updated_at:              new Date().toISOString(),
        },
        { onConflict: 'strava_id' }
      )
      .select('id, display_name, name')
      .single()

    if (dbError || !user) {
      console.error('DB upsert failed:', dbError)
      return NextResponse.redirect(new URL('/?error=db_error', req.url))
    }

    // Create session JWT using effective display name
    const effectiveName = user.display_name ?? user.name ?? `${athlete.firstname} ${athlete.lastname}`
    const token = await createSession({
      userId:   user.id,
      stravaId: athlete.id,
      name:     effectiveName,
    })

    // Redirect to plan if user has an active plan, else go to onboarding
    const { data: planRow } = await db
      .from('training_plans')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .is('archived_at', null)
      .maybeSingle()

    const destination = planRow ? '/plan' : '/onboarding'
    const response = NextResponse.redirect(new URL(destination, req.url))
    return setSessionCookie(response, token)
  } catch (err) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(new URL('/?error=server_error', req.url))
  }
}
