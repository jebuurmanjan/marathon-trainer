import { NextRequest, NextResponse } from 'next/server'

// GET /api/strava/auth
// Redirect to Strava's OAuth consent screen.
export async function GET(req: NextRequest) {
  const clientId = process.env.STRAVA_CLIENT_ID

  const host        = req.headers.get('host') ?? 'localhost:3000'
  const protocol    = host.startsWith('localhost') ? 'http' : 'https'
  const redirectUri = `${protocol}://${host}/api/strava/callback`

  const params = new URLSearchParams({
    client_id:       clientId!,
    redirect_uri:    redirectUri,
    response_type:   'code',
    approval_prompt: 'auto',
    scope:           'read,activity:read_all',
  })

  return NextResponse.redirect(`https://www.strava.com/oauth/authorize?${params}`)
}
