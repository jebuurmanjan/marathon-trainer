'use client'

import { useState } from 'react'
import { PlannedRun, ActualRun } from '@/types'
import { RUN_TYPE_LABELS } from '@/lib/training-plan'
import { formatPace, formatTime } from '@/lib/strava'
import { zoneForType } from '@/lib/zones'

const TYPE_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  easy:        { bg: 'rgba(47,148,97,0.10)',    color: 'var(--accent-green)',  dot: 'var(--accent-green)'  },
  tempo:       { bg: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)',   dot: 'var(--accent)'        },
  interval:    { bg: 'rgba(251,188,85,0.18)',   color: 'var(--color-warning)', dot: 'var(--color-warning)' },
  quality:     { bg: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)',   dot: 'var(--accent)'        }, // legacy
  medium_long: { bg: 'rgba(13,148,136,0.12)',  color: 'var(--accent-teal)',   dot: 'var(--accent-teal)'   },
  long:        { bg: 'rgba(136,121,225,0.12)', color: 'var(--accent-violet)', dot: 'var(--accent-violet)' },
  race:        { bg: 'rgba(243,65,65,0.10)',    color: 'var(--color-error)',   dot: 'var(--color-error)'   },
}

// Style for bonus runs that weren't in the plan
const EXTRA_STYLE = { bg: 'rgba(var(--tint),0.08)', color: 'var(--text-secondary)', dot: 'var(--text-secondary)' }

interface RunRowProps {
  run?:         PlannedRun   // undefined when isUnplanned=true
  actual?:      ActualRun
  isPast:       boolean
  isUnplanned?: boolean      // true = Strava run with no matching planned session
}

export default function RunRow({ run, actual, isPast, isUnplanned = false }: RunRowProps) {
  const [expanded, setExpanded] = useState(false)

  const style = isUnplanned
    ? EXTRA_STYLE
    : (TYPE_STYLE[run!.type] ?? { bg: 'rgba(var(--tint),0.06)', color: 'var(--text-dim)', dot: 'var(--text-dim)' })

  // Day abbreviation: for planned runs read from run.dayOfWeek; for unplanned derive from actual date
  const dayOfWeek = isUnplanned && actual
    ? new Date(actual.runDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 3).toUpperCase()
    : (run?.dayOfWeek ?? '').slice(0, 3).toUpperCase()

  // Pace comparison — only meaningful when a target pace exists
  let paceStatus: 'on-target' | 'fast' | 'slow' | null = null
  if (actual && run?.targetPaceMinPerKm) {
    const diff = actual.paceMinPerKm - run.targetPaceMinPerKm
    if (Math.abs(diff) <= 0.25) paceStatus = 'on-target'
    else if (diff < -0.25)      paceStatus = 'fast'
    else                        paceStatus = 'slow'
  }

  const paceColor = paceStatus === 'on-target' ? 'var(--accent-green)'
                  : paceStatus === 'fast'       ? 'var(--accent-violet)'
                  :                               'var(--accent)'

  // "Short" flag: only applies to planned runs where we can compare to a target
  const distanceOk = (actual && run) ? actual.distanceKm >= run.targetDistanceKm * 0.9 : true

  return (
    <div
      className="rounded-lg px-3 py-2.5 transition-all"
      style={{
        background: actual ? 'var(--card-done)'
                  : isPast ? 'var(--card-missed)'
                  :          'var(--card-base)',
        border: actual ? '1px solid var(--card-done-border)'
              : isPast ? '1px solid var(--card-missed-border)'
              :          '1px solid var(--border)',
        cursor: actual ? 'pointer' : 'default',
      }}
      onClick={actual ? () => setExpanded((v) => !v) : undefined}
      role={actual ? 'button' : undefined}
      aria-expanded={actual ? expanded : undefined}
    >
      {/* ── Main row ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5">
        {/* Colour dot */}
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: style.dot }} />

        {/* Day abbreviation */}
        <span className="text-[10px] font-semibold min-w-[24px]" style={{ color: 'var(--text-secondary)' }}>
          {dayOfWeek}
        </span>

        {/* Type badge */}
        <span
          className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0"
          style={{ background: style.bg, color: style.color }}
        >
          {isUnplanned ? 'Extra' : RUN_TYPE_LABELS[run!.type]}
        </span>

        {/* Zone chip — Z2, Z4, Z5 etc. (planned runs only, not strength or unplanned) */}
        {!isUnplanned && run && run.type !== 'strength' && zoneForType(run.type) && (
          <span
            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 tabular-nums"
            style={{ background: 'rgba(var(--tint),0.06)', color: 'var(--text-dim)' }}
          >
            Z{zoneForType(run.type)}
          </span>
        )}

        {/* Description — for unplanned runs, show the Strava activity name */}
        <span className="flex-1 text-xs truncate" style={{ color: 'var(--text-primary)' }}>
          {isUnplanned ? (actual?.name ?? 'Unplanned run') : run?.description}
        </span>

        {/* Right side: actual stats inline OR planned distance */}
        {actual ? (
          <div className="flex items-center gap-2 shrink-0 text-xs">
            <span className="font-semibold tabular-nums" style={{ color: 'var(--accent-green)' }}>
              {actual.distanceKm} km
            </span>
            {actual.paceMinPerKm > 0 && (
              <span className="font-medium tabular-nums" style={{ color: isUnplanned ? 'var(--text-secondary)' : paceColor }}>
                {formatPace(actual.paceMinPerKm)}
                {!isUnplanned && paceStatus === 'fast' && <span> ↑</span>}
                {!isUnplanned && paceStatus === 'slow' && <span> ↓</span>}
              </span>
            )}
            {actual.averageHeartrate && (
              <span className="tabular-nums" style={{ color: 'var(--text-dim)' }}>
                ♥{Math.round(actual.averageHeartrate)}
              </span>
            )}
          </div>
        ) : (
          <span
            className="text-sm font-semibold shrink-0 tabular-nums"
            style={{ fontFamily: 'Nohemi, Inter, sans-serif', fontWeight: 600, color: 'var(--text-dim)' }}
          >
            {run?.targetDistanceKm} km
          </span>
        )}

        {/* Status icon */}
        <span className="text-sm shrink-0" style={{ minWidth: '1rem', textAlign: 'center' }}>
          {actual  ? <span style={{ color: 'var(--accent-green)' }}>✓</span>
          : isPast ? <span style={{ color: 'var(--accent)' }}>✗</span>
          :          <span style={{ color: 'var(--surface-3)' }}>○</span>}
        </span>

        {/* Expand chevron — only when actual data exists */}
        {actual && (
          <svg
            viewBox="0 0 24 24"
            className="w-3 h-3 shrink-0 transition-transform duration-150"
            style={{
              color: 'var(--text-dim)',
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
            fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
      </div>

      {/* ── Expanded detail — time, activity name, short flag ─────────────── */}
      {actual && expanded && (
        <div
          className="mt-2 pt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
          style={{ borderTop: '1px solid rgba(var(--tint),0.08)' }}
        >
          {/* Moving time */}
          <span style={{ color: 'var(--text-dim)' }}>{formatTime(actual.movingTimeSeconds)}</span>

          {/* Target distance — only for planned runs */}
          {run && (
            <span style={{ color: 'var(--text-dim)' }}>
              target <span className="tabular-nums">{run.targetDistanceKm} km</span>
              {run.targetPaceMinPerKm
                ? ` · ${formatPace(run.targetPaceMinPerKm)}/km`
                : ''}
            </span>
          )}

          {/* Short flag — only when a target distance exists to compare against */}
          {!distanceOk && (
            <span className="font-medium" style={{ color: 'var(--color-warning)' }}>short</span>
          )}

          {/* Strava activity name — for planned runs (unplanned already shows it as description) */}
          {actual.name && !isUnplanned && (
            <span className="w-full truncate italic" style={{ color: 'var(--text-dim)' }}>
              "{actual.name}"
            </span>
          )}
        </div>
      )}
    </div>
  )
}
