import { PlannedRun, ActualRun } from '@/types'
import { formatPaceDisplay, RUN_TYPE_LABELS } from '@/lib/training-plan'
import { formatPace, formatTime } from '@/lib/strava'

const TYPE_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  easy:        { bg: 'rgba(74,84,39,0.10)',    color: '#4A5427', dot: '#4A5427' },
  quality:     { bg: 'rgba(238,107,23,0.12)',   color: '#EE6B17', dot: '#EE6B17' },
  medium_long: { bg: 'rgba(136,121,225,0.12)',  color: '#8879E1', dot: '#8879E1' },
  long:        { bg: 'rgba(136,121,225,0.12)',  color: '#8879E1', dot: '#8879E1' },
  race:        { bg: 'rgba(238,107,23,0.12)',   color: '#EE6B17', dot: '#EE6B17' },
}

interface RunRowProps {
  run: PlannedRun
  actual?: ActualRun
  isPast: boolean
}

export default function RunRow({ run, actual, isPast }: RunRowProps) {
  const style = TYPE_STYLE[run.type] ?? { bg: 'rgba(43,49,23,0.06)', color: '#736554', dot: '#736554' }

  let paceStatus: 'on-target' | 'fast' | 'slow' | null = null
  if (actual && run.targetPaceMinPerKm) {
    const diff = actual.paceMinPerKm - run.targetPaceMinPerKm
    if (Math.abs(diff) <= 0.25) paceStatus = 'on-target'
    else if (diff < -0.25) paceStatus = 'fast'
    else paceStatus = 'slow'
  }

  const distanceOk = actual ? actual.distanceKm >= run.targetDistanceKm * 0.9 : false

  return (
    <div
      className="rounded-xl px-3 py-2.5 transition-all"
      style={{
        background: actual
          ? 'rgba(74,84,39,0.08)'
          : isPast
          ? 'rgba(238,107,23,0.06)'
          : '#F5F4F2',
        border: actual
          ? '1px solid rgba(74,84,39,0.20)'
          : isPast
          ? '1px solid rgba(238,107,23,0.15)'
          : '1px solid rgba(43,49,23,0.08)',
      }}
    >
      <div className="flex items-center gap-2.5">
        {/* Colour dot */}
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: style.dot }}
        />

        {/* Day */}
        <span className="text-[10px] font-semibold min-w-[24px]" style={{ color: '#4A5427' }}>
          {run.dayOfWeek.slice(0, 3).toUpperCase()}
        </span>

        {/* Type badge */}
        <span
          className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0"
          style={{ background: style.bg, color: style.color }}
        >
          {RUN_TYPE_LABELS[run.type]}
        </span>

        {/* Description */}
        <span className="flex-1 text-xs truncate" style={{ color: '#1E1611' }}>
          {run.description}
        </span>

        {/* Distance */}
        <span
          className="text-sm font-semibold shrink-0"
          style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, color: '#736554' }}
        >
          {run.targetDistanceKm} km
        </span>

        {/* Status icon */}
        <span className="text-sm shrink-0">
          {actual ? (
            <span style={{ color: '#4A5427' }}>✓</span>
          ) : isPast ? (
            <span style={{ color: '#EE6B17' }}>✗</span>
          ) : (
            <span style={{ color: '#E3D2B4' }}>○</span>
          )}
        </span>
      </div>

      {/* Actual result */}
      {actual && (
        <div
          className="mt-2 pt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
          style={{ borderTop: '1px solid rgba(43,49,23,0.08)' }}
        >
          <span className="font-semibold" style={{ color: '#4A5427' }}>
            {actual.distanceKm} km
          </span>
          <span
            className="font-medium"
            style={{
              color: paceStatus === 'on-target' ? '#4A5427'
                : paceStatus === 'fast' ? '#8879E1'
                : '#EE6B17',
            }}
          >
            {formatPace(actual.paceMinPerKm)}
            {paceStatus === 'fast' && ' ↑'}
            {paceStatus === 'slow' && ' ↓'}
          </span>
          {actual.averageHeartrate && (
            <span style={{ color: '#736554' }}>♥ {Math.round(actual.averageHeartrate)} bpm</span>
          )}
          <span style={{ color: '#736554' }}>{formatTime(actual.movingTimeSeconds)}</span>
          {!distanceOk && (
            <span className="ml-auto" style={{ color: '#EE6B17' }}>short</span>
          )}
          {actual.name && (
            <span className="w-full truncate italic" style={{ color: '#736554' }}>"{actual.name}"</span>
          )}
        </div>
      )}
    </div>
  )
}
