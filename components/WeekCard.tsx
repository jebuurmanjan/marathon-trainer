import { Week, ActualRun } from '@/types'
import RunRow from './RunRow'
import { PHASE_LABELS } from '@/lib/training-plan'

const PHASE_BADGE: Record<string, { bg: string; color: string }> = {
  base:    { bg: 'rgba(227,210,180,0.50)', color: '#736554' },
  build:   { bg: 'rgba(136,121,225,0.12)', color: '#8879E1' },
  peak:    { bg: 'rgba(238,107,23,0.12)',  color: '#EE6B17' },
  sharpen: { bg: 'rgba(238,107,23,0.12)',  color: '#EE6B17' },
  taper:   { bg: 'rgba(74,84,39,0.10)',    color: '#4A5427' },
}

interface WeekCardProps {
  week: Week
  actualRuns: ActualRun[]
  isCurrentWeek: boolean
  isPastWeek: boolean
}

export default function WeekCard({ week, actualRuns, isCurrentWeek, isPastWeek }: WeekCardProps) {
  const today = new Date().toISOString().slice(0, 10)

  function findActual(plannedDate: string): ActualRun | undefined {
    const planned = new Date(plannedDate).getTime()
    return actualRuns.find((a) => {
      const diff = Math.abs(new Date(a.runDate).getTime() - planned)
      return diff <= 86400000 * 1.5
    })
  }

  const completedRuns = week.runs.filter((r) => findActual(r.date)).length
  const totalKmActual = actualRuns.reduce((sum, r) => sum + r.distanceKm, 0)
  const pct = Math.min(100, Math.round((totalKmActual / week.targetKm) * 100))

  const startLabel = new Date(week.startDate + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short',
  })
  const endLabel = new Date(week.endDate + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short',
  })

  const badge = PHASE_BADGE[week.phase] ?? { bg: 'rgba(43,49,23,0.08)', color: '#736554' }

  return (
    <div
      id={`week-${week.weekNumber}`}
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: '#EDE9DE',
        border: isCurrentWeek
          ? '1px solid rgba(238,107,23,0.30)'
          : '1px solid rgba(43,49,23,0.08)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        {/* Week number */}
        <span
          className="text-xs font-semibold min-w-[28px]"
          style={{
            fontFamily: 'Nohemi, Inter, sans-serif',
            fontWeight: 600,
            color: isCurrentWeek ? '#EE6B17' : '#736554',
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
            style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.01em', color: '#1E1611' }}
          >
            {week.notes}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: '#4A5427' }}>
            {startLabel} – {endLabel}
          </div>
        </div>

        {/* KM */}
        <div className="text-right shrink-0">
          <div
            className="text-lg leading-none"
            style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, letterSpacing: '-0.03em', color: '#1E1611' }}
          >
            {week.targetKm} km
          </div>
          {(isCurrentWeek || isPastWeek) && (
            <div className="text-[11px] mt-0.5 font-semibold" style={{ color: '#4A5427' }}>
              {totalKmActual.toFixed(1)} logged
            </div>
          )}
          <div className="text-[10px]" style={{ color: '#736554' }}>target</div>
        </div>
      </div>

      {/* Progress bar */}
      {(isCurrentWeek || isPastWeek) && (
        <div style={{ height: '2px', background: '#F5F4F2' }}>
          <div
            style={{
              height: '2px',
              width: `${pct}%`,
              background: pct >= 90 ? '#4A5427' : '#EE6B17',
              borderRadius: '1px',
              transition: 'width 0.4s',
            }}
          />
        </div>
      )}

      {/* Run rows — always expanded for current week, collapsed for others */}
      {isCurrentWeek && (
        <div className="px-4 pb-4 pt-2 flex flex-col gap-2">
          {week.runs.map((run) => {
            const actual = findActual(run.date)
            const runIsPast = run.date < today
            return (
              <RunRow key={run.date} run={run} actual={actual} isPast={runIsPast && !actual} />
            )
          })}
        </div>
      )}

      {/* Past weeks: show collapsed run list */}
      {isPastWeek && (
        <details>
          <summary
            className="px-5 pb-3 text-xs font-medium cursor-pointer select-none"
            style={{ color: '#736554' }}
          >
            {completedRuns}/{week.runs.length} runs · click to expand
          </summary>
          <div className="px-4 pb-4 flex flex-col gap-2">
            {week.runs.map((run) => {
              const actual = findActual(run.date)
              const runIsPast = run.date < today
              return (
                <RunRow key={run.date} run={run} actual={actual} isPast={runIsPast && !actual} />
              )
            })}
          </div>
        </details>
      )}
    </div>
  )
}
