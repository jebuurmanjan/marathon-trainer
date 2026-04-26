import type { Metadata } from 'next'
import './globals.css'
import CelebrationProvider from '@/components/CelebrationProvider'
import { getSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase'

export const metadata: Metadata = {
  title: 'Sub 3:30 Marathon Trainer',
  description: 'Personal marathon training plan — synced with Strava, coached by AI.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read the user's saved theme preference server-side so the correct
  // data-theme is set before the page paints — no flash of wrong theme.
  let theme = 'light'
  try {
    const session = await getSession()
    if (session) {
      const db = createServerClient()
      const { data } = await db
        .from('users')
        .select('theme')
        .eq('id', session.userId)
        .single()
      theme = data?.theme ?? 'light'
    }
  } catch {
    // Non-fatal — fall back to light
  }

  return (
    <html lang="en" data-theme={theme}>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <CelebrationProvider>{children}</CelebrationProvider>
      </body>
    </html>
  )
}
