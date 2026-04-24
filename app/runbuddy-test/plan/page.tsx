'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import WeekCard from '@/components/WeekCard'
import { generatePlan, calcPaces, getWeekNumber, formatGoalTime, UserPlanConfig } from '@/lib/plan-generator'
import { formatPaceDisplay } from '@/lib/training-plan'
import { Week } from '@/types'

type Filter = 'upcoming' | 'all' | 'past'

export default function RunBuddyTestPlanPage() {
  const router = useRouter()

  const [plan,        setPlan]        = useState<Week[]>([])
  const [config,      setConfig]      = useState<UserPlanConfig | null>(null)
  const [currentWeek, setCurrentWeek] = useState(0)
  const [filter,      setFilter]      = useState<Filter>('upcoming')
  const [ready,       setReady]       = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('runbuddy-test-config')
    if (!raw) { router.replace('/runbuddy-test'); return }

    const cfg: UserPlanConfig = JSON.parse(raw)
    const generated = generatePlan(cfg)
    const week = getWeekNumber(generated[0].startDate, cfg.raceDate)

    setConfig(cfg)
    setPlan(generated)
    setCurrentWeek(week)
    setReady(true)

    // Scroll to current week
    if (week > 0) {
      setTimeout(() => {
        document.getElementById(`week-${week}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
    }
  }, [router])

  if (!ready || !config) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F3EC' }} className="flex items-center justify-center">
        <div className="text-sm" style={{ color: '#736554' }}>Building your plan…</div>
      </div>
    )
  }

  const paces         = calcPaces(config.goalSeconds)
  const goalLabel     = formatGoalTime(config.goalSeconds)
  const mpLabel       = formatPaceDisplay(paces.mp)
  const raceDate      = config.raceDate
  const daysToRace    = Math.max(0, Math.ceil((new Date(raceDate + 'T12:00:00Z').getTime() - Date.now()) / 86_400_000))
  const raceDateLabel = new Date(raceDate + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
  const currentPhase  = currentWeek > 0 && currentWeek <= plan.length ? plan[currentWeek - 1]?.phase ?? '' : ''

  const visibleWeeks = plan.filter((week) => {
    if (filter === 'all')  return true
    if (filter === 'past') return week.weekNumber < currentWeek
    return week.weekNumber >= currentWeek
  })

  const stats = [
    { label: 'Days to race',  value: daysToRace > 0 ? String(daysToRace) : '🏁', sub: raceDateLabel,                     accent: true },
    { label: 'Current week',  value: currentWeek > 0 ? `${currentWeek}/27` : '—', sub: currentPhase ? currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1) : '', accent: false },
    { label: 'Weekly volume', value: `${config.weeklyKm} km`,                     sub: 'starting point',                  accent: false },
    { label: 'Target pace',   value: mpLabel,                                      sub: `Sub ${goalLabel} goal`,           accent: false },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F5F3EC' }}>
      {/* Test banner */}
      <div
        className="sticky top-0 z-50 flex items-center justify-between px-4 py-2.5 text-xs font-semibold"
        style={{ background: 'rgba(238,107,23,0.12)', borderBottom: '1px solid rgba(238,107,23,0.20)', color: '#EE6B17' }}
      >
        <span>⚠ Test preview — this plan is not saved</span>
        <div className="flex gap-3">
          <button
            onClick={() => {
              sessionStorage.removeItem('runbuddy-test-config')
              router.push('/runbuddy-test')
            }}
            className="underline"
          >
            Start over
          </button>
          <a href="/plan" className="underline">
            Go to my real plan →
          </a>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Page title */}
        <div className="mb-5">
          <h1
            className="text-2xl"
            style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.03em', color: '#1E1611' }}
          >
            Marathon Plan
          </h1>
          <p className="text-sm mt-1" style={{ color: '#4A5427' }}>
            27 weeks · sub {goalLabel} goal · {config.runsPerWeek} runs/week
            {config.strengthDays > 0 && ` · ${config.strengthDays}× strength`}
          </p>
        </div>

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
                  style={{ background: 'radial-gradient(circle at top right, rgba(238,107,23,0.06) 0%, transparent 70%)' }}
                />
              )}
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#4A5427' }}>
                {stat.label}
              </div>
              <div
                className="text-3xl leading-none mb-1"
                style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.04em', color: stat.accent ? '#EE6B17' : '#1E1611' }}
              >
                {stat.value}
              </div>
              <div className="text-[11px]" style={{ color: '#736554' }}>{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center justify-between mb-4">
          <div
            className="flex gap-0.5 p-1 rounded-xl"
            style={{ background: '#EDE9DE', border: '1px solid rgba(43,49,23,0.08)' }}
          >
            {(['upcoming', 'all', 'past'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3.5 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors"
                style={
                  filter === f
                    ? { background: '#E3D2B4', color: '#1E1611', boxShadow: '0 1px 3px rgba(43,49,23,0.10)' }
                    : { color: '#4A5427', background: 'transparent' }
                }
              >
                {f}
              </button>
            ))}
          </div>

          {/* No sync button in test mode — just a label */}
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
            style={{ background: '#EDE9DE', border: '1px solid rgba(43,49,23,0.08)', color: '#A09880' }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2 opacity-40">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Strava sync (preview)
          </div>
        </div>

        {/* Current week banner */}
        {currentWeek > 0 && currentPhase && filter !== 'past' && (
          <div
            className="flex items-center gap-2.5 rounded-xl px-4 py-3 mb-4 text-sm font-medium"
            style={{ background: 'rgba(238,107,23,0.10)', border: '1px solid rgba(238,107,23,0.25)', color: '#EE6B17' }}
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
            Week {currentWeek} — {currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1)} phase. Stay consistent and keep easy runs genuinely easy.
          </div>
        )}

        {/* Week cards — no actual runs, no strength completions in test mode */}
        <div className="space-y-2">
          {visibleWeeks.map((week) => (
            <WeekCard
              key={week.weekNumber}
              week={week}
              actualRuns={[]}
              isCurrentWeek={week.weekNumber === currentWeek}
              isPastWeek={week.weekNumber < currentWeek}
              strengthCompletions={[]}
              planId=""
            />
          ))}
        </div>

        {visibleWeeks.length === 0 && (
          <div className="text-center py-20 text-sm" style={{ color: '#736554' }}>No weeks to show.</div>
        )}
      </main>
    </div>
  )
}
