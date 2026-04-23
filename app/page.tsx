import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'

interface PageProps {
  searchParams: Promise<{ error?: string }>
}

const ERROR_MESSAGES: Record<string, string> = {
  access_denied:  'Strava access was denied. Please try again.',
  unauthorized:   'This app is private. Only the registered athlete can log in.',
  db_error:       'Database error. Please try again.',
  server_error:   'Something went wrong. Please try again.',
}

export default async function HomePage({ searchParams }: PageProps) {
  const session = await getSession()
  if (session) redirect('/plan')

  const { error } = await searchParams
  const errorMessage = error ? ERROR_MESSAGES[error] ?? 'An error occurred.' : null

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: '#F5F3EC' }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl"
          style={{ background: 'rgba(238,107,23,0.05)' }}
        />
      </div>

      <div className="relative z-10 text-center max-w-md w-full">
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6"
          style={{ background: '#EDE9DE', border: '1px solid rgba(43,49,23,0.08)' }}
        >
          ⏱️
        </div>

        {/* Title */}
        <h1
          className="text-4xl mb-2"
          style={{
            fontFamily: 'Nohemi, Inter, sans-serif',
            fontWeight: 600,
            letterSpacing: '-0.04em',
            color: '#1E1611',
          }}
        >
          Sub <span style={{ color: '#EE6B17' }}>3:30</span>
        </h1>
        <p className="text-lg mb-1" style={{ color: '#4A5427' }}>Marathon Trainer</p>
        <p className="text-sm mb-10" style={{ color: '#736554' }}>
          November 1, 2026 · 27 weeks · Your plan, your data
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          {[
            { label: 'Best marathon', value: '3:35' },
            { label: 'Target',        value: '3:30' },
            { label: 'Weeks to go',   value: '27'   },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl p-3"
              style={{ background: '#EDE9DE', border: '1px solid rgba(43,49,23,0.08)' }}
            >
              <div
                className="text-xl font-semibold"
                style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, color: '#1E1611' }}
              >
                {stat.value}
              </div>
              <div className="text-xs mt-0.5" style={{ color: '#736554' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Error */}
        {errorMessage && (
          <div
            className="mb-6 rounded-xl px-4 py-3 text-sm"
            style={{ background: 'rgba(238,107,23,0.10)', border: '1px solid rgba(238,107,23,0.25)', color: '#EE6B17' }}
          >
            {errorMessage}
          </div>
        )}

        {/* Login button */}
        <a
          href="/api/strava/auth"
          className="flex items-center justify-center gap-3 w-full text-white font-bold py-3.5 px-6 rounded-2xl transition-colors text-base"
          style={{ background: '#EE6B17' }}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
          Connect with Strava
        </a>

        <p className="text-xs mt-4" style={{ color: '#736554' }}>
          Only your own Strava account can log in. No data is shared.
        </p>
      </div>
    </main>
  )
}
