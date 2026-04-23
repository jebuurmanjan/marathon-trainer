import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'

interface PageProps {
  searchParams: Promise<{ error?: string }>
}

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Strava access was denied. Please try again.',
  unauthorized: 'This app is private. Only the registered athlete can log in.',
  db_error: 'Database error. Please try again.',
  server_error: 'Something went wrong. Please try again.',
}

export default async function HomePage({ searchParams }: PageProps) {
  const session = await getSession()
  if (session) redirect('/plan')

  const { error } = await searchParams
  const errorMessage = error ? ERROR_MESSAGES[error] ?? 'An error occurred.' : null

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 text-center max-w-md w-full">
        {/* Icon */}
        <div className="text-6xl mb-6">⏱️</div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-white mb-2">Sub 3:30</h1>
        <p className="text-gray-400 text-lg mb-1">Marathon Trainer</p>
        <p className="text-gray-600 text-sm mb-10">
          November 1, 2026 · 27 weeks · Your plan, your data
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          {[
            { label: 'Best marathon', value: '3:35' },
            { label: 'Target', value: '3:30' },
            { label: 'Weeks to go', value: '27' },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
              <div className="text-white font-bold text-xl">{stat.value}</div>
              <div className="text-gray-500 text-xs mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="mb-6 bg-red-950/60 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm">
            {errorMessage}
          </div>
        )}

        {/* Login button */}
        <a
          href="/api/strava/auth"
          className="flex items-center justify-center gap-3 w-full bg-[#FC4C02] hover:bg-[#e04400] text-white font-bold py-3.5 px-6 rounded-xl transition-colors text-base"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
          Connect with Strava
        </a>

        <p className="text-gray-700 text-xs mt-4">
          Only your own Strava account can log in. No data is shared.
        </p>
      </div>
    </main>
  )
}
