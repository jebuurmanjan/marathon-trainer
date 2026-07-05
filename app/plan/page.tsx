'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import PlanTabs from '@/components/PlanTabs'
import WeekCard from '@/components/WeekCard'
import EditGoalModal from '@/components/EditGoalModal'
import UpcomingWeeksModal from '@/components/UpcomingWeeksModal'
import WorkoutSwapModal from '@/components/WorkoutSwapModal'
import { ActualRun, Week, PlannedRun, StrengthWorkout, StrengthOverride } from '@/types'
import { UserPlanConfig, PlanPaces, RACE_TYPE_LABELS, RACE_PACE_LABEL } from '@/lib/plan-generator'
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
  const [menuOpen,           setMenuOpen]           = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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

  // Close overflow menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [menuOpen])

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
        setSyncMessage(data.detail ? `Sync failed: ${data.detail}` : 'Sync failed. Try again.')
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

        {/* ── Page header: title + primary actions ─────────────────────────── */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1
            style={{ fontFamily:'Nohemi, Inter, sans-serif', fontWeight:600, letterSpacing:'-0.03em', color:'var(--text-primary)', fontSize:'1.375rem', lineHeight:1.2 }}
          >
            {config ? RACE_TYPE_LABELS[config.raceType ?? 'marathon'] + ' Plan' : 'Training Plan'}
          </h1>

          <div className="flex items-center gap-2 shrink-0">
            {/* Sync feedback message */}
            {syncMessage && (
              <span className="text-sm font-medium hidden sm:block" style={{ color: syncMessage.startsWith('✓') ? 'var(--accent-green)' : 'var(--color-error)' }}>
                {syncMessage}
              </span>
            )}

            {/* Primary CTA — Sync Strava */}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 text-white font-semibold px-3.5 py-2 rounded-lg text-sm transition-all disabled:opacity-50"
              style={{ background:'#FC5200' }}
            >
              <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 fill-none stroke-current stroke-2 ${syncing ? 'animate-spin' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span className="hidden sm:inline">{syncing ? 'Syncing…' : 'Sync Strava'}</span>
            </button>

            {/* Overflow menu — secondary actions */}
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
                style={{ background: menuOpen ? 'var(--surface-2)' : 'var(--surface)', border:'1px solid rgba(var(--tint),0.10)', color:'var(--text-secondary)' }}
                aria-label="More options"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-48 rounded-xl py-1 z-50"
                  style={{ background:'var(--surface)', border:'1px solid rgba(var(--tint),0.10)', boxShadow:'0 8px 24px rgba(0,0,0,0.14)' }}
                >
                  {plan.length > 0 && (
                    <button
                      onClick={() => { setUpcomingOpen(true); setMenuOpen(false) }}
                      className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-left text-sm font-medium hover:bg-[rgba(var(--tint),0.04)] transition-colors"
                      style={{ color:'var(--text-primary)' }}
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2 shrink-0" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      Upcoming weeks
                    </button>
                  )}
                  {config && (
                    <button
                      onClick={() => { setEditingGoal(true); setMenuOpen(false) }}
                      className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-left text-sm font-medium hover:bg-[rgba(var(--tint),0.04)] transition-colors"
                      style={{ color:'var(--text-primary)' }}
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2 shrink-0" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Edit goal
                    </button>
                  )}
                  <a
                    href="/api/ical"
                    download="marathon-training-plan.ics"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm font-medium hover:bg-[rgba(var(--tint),0.04)] transition-colors"
                    style={{ color:'var(--text-primary)' }}
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2 shrink-0" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Add to Calendar
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Slim stats strip ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-5 text-sm" style={{ color:'var(--text-secondary)' }}>
          {/* Race date + countdown */}
          {raceDateLabel !== '—' && (
            <>
              <span className="font-medium" style={{ color:'var(--text-primary)' }}>{raceDateLabel}</span>
              {daysToRace > 0 && (
                <span className="text-xs font-semibold" style={{ color:'var(--accent)' }}>{daysToRace}d</span>
              )}
              {daysToRace === 0 && <span style={{ color:'var(--accent)' }}>🏁</span>}
              <span style={{ color:'var(--border-mid)' }}>·</span>
            </>
          )}

          {/* Week + phase */}
          {currentWeek > 0 && (
            <>
              <span>
                <span className="font-medium" style={{ color:'var(--text-primary)' }}>W{currentWeek}</span>
                <span style={{ color:'var(--text-dim)' }}>/{plan.length}</span>
              </span>
              {currentPhase && (
                <span className="capitalize" style={{ color:'var(--text-secondary)' }}>{currentPhase}</span>
              )}
              <span style={{ color:'var(--border-mid)' }}>·</span>
            </>
          )}

          {/* Logged km */}
          <span>
            <span className="font-medium" style={{ color:'var(--text-primary)' }}>{formatDistanceExact(totalActualKm, u)}</span>
            {' '}of ~{formatDistance(totalPlannedKm, u)} logged
          </span>

          {/* Target pace */}
          {mpLabel && (
            <>
              <span style={{ color:'var(--border-mid)' }}>·</span>
              <span>
                <span className="font-medium" style={{ color:'var(--text-primary)' }}>
                  {config ? RACE_PACE_LABEL[config.raceType ?? 'marathon'] : 'MP'} {mpLabel}/km
                </span>
                {goalLabel && <span> · sub {goalLabel}</span>}
              </span>
            </>
          )}
        </div>

        <PlanTabs />

        {/* ── Filter tabs ──────────────────────────────────────────────────── */}
        <div
          className="flex gap-0.5 p-1 rounded-lg mb-4 w-fit"
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
