'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import PlanTabs from '@/components/PlanTabs'
import WeekCard from '@/components/WeekCard'
import { ActualRun, Week } from '@/types'
import { UserPlanConfig, PlanPaces } from '@/lib/plan-generator'

type Filter = 'upcoming' | 'all' | 'past'

export default function PlanPage() {
  const router = useRouter()

  // Plan data (from API)
  const [plan,         setPlan]        = useState<Week[]>([])
  const [config,       setConfig]      = useState<UserPlanConfig | null>(null)
  const [paces,        setPaces]       = useState<PlanPaces | null>(null)
  const [currentWeek,  setCurrentWeek] = useState(0)
  const [goalLabel,    setGoalLabel]   = useState('')
  const [mpLabel,      setMpLabel]     = useState('')

  // Run data + UI
  const [actualRuns,   setActualRuns]  = useState<ActualRun[]>([])
  const [syncing,      setSyncing]     = useState(false)
  const [syncMessage,  setSyncMessage] = useState<string | null>(null)
  const [filter,       setFilter]      = useState<Filter>('upcoming')
  const [userName,     setUserName]    = useState('')
  const [loading,      setLoading]     = useState(true)

  // ── Fetch plan + runs ────────────────────────────────────────────────────

  const fetchPlan = useCallback(async () => {
    const res = await fetch('/api/user-plan')
    if (res.status === 404) { router.replace('/onboarding'); return }
    if (!res.ok) return
    const d = await res.json()
    setPlan(d.plan ?? [])
    setConfig(d.config)
    setPaces(d.paces)
    setCurrentWeek(d.currentWeek ?? 0)
    setGoalLabel(d.goalLabel ?? '')
    setMpLabel(d.mpLabel ?? '')
  }, [router])

  const fetchRuns = useCallback(async () => {
    const res = await fetch('/api/runs')
    if (!res.ok) return
    const d = await res.json()
    if (d.needsOnboarding) { router.replace('/onboarding'); return }
    setActualRuns(d.runs ?? [])
    setUserName(d.userName ?? '')
  }, [router])

  useEffect(() => {
    Promise.all([fetchPlan(), fetchRuns()]).finally(() => setLoading(false))
  }, [fetchPlan, fetchRuns])

  // Scroll to current week once plan loads
  useEffect(() => {
    if (currentWeek > 0) {
      const el = document.getElementById(`week-${currentWeek}`)
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300)
    }
  }, [currentWeek, loading])

  // ── Sync ─────────────────────────────────────────────────────────────────

  async function handleSync() {
    setSyncing(true)
    setSyncMessage(null)
    try {
      const res  = await fetch('/api/strava/sync', { method: 'POST' })
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

  // ── Derived values ────────────────────────────────────────────────────────

  const visibleWeeks = plan.filter((week) => {
    if (filter === 'all')  return true
    if (filter === 'past') return week.weekNumber < currentWeek
    return week.weekNumber >= currentWeek
  })

  const raceDate      = config?.raceDate ?? ''
  const daysToRace    = raceDate
    ? Math.max(0, Math.ceil((new Date(raceDate + 'T12:00:00Z').getTime() - Date.now()) / 86_400_000))
    : 0
  const raceDateLabel = raceDate
    ? new Date(raceDate + 'T12:00:00Z').toLocaleDateString('en-GB', { day:'numeric', month:'long' })
    : '—'

  const totalActualKm  = actualRuns.reduce((s, r) => s + r.distanceKm, 0)
  const totalPlannedKm = plan
    .filter((w) => w.weekNumber < currentWeek)
    .reduce((s, w) => s + w.targetKm, 0)

  const currentPhase = currentWeek > 0 && currentWeek <= 27
    ? plan[currentWeek - 1]?.phase ?? ''
    : ''

  const stats = [
    {
      label: 'Days to race',
      value: daysToRace > 0 ? String(daysToRace) : '🏁',
      sub:   raceDateLabel,
      accent: true,
    },
    {
      label: 'Current week',
      value: currentWeek > 0 && currentWeek <= 27 ? `${currentWeek}/27` : '—',
      sub:   currentPhase ? currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1) : '',
      accent: false,
    },
    {
      label: 'Km logged',
      value: String(Math.round(totalActualKm)),
      sub:   `of ~${totalPlannedKm} km planned`,
      accent: false,
    },
    {
      label: 'Target pace',
      value: mpLabel || '—',
      sub:   goalLabel ? `Sub ${goalLabel} goal` : 'marathon',
      accent: false,
    },
  ]

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', background:'#F5F3EC' }}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-sm" style={{ color:'#736554' }}>Loading your plan…</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F3EC' }}>
      <Navigation userName={userName} />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Page title */}
        <div className="mb-5">
          <h1
            className="text-2xl"
            style={{ fontFamily:'Nohemi, Inter, sans-serif', fontWeight:600, letterSpacing:'-0.03em', color:'#1E1611' }}
          >
            Marathon Plan
          </h1>
          <p className="text-sm mt-1" style={{ color:'#4A5427' }}>
            27 weeks · {goalLabel ? `sub ${goalLabel} goal` : 'your goal'}
          </p>
        </div>

        <PlanTabs />

        {/* Hero stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl p-4 relative overflow-hidden"
              style={{
                background: '#EDE9DE',
                border: stat.accent ? '1px solid rgba(238,107,23,0.30)' : '1px solid rgba(43,49,23,0.08)',
              }}
            >
              {stat.accent && (
                <div
                  className="absolute top-0 right-0 w-20 h-20 pointer-events-none"
                  style={{ background:'radial-gradient(circle at top right, rgba(238,107,23,0.06) 0%, transparent 70%)' }}
                />
              )}
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color:'#4A5427' }}>
                {stat.label}
              </div>
              <div
                className="text-3xl leading-none mb-1"
                style={{ fontFamily:'Nohemi, Inter, sans-serif', fontWeight:600, letterSpacing:'-0.04em', color: stat.accent ? '#EE6B17' : '#1E1611' }}
              >
                {stat.value}
              </div>
              <div className="text-[11px]" style={{ color:'#736554' }}>{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div
            className="flex gap-0.5 p-1 rounded-xl"
            style={{ background:'#EDE9DE', border:'1px solid rgba(43,49,23,0.08)' }}
          >
            {(['upcoming','all','past'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3.5 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors"
                style={
                  filter === f
                    ? { background:'#E3D2B4', color:'#1E1611', boxShadow:'0 1px 3px rgba(43,49,23,0.10)' }
                    : { color:'#4A5427', background:'transparent' }
                }
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {syncMessage && (
              <span className="text-sm font-medium" style={{ color: syncMessage.startsWith('✓') ? '#4A5427' : '#EE6B17' }}>
                {syncMessage}
              </span>
            )}
            <a
              href="/api/ical"
              download="marathon-training-plan.ics"
              className="flex items-center gap-2 font-semibold px-4 py-2 rounded-xl text-sm transition-all border"
              style={{ color:'#4A5427', background:'#EDE9DE', borderColor:'rgba(43,49,23,0.14)' }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Add to Calendar
            </a>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-50"
              style={{ background:'#EE6B17' }}
            >
              <svg viewBox="0 0 24 24" className={`w-4 h-4 fill-none stroke-current stroke-2 ${syncing ? 'animate-spin' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              {syncing ? 'Syncing…' : 'Sync Strava'}
            </button>
          </div>
        </div>

        {/* Current week banner */}
        {currentWeek > 0 && currentWeek <= 27 && filter !== 'past' && currentPhase && (
          <div
            className="flex items-center gap-2.5 rounded-xl px-4 py-3 mb-4 text-sm font-medium"
            style={{ background:'rgba(238,107,23,0.10)', border:'1px solid rgba(238,107,23,0.25)', color:'#EE6B17' }}
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            Week {currentWeek} — {currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1)} phase. Stay consistent and keep easy runs genuinely easy.
          </div>
        )}

        {/* Week cards */}
        <div className="space-y-2">
          {visibleWeeks.map((week) => {
            const weekActual = actualRuns.filter(
              (r) => r.runDate >= week.startDate && r.runDate <= week.endDate
            )
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
          <div className="text-center py-20 text-sm" style={{ color:'#736554' }}>No weeks to show.</div>
        )}
      </main>
    </div>
  )
}
