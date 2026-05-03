'use client'

import { useState } from 'react'
import { PlannedRun, ActualRun } from '@/types'
import { RUN_TYPE_LABELS } from '@/lib/training-plan'
import { formatPace, formatTime } from '@/lib/strava'

const TYPE_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  easy:        { bg: 'rgba(47,148,97,0.10)',    color: 'var(--accent-green)',  dot: 'var(--accent-green)'  },
  tempo:       { bg: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)',   dot: 'var(--accent)'        },
  interval:    { bg: 'rgba(251,188,85,0.18)',   color: 'var(--color-warning)', dot: 'var(--color-warning)' },
  quality:     { bg: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)',   dot: 'var(--accent)'        }, // legacy
  medium_long: { bg: 'rgba(13,148,136,0.12)',  color: 'var(--accent-teal)',   dot: 'var(--accent-teal)'   },
  long:        { bg: 'rgba(136,121,225,0.12)', color: 'var(--accent-violet)', dot: 'var(--accent-violet)' },
  race:        { bg: 'rgba(243,65,65,0.10)',    color: 'var(--color-error)',   dot: 'var(--color-error)'   },
}

interface RunRowProps {
  run:     PlannedRun
  actual?: ActualRun
  isPast:  boolean
}

export default function RunRow({ run, actual, isPast }: RunRowProps) {
  const [expanded, setExpanded] = useState(false)

  const style = TYPE_STYLE[run.type] ?? {
    bg: 'rgba(var(--tint),0.06)', color: 'var(--text-dim)', dot: 'var(--text-dim)',
  }

  // Pace comparison
  let paceStatus: 'on-target' | 'fast' | 'slow' | null = null
  if (actual && run.targetPaceMinPerKm) {
    const diff = actual.paceMinPerKm - run.targetPaceMinPerKm
    if (Math.abs(diff) <= 0.25) paceStatus = 'on-target'
    else if (diff < -0.25)      paceStatus = 'fast'
    else                        paceStatus = 'slow'
  }

  const paceColor = paceStatus === 'on-target' ? 'var(--accent-green)'
                  : paceStatus === 'fast'       ? 'var(--accent-violet)'
                  :                               'var(--accent)'

  const distanceOk = actual ? actual.distanceKm >= run.targetDistanceKm * 0.9 : false

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
        <span className="flex-1 text-xs truncate" style={{ color: 'var(--text-primary)' }}>
          {run.description}
        </span>

        {/* Right side: actual stats inline OR planned distance */}
        {actual ? (
          <div className="flex items-center gap-2 shrink-0 text-xs">
            <span className="font-semibold tabular-nums" style={{ color: 'var(--accent-green)' }}>
              {actual.distanceKm} km
            </span>
            {actual.paceMinPerKm > 0 && (
              <span className="font-medium tabular-nums" style={{ color: paceColor }}>
                {formatPace(actual.paceMinPerKm)}
                {paceStatus === 'fast' && <span> ↑</span>}
                {paceStatus === 'slow' && <span> ↓</span>}
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
            {run.targetDistanceKm} km
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

          {/* Target distance for reference */}
          <span style={{ color: 'var(--text-dim)' }}>
            target <span className="tabular-nums">{run.targetDistanceKm} km</span>
            {run.targetPaceMinPerKm
              ? ` · ${formatPace(run.targetPaceMinPerKm)}/km`
              : ''}
          </span>

          {/* Short flag */}
          {!distanceOk && (
            <span className="font-medium" style={{ color: 'var(--color-warning)' }}>short</span>
          )}

          {/* Strava activity name */}
          {actual.name && (
            <span className="w-full truncate italic" style={{ color: 'var(--text-dim)' }}>
              "{actual.name}"
            </span>
          )}
        </div>
      )}
    </div>
  )
}
