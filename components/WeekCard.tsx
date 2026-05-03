import { Week, ActualRun } from '@/types'
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
  onStrengthSwapRequest?:    (run: import('@/types').PlannedRun) => void
}

export default function WeekCard({ week, actualRuns, isCurrentWeek, isPastWeek, strengthCompletions = [], planId = '', units = 'km', onStrengthSwapRequest }: WeekCardProps) {
  const today = new Date().toISOString().slice(0, 10)

  function findActual(plannedDate: string): ActualRun | undefined {
    const planned = new Date(plannedDate).getTime()
    return actualRuns.find((a) => {
      const diff = Math.abs(new Date(a.runDate).getTime() - planned)
      return diff <= 86400000 * 1.5
    })
  }

  // Separate running sessions from strength sessions
  const runSessions      = week.runs.filter((r) => r.type !== 'strength')
  const strengthSessions = week.runs.filter((r) => r.type === 'strength')

  const completedRuns    = runSessions.filter((r) => findActual(r.date)).length
  const completedStrength = strengthSessions.filter((r) => strengthCompletions.includes(r.date)).length

  const totalKmActual = actualRuns.reduce((sum, r) => sum + r.distanceKm, 0)
  const pct = Math.min(100, Math.round((totalKmActual / (week.targetKm || 1)) * 100))

  const startLabel = new Date(week.startDate + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short',
  })
  const endLabel = new Date(week.endDate + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short',
  })

  const badge = PHASE_BADGE[week.phase] ?? { bg: 'rgba(var(--tint),0.08)', color: 'var(--text-dim)' }

  // Performance score — computed for past + current weeks only
  const showScore = isCurrentWeek || isPastWeek
  const score = showScore ? calcWeekScore(week, actualRuns, isCurrentWeek) : null

  // Summary line shown in collapsed state
  const strengthInfo = strengthSessions.length > 0
    ? ` · ${strengthSessions.length > 1 ? completedStrength + '/' + strengthSessions.length : ''} strength`
    : ''

  const summaryHint = isPastWeek
    ? `${completedRuns}/${runSessions.length} runs completed${strengthInfo} — click to expand`
    : isCurrentWeek
    ? `${runSessions.length} runs this week${strengthInfo} — click to collapse`
    : `${runSessions.length} runs planned${strengthInfo} — click to expand`

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
      {/* <details> wraps everything — current week open by default */}
      <details open={isCurrentWeek}>
        {/* The <summary> is the clickable header row */}
        <summary className="list-none cursor-pointer select-none" style={{ outline: 'none' }}>
          {/* Week header */}
          <div className="flex items-center gap-3 px-5 py-4">
            {/* Week number */}
            <span
              className="text-xs font-semibold min-w-[28px]"
              style={{
                fontFamily: 'Nohemi, Inter, sans-serif',
                fontWeight: 600,
                color: isCurrentWeek ? 'var(--accent)' : 'var(--text-dim)',
              }}
            >
              W{week.weekNumber}
            </span>

            {/* Phase badge */}
            <span
              className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full whitespace-nowrap"
              style={{ background: badge.bg, color: badge.color }}
            >
              {PHASE_LABELS[week.phase]}
              {week.isCutback ? ' · Cutback' : ''}
            </span>

            {/* Title + dates */}
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
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {startLabel} – {endLabel}
              </div>
            </div>

            {/* KM + score + expand hint */}
            <div className="text-right shrink-0">
              <div
                className="text-lg leading-none"
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
                <div className="text-[11px] mt-0.5 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  {formatDistanceExact(totalKmActual, units)} logged
                </div>
              )}

              {/* Performance score */}
              {score && score.total !== null && (
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: scoreColor(score.total) }}>
                    {score.isPartial ? '~' : ''}{score.total}
                    <span className="font-normal" style={{ opacity: 0.55 }}>/100</span>
                  </span>

                  {/* (i) icon — CSS-only hover tooltip */}
                  <div className="relative group inline-flex items-center">
                    <span
                      className="flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold cursor-help select-none"
                      style={{ background: 'rgba(var(--tint),0.10)', color: 'var(--text-dim)', lineHeight: 1 }}
                    >
                      i
                    </span>

                    {/* Tooltip */}
                    <div
                      className="absolute bottom-full right-0 mb-2 w-60 rounded-lg px-3.5 py-3 text-left invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50"
                      style={{ background: 'var(--surface-overlay)', boxShadow: '0 8px 24px rgba(0,0,0,0.32)' }}
                    >
                      {/* Arrow */}
                      <div className="absolute -bottom-1.5 right-3 w-3 h-3 rotate-45" style={{ background: 'var(--surface-overlay)' }} />

                      <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(246,247,249,0.45)' }}>
                        Performance score
                      </p>
                      <p className="text-[11px] mb-2.5 leading-relaxed" style={{ color: 'var(--text-overlay-body)' }}>
                        Each week is rated 0–100 across three factors:
                      </p>

                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex justify-between items-center gap-2">
                          <span style={{ color: 'var(--text-overlay-body)' }}>Mileage — actual vs planned km</span>
                          <span className="font-bold tabular-nums shrink-0" style={{ color: 'var(--text-overlay)' }}>
                            {score.mileage}/40
                          </span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <span style={{ color: 'var(--text-overlay-body)' }}>Pace — closeness to target</span>
                          <span className="font-bold tabular-nums shrink-0" style={{ color: 'var(--text-overlay)' }}>
                            {score.pace}/35
                          </span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <span style={{ color: 'var(--text-overlay-body)' }}>
                            HR — zone efficiency
                            {!score.hrHasData && <span style={{ opacity: 0.6 }}> (est.)</span>}
                          </span>
                          <span className="font-bold tabular-nums shrink-0" style={{ color: 'var(--text-overlay)' }}>
                            {score.hr}/25
                          </span>
                        </div>
                      </div>

                      <div
                        className="mt-2.5 pt-2 flex justify-between items-center text-[11px] border-t"
                        style={{ borderColor: 'rgba(246,247,249,0.10)' }}
                      >
                        <span style={{ color: 'var(--text-overlay-body)' }}>Total</span>
                        <span className="font-bold" style={{ color: scoreColor(score.total) }}>
                          {score.isPartial ? '~' : ''}{score.total} — {scoreLabel(score.total)}
                          {score.isPartial && <span className="font-normal" style={{ opacity: 0.6 }}> (in progress)</span>}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Past week with zero runs logged */}
              {score && score.total === null && isPastWeek && (
                <div className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>no data</div>
              )}

              <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
                {summaryHint.includes('expand') ? '▸ expand' : '▾ collapse'}
              </div>
            </div>
          </div>

          {/* Progress bar (past + current weeks) */}
          {(isCurrentWeek || isPastWeek) && (
            <div style={{ height: '2px', background: 'var(--surface-2)' }}>
              <div
                style={{
                  height: '2px',
                  width: `${pct}%`,
                  background: pct >= 90 ? 'var(--accent-green)' : 'var(--accent)',
                  borderRadius: '1px',
                  transition: 'width 0.4s',
                }}
              />
            </div>
          )}
        </summary>

        {/* Expanded run list — shown for ALL weeks when open */}
        <div className="px-4 pb-4 pt-2 flex flex-col gap-2">
          {/* Coaching note — shown when expanded */}
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
          {week.runs.map((run) => {
            if (run.type === 'strength') {
              return (
                <StrengthRow
                  key={run.date}
                  run={run}
                  isCompleted={strengthCompletions.includes(run.date)}
                  planId={planId}
                  onSwapRequest={onStrengthSwapRequest}
                />
              )
            }
            const actual = findActual(run.date)
            const runIsPast = run.date < today
            return (
              <RunRow
                key={run.date}
                run={run}
                actual={actual}
                isPast={runIsPast && !actual}
              />
            )
          })}
        </div>
      </details>
    </div>
  )
}
