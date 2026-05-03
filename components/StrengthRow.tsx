'use client'

import { useState } from 'react'
import { PlannedRun, WorkoutCategory } from '@/types'

const CATEGORY_LABELS: Record<WorkoutCategory, string> = {
  core_stability: 'Core & Stability',
  legs:           'Legs',
  plyometrics:    'Plyometrics',
  upper_body:     'Upper Body',
}

interface StrengthRowProps {
  run:             PlannedRun
  isCompleted:     boolean
  planId:          string
  onSwapRequest?:  (run: PlannedRun) => void
}

export default function StrengthRow({ run, isCompleted: initialCompleted, planId, onSwapRequest }: StrengthRowProps) {
  const [completed,  setCompleted]  = useState(initialCompleted)
  const [expanded,   setExpanded]   = useState(false)
  const [loading,    setLoading]    = useState(false)

  async function toggle() {
    if (loading || !planId) return
    setLoading(true)
    const next = !completed
    setCompleted(next) // optimistic

    try {
      let res: Response
      if (next) {
        res = await fetch('/api/strength', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            planId,
            weekNumber:  run.weekNumber,
            sessionDate: run.date,
          }),
        })
      } else {
        res = await fetch('/api/strength', {
          method:  'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ planId, sessionDate: run.date }),
        })
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.error('Strength completion save failed', res.status, body)
        setCompleted(!next) // revert on HTTP error
      }
    } catch (err) {
      console.error('Strength completion network error', err)
      setCompleted(!next) // revert on network failure
    } finally {
      setLoading(false)
    }
  }

  const duration = run.durationMinutes ?? 30

  return (
    <div
      className="group rounded-lg px-3 py-2.5 transition-all"
      style={{
        background: completed ? 'var(--card-done)'        : 'var(--card-base)',
        border:     completed ? '1px solid var(--card-done-border)' : '1px solid var(--border)',
        opacity: loading ? 0.7 : 1,
      }}
    >
      {/* Main row */}
      <div className="flex items-center gap-2.5">
        {/* Icon dot — rose for strength */}
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: 'var(--accent-rose)' }}
        />

        {/* Day */}
        <span className="text-[10px] font-semibold min-w-[24px]" style={{ color: 'var(--text-secondary)' }}>
          {run.dayOfWeek.slice(0, 3).toUpperCase()}
        </span>

        {/* Type badge */}
        <span
          className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0"
          style={{ background: 'rgba(219,39,119,0.10)', color: 'var(--accent-rose)' }}
        >
          Strength
        </span>

        {/* Label + workout name */}
        <div className="flex-1 min-w-0">
          <span className="text-xs block truncate" style={{ color: 'var(--text-primary)' }}>
            {run.workoutName ?? (run.description || `Strength session — ${duration} min`)}
          </span>
          {run.workoutCategory && (
            <span className="text-[10px]" style={{ color: 'var(--accent-rose)' }}>
              {CATEGORY_LABELS[run.workoutCategory]}
            </span>
          )}
        </div>

        {/* Duration */}
        <span
          className="text-xs font-semibold shrink-0"
          style={{ color: 'var(--text-dim)' }}
        >
          {duration} min
        </span>

        {/* Swap button — visible on hover / focus only */}
        {onSwapRequest && (
          <button
            onClick={() => onSwapRequest(run)}
            className="shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            style={{ color: 'var(--accent)', background: 'rgba(var(--accent-rgb),0.08)' }}
          >
            Swap
          </button>
        )}

        {/* Expand toggle (only if exercises) */}
        {run.exercises && run.exercises.length > 0 && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-[10px] shrink-0 px-1.5 py-0.5 rounded-lg"
            style={{ color: 'var(--text-dim)', background: 'rgba(var(--tint),0.06)' }}
          >
            {expanded ? '▲' : '▼'}
          </button>
        )}

        {/* Completion toggle */}
        <button
          onClick={toggle}
          disabled={loading}
          className="shrink-0 text-sm"
          title={completed ? 'Mark as not done' : 'Mark as done'}
        >
          {completed ? (
            <span style={{ color: 'var(--accent-green)' }}>✓</span>
          ) : (
            <span style={{ color: 'var(--surface-3)' }}>○</span>
          )}
        </button>
      </div>

      {/* Exercises list */}
      {expanded && run.exercises && run.exercises.length > 0 && (
        <div
          className="mt-2 pt-2 space-y-1"
          style={{ borderTop: '1px solid rgba(var(--tint),0.08)' }}
        >
          {run.exercises.map((ex, i) => (
            <div key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-dim)' }}>
              <span style={{ color: 'var(--accent-rose)', flexShrink: 0 }}>·</span>
              <span>{ex}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
