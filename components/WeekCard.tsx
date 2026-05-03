import { Week, ActualRun, PlannedRun } from '@/types'
import RunRow from './RunRow'
import StrengthRow from './StrengthRow'
import { PHASE_LABELS, formatDistance, formatDistanceExact } from '@/lib/training-plan'
import { calcWeekScore, scoreColor, scoreLabel } from '@/lib/score'

const PHASE_BADGE: Record<string, { bg: string; color: string }> = {
  base:    { bg: 'rgba(206,210,214,0.40)', color: 'var(--text-dim)' },
  build:   { bg: 'rgba(136,121,225,0.12)', color: 'var(--accent-violet)' },
  peak:    { bg: 'rgba(var(--accent-rgb),0.12)',  color: 'var(--accent)' },
  sharpen: { bg: 'rgba(var(--accent-rgb),0.12)',  color: 'var(--accent)' },
  taper:   { bg: 'rgba(47,148,97,0.10)',    color: 'var(--text-secondary)' },
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
  // Use dayOfWeek from the first run on this date (already stored on PlannedRun)
  const dow = runs[0]?.dayOfWeek?.slice(0, 3).toUpperCase() ?? ''
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

  function findActual(plannedDate: string): ActualRun | undefined {
    const planned = new Date(plannedDate).getTime()
    return actualRuns.find((a) => {
      const diff = Math.abs(new Date(a.runDate).getTime() - planned)
      return diff <= 86400000 * 1.5
    })
  }

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

  // Group runs by date for day-separated rendering
  const runsByDate = week.runs.reduce<Record<string, PlannedRun[]>>((acc, run) => {
    ;(acc[run.date] ??= []).push(run)
    return acc
  }, {})
  const sortedDates = Object.keys(runsByDate).sort()

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
            {sortedDates.map((date) => {
              const runsOnDay = runsByDate[date]
              return (
                <div key={date}>
                  <DayDivider date={date} runs={runsOnDay} />
                  <div className="flex flex-col gap-1.5 mt-1">
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
                      const actual    = findActual(run.date)
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
