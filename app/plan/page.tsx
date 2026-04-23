'use client'

import { useState, useEffect, useCallback } from 'react'
import Navigation from '@/components/Navigation'
import WeekCard from '@/components/WeekCard'
import { trainingPlan, getCurrentWeekNumber, PLAN_START_DATE, RACE_DATE } from '@/lib/training-plan'
import { ActualRun } from '@/types'

type Filter = 'upcoming' | 'all' | 'past'

export default function PlanPage() {
  const [actualRuns, setActualRuns] = useState<ActualRun[]>([])
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('upcoming')
  const [userName, setUserName] = useState('')

  const currentWeek = getCurrentWeekNumber()

  // Fetch actual runs from the DB via a simple API route
  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch('/api/runs')
      if (res.ok) {
        const data = await res.json()
        setActualRuns(data.runs ?? [])
        setUserName(data.userName ?? '')
      }
    } catch {
      // silently fail — plan still shows
    }
  }, [])

  useEffect(() => {
    fetchRuns()
  }, [fetchRuns])

  // Jump to current week on mount
  useEffect(() => {
    if (currentWeek > 0) {
      const el = document.getElementById(`week-${currentWeek}`)
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300)
    }
  }, [currentWeek])

  async function handleSync() {
    setSyncing(true)
    setSyncMessage(null)
    try {
      const res = await fetch('/api/strava/sync', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setSyncMessage(`✓ Synced ${data.synced} run${data.synced !== 1 ? 's' : ''} from Strava`)
        await fetchRuns()
      } else {
        setSyncMessage('Sync failed. Try again.')
      }
    } catch {
      setSyncMessage('Sync failed. Try again.')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMessage(null), 4000)
    }
  }

  // Filter weeks based on selection
  const visibleWeeks = trainingPlan.filter((week) => {
    if (filter === 'all') return true
    if (filter === 'past') return week.weekNumber < currentWeek
    // 'upcoming' = current week + future
    return week.weekNumber >= currentWeek
  })

  // Days until race
  const today = new Date()
  const raceDay = new Date(RACE_DATE)
  const daysToRace = Math.max(0, Math.ceil((raceDay.getTime() - today.getTime()) / 86400000))

  const totalActualKm = actualRuns.reduce((sum, r) => sum + r.distanceKm, 0)
  const totalPlannedKm = trainingPlan
    .filter((w) => w.weekNumber < currentWeek)
    .reduce((sum, w) => sum + w.targetKm, 0)

  return (
    <div className="min-h-screen bg-gray-950">
      <Navigation userName={userName} />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Hero stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            {
              label: 'Days to race',
              value: daysToRace > 0 ? daysToRace : '🏁',
              sub: new Date(RACE_DATE + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }),
            },
            {
              label: 'Current week',
              value: currentWeek > 0 && currentWeek <= 26 ? `${currentWeek}/26` : '—',
              sub: currentWeek > 0 ? trainingPlan[currentWeek - 1]?.phase.toUpperCase() : '',
            },
            {
              label: 'Km logged',
              value: `${Math.round(totalActualKm)}`,
              sub: `of ~${totalPlannedKm} km planned`,
            },
            {
              label: 'Target pace',
              value: '4:58/km',
              sub: 'sub 3:30 marathon',
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-gray-400 text-xs font-medium mt-0.5">{stat.label}</div>
              <div className="text-gray-600 text-xs mt-0.5">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
            {(['upcoming', 'all', 'past'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                  filter === f
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {syncMessage && (
              <span className={`text-sm ${syncMessage.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
                {syncMessage}
              </span>
            )}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              <svg viewBox="0 0 24 24" className={`w-4 h-4 fill-none stroke-current stroke-2 ${syncing ? 'animate-spin' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              {syncing ? 'Syncing…' : 'Sync Strava'}
            </button>
          </div>
        </div>

        {/* Week cards */}
        <div className="space-y-4">
          {visibleWeeks.map((week) => {
            // Get actual runs for this week's date range
            const weekActual = actualRuns.filter((r) => {
              return r.runDate >= week.startDate && r.runDate <= week.endDate
            })
            return (
              <WeekCard
                key={week.weekNumber}
                week={week}
                actualRuns={weekActual}
                isCurrentWeek={week.weekNumber === currentWeek}
                isPastWeek={week.weekNumber < currentWeek}
              />
            )
          })}
        </div>

        {visibleWeeks.length === 0 && (
          <div className="text-center py-20 text-gray-600">
            No weeks to show.
          </div>
        )}
      </main>
    </div>
  )
}
