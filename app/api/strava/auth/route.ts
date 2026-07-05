import { NextRequest, NextResponse } from 'next/server'

// GET /api/strava/auth
// Redirect to Strava's OAuth consent screen.
export async function GET(req: NextRequest) {
  const clientId = process.env.STRAVA_CLIENT_ID

  const host     = req.headers.get('host') ?? 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL
  const baseUrl  = appUrl
    ? (appUrl.startsWith('http') ? appUrl : `https://${appUrl}`)
    : `${protocol}://${host}`
  const redirectUri = `${baseUrl}/api/strava/callback`

  // Use 'force' when the user explicitly clicks "Reconnect" so Strava always
  // shows the consent screen and re-issues a token with all requested scopes.
  const force = req.nextUrl.searchParams.get('force') === '1'

  const params = new URLSearchParams({
    client_id:       clientId!,
    redirect_uri:    redirectUri,
    response_type:   'code',
    approval_prompt: force ? 'force' : 'auto',
    scope:           'read,activity:read_all',
  })

  return NextResponse.redirect(`https://www.strava.com/oauth/authorize?${params}`)
}
