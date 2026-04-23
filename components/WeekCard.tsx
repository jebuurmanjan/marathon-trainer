import { Week, ActualRun } from '@/types'
import RunRow from './RunRow'
import { PHASE_LABELS } from '@/lib/training-plan'

const PHASE_BADGE: Record<string, string> = {
  base: 'bg-blue-900/60 text-blue-300',
  build: 'bg-purple-900/60 text-purple-300',
  peak: 'bg-red-900/60 text-red-300',
  sharpen: 'bg-yellow-900/60 text-yellow-300',
  taper: 'bg-emerald-900/60 text-emerald-300',
}

interface WeekCardProps {
  week: Week
  actualRuns: ActualRun[]
  isCurrentWeek: boolean
  isPastWeek: boolean
}

export default function WeekCard({
  week,
  actualRuns,
  isCurrentWeek,
  isPastWeek,
}: WeekCardProps) {
  const today = new Date().toISOString().slice(0, 10)

  // Match actual runs to planned runs by date (±1 day)
  function findActual(plannedDate: string): ActualRun | undefined {
    const planned = new Date(plannedDate).getTime()
    return actualRuns.find((a) => {
      const diff = Math.abs(new Date(a.runDate).getTime() - planned)
      return diff <= 86400000 * 1.5 // within 1.5 days
    })
  }

  const completedRuns = week.runs.filter((r) => findActual(r.date)).length
  const totalKmActual = actualRuns.reduce((sum, r) => sum + r.distanceKm, 0)
  const pct = Math.round((completedRuns / week.runs.length) * 100)

  const startLabel = new Date(week.startDate + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
  const endLabel = new Date(week.endDate + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })

  return (
    <div
      id={`week-${week.weekNumber}`}
      className={`rounded-xl border p-4 transition-all ${
        isCurrentWeek
          ? 'border-orange-500/60 bg-gray-900 shadow-lg shadow-orange-500/10'
          : isPastWeek
          ? 'border-gray-800 bg-gray-950'
          : 'border-gray-800 bg-gray-950'
      }`}
    >
      {/* Week header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-base">
            Week {week.weekNumber}
            {isCurrentWeek && (
              <span className="ml-2 text-orange-400 text-xs font-semibold animate-pulse">
                ← NOW
              </span>
            )}
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PHASE_BADGE[week.phase]}`}>
            {PHASE_LABELS[week.phase]}
          </span>
          {week.isCutback && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
              Cutback
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-right">
          <div className="text-xs text-gray-500">
            {startLabel} – {endLabel}
          </div>
          <div className="text-xs text-gray-400">
            <span className="text-white font-semibold">{week.targetKm}</span> km planned
          </div>
        </div>
      </div>

      {/* Progress bar (past/current weeks) */}
      {(isPastWeek || isCurrentWeek) && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500">
              {completedRuns}/{week.runs.length} runs completed
            </span>
            <span className="text-gray-400">
              {totalKmActual.toFixed(1)} / {week.targetKm} km
            </span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Coach note */}
      <p className="text-gray-500 text-xs mb-3 leading-relaxed italic border-l-2 border-gray-700 pl-2">
        {week.notes}
      </p>

      {/* Run rows */}
      <div className="grid gap-2 sm:grid-cols-2">
        {week.runs.map((run) => {
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
    </div>
  )
}
