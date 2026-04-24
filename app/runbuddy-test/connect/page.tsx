// Fake Strava OAuth screen — simulates the redirect-and-back handshake

export default function RunBuddyTestConnectPage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: '#F5F3EC' }}
    >
      <div className="w-full max-w-sm text-center">
        {/* Strava-ish logo area */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6"
          style={{ background: '#EDE9DE', border: '1px solid rgba(43,49,23,0.08)' }}
        >
          <svg viewBox="0 0 24 24" className="w-8 h-8" style={{ fill: '#EE6B17' }}>
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
        </div>

        <h2
          className="text-xl font-semibold mb-2"
          style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: '#1E1611' }}
        >
          Connecting to Strava…
        </h2>
        <p className="text-sm mb-2" style={{ color: '#736554' }}>
          In the real flow, you'd log in to Strava here and grant access to your activities.
        </p>
        <p className="text-xs mb-10" style={{ color: '#A09880' }}>
          (This is the test preview — no real auth happens)
        </p>

        {/* Card mimicking Strava permission screen */}
        <div
          className="rounded-2xl p-5 mb-8 text-left"
          style={{ background: '#EDE9DE', border: '1px solid rgba(43,49,23,0.08)' }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#A09880' }}>
            RunBuddy would like to access
          </p>
          <div className="space-y-2.5">
            {[
              { icon: '✓', text: 'View your public activities' },
              { icon: '✓', text: 'View your complete Strava profile' },
              { icon: '✗', text: 'Post or modify activities' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2.5 text-sm" style={{ color: '#4A5427' }}>
                <span
                  className="font-bold shrink-0 text-xs"
                  style={{ color: icon === '✓' ? '#4A5427' : '#A09880' }}
                >
                  {icon}
                </span>
                <span style={{ color: icon === '✓' ? '#1E1611' : '#A09880' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Continue button — the real "Authorise" button */}
        <a
          href="/runbuddy-test/onboarding"
          className="flex items-center justify-center w-full text-white font-bold py-3.5 px-6 rounded-2xl transition-opacity hover:opacity-90 text-base"
          style={{ background: '#EE6B17' }}
        >
          Authorise RunBuddy →
        </a>

        <a
          href="/runbuddy-test"
          className="block mt-4 text-sm"
          style={{ color: '#A09880' }}
        >
          ← Back
        </a>
      </div>
    </main>
  )
}
