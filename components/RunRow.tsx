import { PlannedRun, ActualRun } from '@/types'
import { formatPaceDisplay, RUN_TYPE_LABELS } from '@/lib/training-plan'
import { formatPace, formatTime } from '@/lib/strava'

const TYPE_COLORS: Record<string, string> = {
  easy: 'text-blue-400 bg-blue-400/10',
  quality: 'text-purple-400 bg-purple-400/10',
  medium_long: 'text-teal-400 bg-teal-400/10',
  long: 'text-orange-400 bg-orange-400/10',
  race: 'text-yellow-400 bg-yellow-400/10',
}

interface RunRowProps {
  run: PlannedRun
  actual?: ActualRun
  isPast: boolean
}

export default function RunRow({ run, actual, isPast }: RunRowProps) {
  const typeColor = TYPE_COLORS[run.type] ?? 'text-gray-400 bg-gray-400/10'

  // Pace comparison
  let paceStatus: 'on-target' | 'fast' | 'slow' | null = null
  if (actual && run.targetPaceMinPerKm) {
    const diff = actual.paceMinPerKm - run.targetPaceMinPerKm
    if (Math.abs(diff) <= 0.25) paceStatus = 'on-target'
    else if (diff < -0.25) paceStatus = 'fast'
    else paceStatus = 'slow'
  }

  // Distance completion
  const distanceOk = actual ? actual.distanceKm >= run.targetDistanceKm * 0.9 : false

  return (
    <div
      className={`rounded-lg border p-3 transition-all ${
        actual
          ? 'border-emerald-800/60 bg-emerald-950/30'
          : isPast
          ? 'border-red-900/50 bg-red-950/20'
          : 'border-gray-800 bg-gray-900/60'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: day + type badge */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-center min-w-[40px]">
            <div className="text-xs text-gray-500">{run.dayOfWeek.slice(0, 3).toUpperCase()}</div>
            <div className="text-xs text-gray-600">
              {new Date(run.date + 'T00:00:00').toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
              })}
            </div>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${typeColor}`}>
            {RUN_TYPE_LABELS[run.type]}
          </span>
        </div>

        {/* Right: status icon */}
        <div className="shrink-0 mt-0.5">
          {actual ? (
            <span className="text-emerald-400 text-base">✓</span>
          ) : isPast ? (
            <span className="text-red-500 text-base">✗</span>
          ) : (
            <span className="text-gray-700 text-base">○</span>
          )}
        </div>
      </div>

      {/* Planned details */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-white font-semibold text-sm">{run.targetDistanceKm} km</span>
        {run.targetPaceMinPerKm && (
          <span className="text-gray-400 text-xs">
            @ {formatPaceDisplay(run.targetPaceMinPerKm)}
          </span>
        )}
        {!run.targetPaceMinPerKm && (
          <span className="text-gray-500 text-xs">easy pace</span>
        )}
      </div>

      <p className="text-gray-500 text-xs mt-1 leading-relaxed">{run.description}</p>

      {/* Actual run result */}
      {actual && (
        <div className="mt-2 pt-2 border-t border-gray-800 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-emerald-400 text-xs font-medium">
            ✓ {actual.distanceKm} km
          </span>
          <span
            className={`text-xs font-medium ${
              paceStatus === 'on-target'
                ? 'text-emerald-400'
                : paceStatus === 'fast'
                ? 'text-yellow-400'
                : 'text-orange-400'
            }`}
          >
            {formatPace(actual.paceMinPerKm)}
            {paceStatus === 'fast' && ' ↑ fast'}
            {paceStatus === 'slow' && ' ↓ slow'}
          </span>
          {actual.averageHeartrate && (
            <span className="text-gray-500 text-xs">♥ {Math.round(actual.averageHeartrate)} bpm</span>
          )}
          <span className="text-gray-600 text-xs">{formatTime(actual.movingTimeSeconds)}</span>
          {!distanceOk && (
            <span className="text-yellow-600 text-xs ml-auto">short</span>
          )}
        </div>
      )}

      {actual && actual.name && (
        <div className="mt-1">
          <span className="text-gray-600 text-xs italic">"{actual.name}"</span>
        </div>
      )}
    </div>
  )
}
