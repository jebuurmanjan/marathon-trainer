import { Week, ActualRun, PlannedRun } from '@/types'
import RunRow from './RunRow'
import StrengthRow from './StrengthRow'
import { PHASE_LABELS, formatDistance, formatDistanceExact } from '@/lib/training-plan'
import { calcWeekScore, scoreColor, scoreLabel } from '@/lib/score'

const PHASE_BADGE: Record<string, { bg: string; color: string }> = {
  base:    { bg: 'rgba(var(--tint),0.10)', color: 'var(--text-secondary)' },
  build:   { bg: 'rgba(136,121,225,0.12)', color: 'var(--accent-violet)' },
  peak:    { bg: 'rgba(var(--accent-rgb),0.12)',  color: 'var(--accent)' },
  sharpen: { bg: 'rgba(var(--accent-rgb),0.12)',  color: 'var(--accent)' },
  taper:   { bg: 'rgba(47,148,97,0.10)',    color: 'var(--accent-green)' },
}

interface WeekCardProps {
  week:                      Week
  actualRuns:                ActualRun[]
  isCurrentWeek:             boolean
  isPastWeek:                boolean
  strengthCompletions?:      string[]
  planId?:                   string
  units?:                    'km' | 'miles'
  onStrengthSwapRequest?:    (run: PlannedRun) => void
}

/** Hairline divider with a day label centred between two rules */
function DayDivider({ date, runs }: { date: string; runs: PlannedRun[] }) {
  // Use dayOfWeek from the first planned run; fall back to deriving from the date
  // (needed when only unplanned/orphan actuals exist on this date)
  const dow = runs[0]?.dayOfWeek?.slice(0, 3).toUpperCase()
    ?? new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 3).toUpperCase()
  const d   = new Date(date + 'T00:00:00')
  const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return (
    <div className="flex items-center gap-2 px-1 my-0.5">
      <div className="flex-1 h-px" style={{ background: 'rgba(var(--tint),0.08)' }} />
      <span
        className="text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap"
        style={{ color: 'var(--text-dim)' }}
      >
        {dow} {dateStr}
      </span>
      <div className="flex-1 h-px" style={{ background: 'rgba(var(--tint),0.08)' }} />
    </div>
  )
}

export default function WeekCard({
  week, actualRuns, isCurrentWeek, isPastWeek,
  strengthCompletions = [], planId = '', units = 'km', onStrengthSwapRequest,
}: WeekCardProps) {
  const today = new Date().toISOString().slice(0, 10)

  const totalKmActual = actualRuns.reduce((sum, r) => sum + r.distanceKm, 0)
  const pct = Math.min(100, Math.round((totalKmActual / (week.targetKm || 1)) * 100))

  // Date range labels — shown in expanded body, not header
  const startLabel = new Date(week.startDate + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short',
  })
  const endLabel = new Date(week.endDate + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short',
  })

  const badge = PHASE_BADGE[week.phase] ?? { bg: 'rgba(var(--tint),0.08)', color: 'var(--text-dim)' }

  // Performance score — past + current weeks only
  const showScore = isCurrentWeek || isPastWeek
  const score     = showScore ? calcWeekScore(week, actualRuns, isCurrentWeek) : null

  // Group planned runs by date for day-separated rendering
  const runsByDate = week.runs.reduce<Record<string, PlannedRun[]>>((acc, run) => {
    ;(acc[run.date] ??= []).push(run)
    return acc
  }, {})
  const sortedDates = Object.keys(runsByDate).sort()

  // ── Match actuals to planned runs (one-to-one, ±1.5 day window) ──────────
  // We track used IDs so the same Strava activity can't satisfy two planned runs
  // and so we can identify orphan actuals (unplanned bonus runs).
  const usedActualIds = new Set<number>()
  const matchMap = new Map<string, ActualRun>() // key = run.date + run.type

  for (const date of sortedDates) {
    for (const run of runsByDate[date]) {
      if (run.type === 'strength') continue
      const plannedMs = new Date(run.date).getTime()
      const match = actualRuns.find((a) => {
        if (usedActualIds.has(a.id)) return false
        return Math.abs(new Date(a.runDate).getTime() - plannedMs) <= 86400000 * 1.5
      })
      if (match) {
        matchMap.set(run.date + run.type, match)
        usedActualIds.add(match.id)
      }
    }
  }

  // Orphans = Strava runs that didn't match any planned session
  const orphanActuals = actualRuns.filter((a) => !usedActualIds.has(a.id))
  const orphansByDate = orphanActuals.reduce<Record<string, ActualRun[]>>((acc, a) => {
    ;(acc[a.runDate] ??= []).push(a)
    return acc
  }, {})

  // Unified sorted date list (planned dates + orphan-only dates)
  const allDates = [...new Set([...sortedDates, ...Object.keys(orphansByDate)])].sort()

  return (
    <div
      id={`week-${week.weekNumber}`}
      className="rounded-xl transition-all"
      style={{
        background: 'var(--surface)',
        border: isCurrentWeek
          ? '1px solid rgba(var(--accent-rgb),0.30)'
          : '1px solid rgba(var(--tint),0.08)',
      }}
    >
      <details open={isCurrentWeek}>
        {/* ── Collapsed header ────────────────────────────────────────────── */}
        <summary className="list-none cursor-pointer select-none" style={{ outline: 'none' }}>
          <div className="flex items-center gap-3 px-4 py-3.5">

            {/* Week number */}
            <span
              className="text-xs font-bold min-w-[26px] tabular-nums"
              style={{
                fontFamily: 'Nohemi, Inter, sans-serif',
                color: isCurrentWeek ? 'var(--accent)' : 'var(--text-dim)',
              }}
            >
              W{week.weekNumber}
            </span>

            {/* Phase badge */}
            <span
              className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full whitespace-nowrap shrink-0"
              style={{ background: badge.bg, color: badge.color }}
            >
              {PHASE_LABELS[week.phase]}
              {week.isCutback ? ' · Cutback' : ''}
            </span>

            {/* Title — flex-1 so it takes all available space */}
            <div className="flex-1 min-w-0">
              <div
                className="text-sm font-semibold truncate"
                style={{
                  fontFamily: 'Nohemi, Inter, sans-serif',
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  color: 'var(--text-primary)',
                }}
              >
                {week.title ?? week.notes}
              </div>
            </div>

            {/* Right cluster: km · logged · score · chevron */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Target km + logged */}
              <div className="text-right">
                <div
                  className="text-base leading-none tabular-nums"
                  style={{
                    fontFamily: 'Nohemi, Inter, sans-serif',
                    fontWeight: 600,
                    letterSpacing: '-0.03em',
                    color: 'var(--text-primary)',
                  }}
                >
                  {formatDistance(week.targetKm, units)}
                </div>
                {(isCurrentWeek || isPastWeek) && (
                  <div className="text-[10px] mt-0.5 tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    {formatDistanceExact(totalKmActual, units)} logged
                  </div>
                )}
              </div>

              {/* Score — colored number only, breakdown lives in expanded body */}
              {score && score.total !== null && (
                <span
                  className="text-sm font-bold tabular-nums"
                  style={{ color: scoreColor(score.total), minWidth: '2.5rem', textAlign: 'right' }}
                >
                  {score.isPartial ? '~' : ''}{score.total}
                </span>
              )}
              {score && score.total === null && isPastWeek && (
                <span className="text-[11px]" style={{ color: 'var(--text-muted)', minWidth: '2.5rem', textAlign: 'right' }}>
                  —
                </span>
              )}

              {/* Chevron */}
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 [[open]_summary_&]:rotate-90"
                fill="none" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ color: 'var(--text-dim)' }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>

          {/* Progress bar — 3px, past + current weeks */}
          {(isCurrentWeek || isPastWeek) && (
            <div style={{ height: '3px', background: 'var(--surface-2)' }}>
              <div
                style={{
                  height: '3px',
                  width: `${pct}%`,
                  background: pct >= 90 ? 'var(--accent-green)' : 'var(--accent)',
                  borderRadius: '2px',
                  transition: 'width 0.4s',
                }}
              />
            </div>
          )}
        </summary>

        {/* ── Expanded body ────────────────────────────────────────────────── */}
        <div className="px-4 pb-4 pt-3 flex flex-col gap-1.5">

          {/* Date range */}
          <div className="text-[11px] mb-1" style={{ color: 'var(--text-dim)' }}>
            {startLabel} – {endLabel}
          </div>

          {/* Score breakdown — shown when we have data */}
          {score && score.total !== null && (
            <div
              className="rounded-lg px-3.5 py-3 mb-1"
              style={{ background: 'rgba(var(--tint),0.04)', border: '1px solid rgba(var(--tint),0.07)' }}
            >
              {/* Top row: label + total score */}
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                  Performance
                </span>
                <span className="text-sm font-bold tabular-nums" style={{ color: scoreColor(score.total) }}>
                  {score.isPartial ? '~' : ''}{score.total}
                  <span className="text-[11px] font-normal" style={{ color: 'var(--text-dim)' }}>/100</span>
                  {' '}
                  <span className="text-[11px] font-semibold" style={{ color: scoreColor(score.total) }}>
                    {scoreLabel(score.total)}
                    {score.isPartial && <span className="font-normal" style={{ color: 'var(--text-dim)' }}> · in progress</span>}
                  </span>
                </span>
              </div>
              {/* Sub-scores */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                <span>
                  Mileage{' '}
                  <span className="font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{score.mileage}/40</span>
                </span>
                <span style={{ color: 'var(--border-mid)' }}>·</span>
                <span>
                  Pace{' '}
                  <span className="font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{score.pace}/35</span>
                </span>
                <span style={{ color: 'var(--border-mid)' }}>·</span>
                <span>
                  HR{!score.hrHasData && <span style={{ color: 'var(--text-dim)' }}> est.</span>}{' '}
                  <span className="font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{score.hr}/25</span>
                </span>
              </div>
            </div>
          )}

          {/* Coaching note */}
          {week.notes && (
            <div
              className="text-xs leading-relaxed px-3 py-2.5 rounded-lg mb-1"
              style={{
                background: 'rgba(var(--tint),0.04)',
                borderLeft: '2px solid rgba(var(--tint),0.12)',
                color: 'var(--text-secondary)',
              }}
            >
              {week.notes}
            </div>
          )}

          {/* Day-grouped session list */}
          <div className="flex flex-col gap-1 mt-0.5">
            {allDates.map((date) => {
              const runsOnDay    = runsByDate[date]    ?? []
              const orphansOnDay = orphansByDate[date] ?? []
              return (
                <div key={date}>
                  <DayDivider date={date} runs={runsOnDay} />
                  <div className="flex flex-col gap-1.5 mt-1">
                    {/* Planned sessions for this day */}
                    {runsOnDay.map((run) => {
                      if (run.type === 'strength') {
                        return (
                          <StrengthRow
                            key={run.date + run.type}
                            run={run}
                            isCompleted={strengthCompletions.includes(run.date)}
                            planId={planId}
                            onSwapRequest={onStrengthSwapRequest}
                          />
                        )
                      }
                      const actual    = matchMap.get(run.date + run.type)
                      const runIsPast = run.date < today
                      return (
                        <RunRow
                          key={run.date + run.type}
                          run={run}
                          actual={actual}
                          isPast={runIsPast && !actual}
                        />
                      )
                    })}
                    {/* Unplanned bonus runs logged on this day */}
                    {orphansOnDay.map((actual) => (
                      <RunRow
                        key={`orphan-${actual.id}`}
                        actual={actual}
                        isPast={true}
                        isUnplanned={true}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </details>
    </div>
  )
}
