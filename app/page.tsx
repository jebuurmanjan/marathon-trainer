import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Strava access was denied. Please try again.',
  db_error:      'Database error. Please try again.',
  server_error:  'Something went wrong. Please try again.',
}

interface PageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function HomePage({ searchParams }: PageProps) {
  const session = await getSession()
  if (session) redirect('/plan')

  const { error } = await searchParams
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? 'An error occurred.') : null

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: '#F5F3EC' }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl"
          style={{ background: 'rgba(238,107,23,0.05)' }}
        />
      </div>

      <div className="relative z-10 text-center max-w-sm w-full">
        {/* Brand mark */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-sm"
          style={{ background: '#EDE9DE', border: '1px solid rgba(43,49,23,0.08)' }}
        >
          ⏱
        </div>

        <h1
          className="text-4xl mb-1"
          style={{
            fontFamily:    'Nohemi, Inter, sans-serif',
            fontWeight:    600,
            letterSpacing: '-0.045em',
            color:         '#1E1611',
          }}
        >
          Run<span style={{ color: '#EE6B17' }}>Buddy</span>
        </h1>
        <p className="text-base mb-10" style={{ color: '#736554' }}>
          Your personal marathon training plan
        </p>

        {/* Error */}
        {errorMessage && (
          <div
            className="mb-6 rounded-xl px-4 py-3 text-sm text-left"
            style={{
              background: 'rgba(238,107,23,0.10)',
              border:     '1px solid rgba(238,107,23,0.25)',
              color:      '#EE6B17',
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Connect with Strava */}
        <a
          href="/api/strava/auth"
          className="flex items-center justify-center gap-2.5 w-full text-white font-bold py-3.5 px-6 rounded-2xl transition-opacity hover:opacity-90 text-base mb-6"
          style={{ background: '#EE6B17' }}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current shrink-0">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
          Connect with Strava
        </a>

        <p className="text-xs leading-relaxed" style={{ color: '#A09880' }}>
          Connect your Strava account to get a personalised<br />
          plan built around your race date and training level.
        </p>
      </div>
    </main>
  )
}
