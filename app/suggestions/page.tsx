'use client'

import { useState, useEffect, useCallback } from 'react'
import Navigation from '@/components/Navigation'
import PlanTabs from '@/components/PlanTabs'
import SuggestionCard from '@/components/SuggestionCard'
import { Suggestion } from '@/types'
import { getCurrentWeekNumber } from '@/lib/training-plan'

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userName, setUserName] = useState('')

  const currentWeek = getCurrentWeekNumber()

  const fetchSuggestions = useCallback(async () => {
    try {
      const [sugRes, runsRes] = await Promise.all([
        fetch('/api/suggestions'),
        fetch('/api/runs'),
      ])
      if (sugRes.ok) {
        const data = await sugRes.json()
        setSuggestions(data.suggestions ?? [])
      }
      if (runsRes.ok) {
        const data = await runsRes.json()
        setUserName(data.userName ?? '')
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchSuggestions() }, [fetchSuggestions])

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/suggestions', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate')
      await fetchSuggestions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  const latestSuggestion = suggestions[0]
  const olderSuggestions = suggestions.slice(1)

  return (
    <div style={{ minHeight: '100vh', background: '#F5F3EC' }}>
      <Navigation userName={userName} />

      <main className="max-w-3xl mx-auto px-4 py-6">
        <PlanTabs />
        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1
              className="text-2xl"
              style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.03em', color: '#1E1611' }}
            >
              AI Coaching
            </h1>
            <p className="text-sm mt-1" style={{ color: '#4A5427' }}>
              Claude analyses your training data and suggests adjustments.
              {currentWeek > 0 && ` Week ${currentWeek} of 27.`}
            </p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || currentWeek < 1 || currentWeek > 27}
            className="flex items-center gap-2 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 shrink-0"
            style={{ background: '#EE6B17' }}
          >
            {generating ? (
              <><span className="animate-spin">⟳</span> Thinking…</>
            ) : (
              <>✦ Get coaching advice</>
            )}
          </button>
        </div>

        {error && (
          <div
            className="mb-4 rounded-xl px-4 py-3 text-sm"
            style={{ background: 'rgba(238,107,23,0.10)', border: '1px solid rgba(238,107,23,0.25)', color: '#EE6B17' }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-sm" style={{ color: '#736554' }}>Loading…</div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🤖</div>
            <p className="font-semibold mb-2" style={{ color: '#1E1611' }}>No coaching advice yet</p>
            <p className="text-sm max-w-sm mx-auto mb-6" style={{ color: '#736554' }}>
              Click the button above to get your first AI coaching suggestion. Sync your Strava runs first for the most accurate advice.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {latestSuggestion && <SuggestionCard suggestion={latestSuggestion} isLatest />}
            {olderSuggestions.length > 0 && (
              <>
                <h2 className="text-xs font-semibold uppercase tracking-wider pt-2" style={{ color: '#736554' }}>
                  Previous advice
                </h2>
                {olderSuggestions.map((s) => (
                  <SuggestionCard key={s.id} suggestion={s} />
                ))}
              </>
            )}
          </div>
        )}

        {/* How it works */}
        <div
          className="mt-10 rounded-2xl p-5"
          style={{ background: '#EDE9DE', border: '1px solid rgba(43,49,23,0.08)' }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#1E1611' }}>How it works</h3>
          <ul className="text-sm space-y-1.5" style={{ color: '#736554' }}>
            <li>• Claude looks at your planned runs for the last 2 weeks</li>
            <li>• It compares them against what you actually ran (distance, pace, HR)</li>
            <li>• It suggests 1–2 concrete adjustments for the coming week</li>
            <li>• Sync Strava first for the most accurate advice</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
