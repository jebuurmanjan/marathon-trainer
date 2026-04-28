'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import PlanTabs from '@/components/PlanTabs'
import { StrengthWorkout, WorkoutCategory, WorkoutEquipment } from '@/types'

const CATEGORY_LABELS: Record<WorkoutCategory, string> = {
  core_stability: 'Core & Stability',
  legs:           'Legs',
  plyometrics:    'Plyometrics',
  upper_body:     'Upper Body',
}

function WorkoutCard({ workout }: { workout: StrengthWorkout }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col"
      style={{
        background: 'var(--surface)',
        border: '1px solid rgba(var(--tint),0.08)',
      }}
    >
      {/* Card header */}
      <div className="px-5 pt-5 pb-4">
        <h3
          className="text-base font-semibold mb-2"
          style={{ fontFamily: 'Nohemi, Inter, sans-serif', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}
        >
          {workout.name}
        </h3>

        {/* Pills row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
            style={
              workout.equipment === 'gym'
                ? { background: 'rgba(136,121,225,0.12)', color: 'var(--accent-violet)' }
                : { background: 'rgba(74,222,128,0.12)', color: '#16a34a' }
            }
          >
            {workout.equipment === 'gym' ? '🏋️ Gym' : '🏠 Home'}
          </span>
          <span
            className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(var(--tint),0.08)', color: 'var(--text-secondary)' }}
          >
            {CATEGORY_LABELS[workout.category]}
          </span>
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full ml-auto"
            style={{ background: 'rgba(238,107,23,0.08)', color: 'var(--accent)' }}
          >
            {workout.duration_minutes} min
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'rgba(var(--tint),0.06)', margin: '0 20px' }} />

      {/* Exercise list */}
      <div className="px-5 py-4 flex-1">
        <ul className="space-y-1.5">
          {(expanded ? workout.exercises : workout.exercises.slice(0, 3)).map((ex, i) => (
            <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-dim)' }}>
              <span className="shrink-0 mt-0.5" style={{ color: 'var(--accent-violet)' }}>·</span>
              <span>{ex}</span>
            </li>
          ))}
        </ul>

        {workout.exercises.length > 3 && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="mt-3 text-xs font-medium flex items-center gap-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            {expanded
              ? <>Show less ▲</>
              : <>+{workout.exercises.length - 3} more exercises ▼</>
            }
          </button>
        )}
      </div>
    </div>
  )
}

export default function WorkoutsPage() {
  const router = useRouter()
  const [workouts,         setWorkouts]        = useState<StrengthWorkout[]>([])
  const [loading,          setLoading]         = useState(true)
  const [userName,         setUserName]        = useState('')
  const [profilePhotoUrl,  setProfilePhotoUrl] = useState<string | null>(null)

  // Filters
  const [equipmentFilter, setEquipmentFilter] = useState<WorkoutEquipment | 'all'>('all')
  const [categoryFilter,  setCategoryFilter]  = useState<WorkoutCategory  | 'all'>('all')

  useEffect(() => {
    async function load() {
      // Load user info + workouts in parallel
      const [userRes, workoutsRes] = await Promise.all([
        fetch('/api/user-plan'),
        fetch('/api/workouts'),
      ])
      if (userRes.status === 404) { router.replace('/onboarding'); return }
      if (userRes.ok) {
        const d = await userRes.json()
        setUserName(d.userName ?? '')
        setProfilePhotoUrl(d.profilePhotoUrl ?? null)
      }
      if (workoutsRes.ok) {
        const d = await workoutsRes.json()
        setWorkouts(d.workouts ?? [])
      }
      setLoading(false)
    }
    load()
  }, [router])

  const visible = workouts.filter((w) =>
    (equipmentFilter === 'all' || w.equipment === equipmentFilter) &&
    (categoryFilter  === 'all' || w.category  === categoryFilter)
  )

  const filterChipStyle = (active: boolean): React.CSSProperties => active
    ? { background: 'var(--accent)', color: '#fff' }
    : { background: 'var(--surface)', border: '1px solid rgba(var(--tint),0.10)', color: 'var(--text-secondary)' }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Navigation userName={userName} profilePhotoUrl={profilePhotoUrl} />

      <main className="max-w-3xl mx-auto px-4 pt-6 pb-24">
        <PlanTabs />

        <div className="mb-6">
          <h1
            className="text-2xl font-semibold mb-1"
            style={{ fontFamily: 'Nohemi, Inter, sans-serif', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}
          >
            Workout Library
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Runner-specific strength sessions. Swap any session in your plan using the Edit button.
          </p>
        </div>

        {/* Filter bar */}
        <div
          className="flex flex-wrap gap-2 mb-6 p-3 rounded-xl"
          style={{ background: 'var(--surface)', border: '1px solid rgba(var(--tint),0.08)' }}
        >
          {/* Equipment filters */}
          <div className="flex gap-1.5">
            {(['all', 'home', 'gym'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setEquipmentFilter(v)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                style={filterChipStyle(equipmentFilter === v)}
              >
                {v === 'all' ? 'All' : v === 'home' ? '🏠 Home' : '🏋️ Gym'}
              </button>
            ))}
          </div>

          <div className="w-px self-stretch" style={{ background: 'rgba(var(--tint),0.10)' }} />

          {/* Category filters */}
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'core_stability', 'legs', 'plyometrics', 'upper_body'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setCategoryFilter(v)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                style={filterChipStyle(categoryFilter === v)}
              >
                {v === 'all' ? 'All categories' : CATEGORY_LABELS[v as WorkoutCategory]}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-xs mb-4" style={{ color: 'var(--text-dim)' }}>
            {visible.length} workout{visible.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="rounded-xl h-48 animate-pulse"
                style={{ background: 'var(--surface)' }}
              />
            ))}
          </div>
        )}

        {/* Workout grid */}
        {!loading && visible.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((w) => (
              <WorkoutCard key={w.id} workout={w} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && visible.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🏋️</p>
            <p className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              No workouts match
            </p>
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
              Try adjusting the filters above.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
