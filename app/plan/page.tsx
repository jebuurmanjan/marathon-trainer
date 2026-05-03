'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import PlanTabs from '@/components/PlanTabs'
import WeekCard from '@/components/WeekCard'
import EditGoalModal from '@/components/EditGoalModal'
import UpcomingWeeksModal from '@/components/UpcomingWeeksModal'
import WorkoutSwapModal from '@/components/WorkoutSwapModal'
import { ActualRun, Week, PlannedRun, StrengthWorkout, StrengthOverride } from '@/types'
import { UserPlanConfig, PlanPaces } from '@/lib/plan-generator'
import { formatDistance, formatDistanceExact, applyOverrides, applyStrengthOverrides, applyDefaultWorkouts, RunOverride } from '@/lib/training-plan'

type Filter = 'upcoming' | 'all' | 'past'

export default function PlanPage() {
  const router = useRouter()

  // Plan data (from API)
  const [plan,                  setPlan]                  = useState<Week[]>([])
  const [config,                setConfig]                = useState<UserPlanConfig | null>(null)
  const [paces,                 setPaces]                 = useState<PlanPaces | null>(null)
  const [currentWeek,           setCurrentWeek]           = useState(0)
  const [goalLabel,             setGoalLabel]             = useState('')
  const [mpLabel,               setMpLabel]               = useState('')
  const [planId,                setPlanId]                = useState('')
  const [strengthCompletions,   setStrengthCompletions]   = useState<string[]>([])

  // Run data + UI
  const [actualRuns,   setActualRuns]  = useState<ActualRun[]>([])
  const [syncing,      setSyncing]     = useState(false)
  const [syncMessage,  setSyncMessage] = useState<string | null>(null)
  const [filter,       setFilter]      = useState<Filter>('upcoming')
  const [userName,     setUserName]    = useState('')
  const [loading,          setLoading]         = useState(true)
  const [editingGoal,      setEditingGoal]     = useState(false)
  const [upcomingOpen,     setUpcomingOpen]    = useState(false)
  const [profilePhotoUrl,  setProfilePhotoUrl] = useState<string | null>(null)
  const [preferredUnits,   setPreferredUnits]  = useState<'km' | 'miles'>('km')
  const [overrides,          setOverrides]          = useState<RunOverride[]>([])
  const [strengthOverrides,  setStrengthOverrides]  = useState<StrengthOverride[]>([])
  const [workouts,           setWorkouts]           = useState<StrengthWorkout[]>([])
  const [swappingRun,        setSwappingRun]        = useState<PlannedRun | null>(null)

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
    setUserName(d.userName ?? '')
    setProfilePhotoUrl(d.profilePhotoUrl ?? null)
    setPreferredUnits(d.preferredUnits ?? 'km')
    const id: string = d.planId ?? ''
    setPlanId(id)
    // Await all secondary fetches so state is set before the plan renders.
    // Previously these were fire-and-forget, causing StrengthRow to mount
    // with isCompleted=false before completions arrived (useState never reinitialises).
    if (id) {
      const [strengthData, overridesData, strengthOverridesData, workoutsData] = await Promise.all([
        fetch(`/api/strength?planId=${id}`)
          .then((r) => r.ok ? r.json() : { completions: [] })
          .catch(() => ({ completions: [] })),
        fetch(`/api/plan-overrides?planId=${id}`)
          .then((r) => r.ok ? r.json() : { overrides: [] })
          .catch(() => ({ overrides: [] })),
        fetch(`/api/plan-strength-overrides?planId=${id}`)
          .then((r) => r.ok ? r.json() : { overrides: [] })
          .catch(() => ({ overrides: [] })),
        fetch('/api/workouts')
          .then((r) => r.ok ? r.json() : { workouts: [] })
          .catch(() => ({ workouts: [] })),
      ])
      setStrengthCompletions(strengthData.completions ?? [])
      setOverrides(overridesData.overrides ?? [])
      setStrengthOverrides(strengthOverridesData.overrides ?? [])
      setWorkouts(workoutsData.workouts ?? [])
    }
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

  // 1. Fill un-swapped sessions with matching library workout (by category + equipment)
  // 2. Apply explicit user swaps on top
  // 3. Apply date-move overrides last
  const displayedPlan = applyOverrides(
    applyStrengthOverrides(
      applyDefaultWorkouts(plan, workouts, config?.equipmentType ?? 'bodyweight'),
      strengthOverrides,
    ),
    overrides,
  )

  const visibleWeeks = displayedPlan.filter((week) => {
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
    .filter((w) => w.weekNumber <= currentWeek)
    .reduce((s, w) => s + w.targetKm, 0)
  const u = preferredUnits

  const currentPhase = currentWeek > 0 && currentWeek <= plan.length
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
      value: currentWeek > 0 && currentWeek <= plan.length ? `${currentWeek}/${plan.length}` : '—',
      sub:   currentPhase ? currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1) : '',
      accent: false,
    },
    {
      label: u === 'miles' ? 'Miles logged' : 'Km logged',
      value: formatDistanceExact(totalActualKm, u),
      sub:   `of ~${formatDistance(totalPlannedKm, u)} planned`,
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
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
        <div className="flex flex-col items-center justify-center h-screen gap-4">
          <svg
            viewBox="0 0 128 64"
            width="32"
            height="16"
            style={{ color: 'var(--accent)' }}
            aria-label="Loading"
          >
            <style>{`
              @keyframes heartpulse {
                0%   { stroke-dashoffset: 260; opacity: 1; }
                100% { stroke-dashoffset: 0;   opacity: .5; }
              }
            `}</style>
            <polyline
              points="0,45.486 38.514,45.486 44.595,33.324 50.676,45.486 57.771,45.486 62.838,55.622 71.959,9 80.067,63.729 84.122,45.486 97.297,45.486 103.379,40.419 110.473,45.486 150,45.486"
              fill="none" stroke="currentColor" strokeWidth="3"
              strokeLinecap="round" strokeLinejoin="round"
              opacity="0.12"
            />
            <polyline
              points="0,45.486 38.514,45.486 44.595,33.324 50.676,45.486 57.771,45.486 62.838,55.622 71.959,9 80.067,63.729 84.122,45.486 97.297,45.486 103.379,40.419 110.473,45.486 150,45.486"
              fill="none" stroke="currentColor" strokeWidth="3"
              strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="260" strokeDashoffset="260"
              style={{ animation: 'heartpulse 1.4s linear infinite' }}
            />
          </svg>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading your plan…</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Navigation userName={userName} profilePhotoUrl={profilePhotoUrl} />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Page title */}
        <div className="mb-5">
          <h1
            className="text-2xl"
            style={{ fontFamily:'Nohemi, Inter, sans-serif', fontWeight:600, letterSpacing:'-0.03em', color:'var(--text-primary)' }}
          >
            Marathon Plan
          </h1>
          <p className="text-sm mt-1" style={{ color:'var(--text-secondary)' }}>
            {plan.length} weeks · {goalLabel ? `sub ${goalLabel} goal` : 'your goal'} · {u}
          </p>
          {/* Action buttons — own row so they never crowd the title on mobile */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {plan.length > 0 && (
              <button
                onClick={() => setUpcomingOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{ background:'var(--surface)', border:'1px solid rgba(var(--tint),0.10)', color:'var(--text-secondary)' }}
              >
                Upcoming weeks →
              </button>
            )}
            {config && (
              <button
                onClick={() => setEditingGoal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{ background:'var(--surface)', border:'1px solid rgba(var(--tint),0.10)', color:'var(--text-secondary)' }}
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit goal
              </button>
            )}
          </div>
        </div>

        <PlanTabs />

        {/* Hero stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-4 relative overflow-hidden"
              style={{
                background: 'var(--surface)',
                border: stat.accent ? '1px solid rgba(var(--accent-rgb),0.30)' : '1px solid rgba(var(--tint),0.08)',
              }}
            >
              {stat.accent && (
                <div
                  className="absolute top-0 right-0 w-20 h-20 pointer-events-none"
                  style={{ background:'radial-gradient(circle at top right, rgba(var(--accent-rgb),0.06) 0%, transparent 70%)' }}
                />
              )}
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color:'var(--text-secondary)' }}>
                {stat.label}
              </div>
              <div
                className="text-3xl leading-none mb-1"
                style={{ fontFamily:'Nohemi, Inter, sans-serif', fontWeight:600, letterSpacing:'-0.04em', color: stat.accent ? 'var(--accent)' : 'var(--text-primary)' }}
              >
                {stat.value}
              </div>
              <div className="text-[11px]" style={{ color:'var(--text-secondary)' }}>{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div
            className="flex gap-0.5 p-1 rounded-lg"
            style={{ background:'var(--surface)', border:'1px solid rgba(var(--tint),0.08)' }}
          >
            {(['upcoming','all','past'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3.5 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors"
                style={
                  filter === f
                    ? { background:'var(--surface-3)', color:'var(--text-primary)', boxShadow:'0 1px 3px rgba(var(--tint),0.10)' }
                    : { color:'var(--text-secondary)', background:'transparent' }
                }
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {syncMessage && (
              <span className="text-sm font-medium" style={{ color: syncMessage.startsWith('✓') ? 'var(--text-secondary)' : 'var(--accent)' }}>
                {syncMessage}
              </span>
            )}
            <a
              href="/api/ical"
              download="marathon-training-plan.ics"
              className="flex items-center gap-2 font-semibold px-4 py-2 rounded-lg text-sm transition-all border"
              style={{ color:'var(--text-secondary)', background:'var(--surface)', borderColor:'rgba(var(--tint),0.14)' }}
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
              className="flex items-center gap-2 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50"
              style={{ background:'#FC5200' }}
            >
              <svg viewBox="0 0 24 24" className={`w-4 h-4 fill-none stroke-current stroke-2 ${syncing ? 'animate-spin' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              {syncing ? 'Syncing…' : 'Sync Strava'}
            </button>
          </div>
        </div>

        {/* Current week banner */}
        {currentWeek > 0 && currentWeek <= plan.length && filter !== 'past' && currentPhase && (
          <div
            className="flex items-center gap-2.5 rounded-lg px-4 py-3 mb-4 text-sm font-medium"
            style={{ background:'rgba(var(--accent-rgb),0.10)', border:'1px solid rgba(var(--accent-rgb),0.25)', color:'var(--accent)' }}
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
                strengthCompletions={strengthCompletions}
                planId={planId}
                units={preferredUnits}
                onStrengthSwapRequest={setSwappingRun}
              />
            )
          })}
        </div>

        {visibleWeeks.length === 0 && (
          <div className="text-center py-20 text-sm" style={{ color:'var(--text-dim)' }}>No weeks to show.</div>
        )}
      </main>

      {/* Edit goal modal */}
      {editingGoal && config && (
        <EditGoalModal
          planId={planId}
          currentConfig={config}
          onClose={() => setEditingGoal(false)}
          onSaved={async () => {
            setEditingGoal(false)
            setLoading(true)
            await fetchPlan()
            setLoading(false)
          }}
        />
      )}

      {/* Workout swap modal */}
      {swappingRun && (
        <WorkoutSwapModal
          run={swappingRun}
          planId={planId}
          workouts={workouts}
          currentOverride={strengthOverrides.find((o) => o.sessionDate === swappingRun.date)}
          onClose={() => setSwappingRun(null)}
          onSwapped={(override) => {
            setStrengthOverrides((prev) => [
              ...prev.filter((o) => o.sessionDate !== override.sessionDate),
              override,
            ])
            setSwappingRun(null)
          }}
          onReset={() => {
            setStrengthOverrides((prev) => prev.filter((o) => o.sessionDate !== swappingRun.date))
            setSwappingRun(null)
          }}
        />
      )}

      {/* Upcoming weeks modal */}
      {upcomingOpen && planId && (
        <UpcomingWeeksModal
          onClose={() => setUpcomingOpen(false)}
          planId={planId}
          weeks={plan.filter((w) => {
            const base = currentWeek > 0 ? currentWeek : 1
            return w.weekNumber === base || w.weekNumber === base + 1
          })}
          actualRuns={actualRuns}
          currentWeek={currentWeek}
          overrides={overrides}
          onOverridesChange={setOverrides}
        />
      )}
    </div>
  )
}
