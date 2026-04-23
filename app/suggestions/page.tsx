'use client'

import { useState, useEffect, useCallback } from 'react'
import Navigation from '@/components/Navigation'
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
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

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
    <div className="min-h-screen bg-gray-950">
      <Navigation userName={userName} />

      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">AI Coach</h1>
            <p className="text-gray-500 text-sm mt-1">
              Claude analyses your training data and suggests adjustments.
              {currentWeek > 0 && ` Currently on week ${currentWeek}.`}
            </p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || currentWeek < 1 || currentWeek > 26}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors shrink-0"
          >
            {generating ? (
              <>
                <span className="animate-spin">⟳</span>
                Thinking…
              </>
            ) : (
              <>
                ✦ Get coaching advice
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-950/60 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-600 text-sm">Loading…</div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🤖</div>
            <p className="text-gray-400 font-medium mb-2">No coaching advice yet</p>
            <p className="text-gray-600 text-sm max-w-sm mx-auto mb-6">
              Click the button above to get your first AI coaching suggestion based on your
              training data. Make sure you have synced your Strava runs first.
            </p>
            <p className="text-gray-700 text-xs">
              Powered by Claude — advice is generated based on your planned vs actual runs,
              pace data, and heart rate trends.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {latestSuggestion && (
              <SuggestionCard suggestion={latestSuggestion} isLatest />
            )}

            {olderSuggestions.length > 0 && (
              <>
                <h2 className="text-gray-500 text-sm font-medium pt-2">Previous advice</h2>
                {olderSuggestions.map((s) => (
                  <SuggestionCard key={s.id} suggestion={s} />
                ))}
              </>
            )}
          </div>
        )}

        {/* How it works */}
        <div className="mt-10 bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <h3 className="text-gray-300 font-semibold text-sm mb-3">How it works</h3>
          <ul className="text-gray-500 text-sm space-y-1.5">
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
