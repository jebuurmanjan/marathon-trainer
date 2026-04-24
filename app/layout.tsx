import type { Metadata } from 'next'
import './globals.css'
import CelebrationProvider from '@/components/CelebrationProvider'

export const metadata: Metadata = {
  title: 'Sub 3:30 Marathon Trainer',
  description: 'Personal marathon training plan — synced with Strava, coached by AI.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
