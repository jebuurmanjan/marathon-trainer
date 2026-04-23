import { NextResponse } from 'next/server'

// Redirect user to Strava's OAuth consent screen
export async function GET() {
  const clientId = process.env.STRAVA_CLIENT_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const redirectUri = `${appUrl}/api/strava/callback`

  const params = new URLSearchParams({
    client_id: clientId!,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
  })

  return NextResponse.redirect(`https://www.strava.com/oauth/authorize?${params}`)
}
