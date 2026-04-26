'use client'

import { useState } from 'react'
import { PlannedRun } from '@/types'

interface StrengthRowProps {
  run:          PlannedRun
  isCompleted:  boolean
  planId:       string
}

export default function StrengthRow({ run, isCompleted: initialCompleted, planId }: StrengthRowProps) {
  const [completed,  setCompleted]  = useState(initialCompleted)
  const [expanded,   setExpanded]   = useState(false)
  const [loading,    setLoading]    = useState(false)

  async function toggle() {
    if (loading || !planId) return
    setLoading(true)
    const next = !completed
    setCompleted(next) // optimistic

    try {
      if (next) {
        await fetch('/api/strength', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            planId,
            weekNumber:  run.weekNumber,
            sessionDate: run.date,
          }),
        })
      } else {
        await fetch('/api/strength', {
          method:  'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ planId, sessionDate: run.date }),
        })
      }
    } catch {
      setCompleted(!next) // revert on failure
    } finally {
      setLoading(false)
    }
  }

  const duration = run.durationMinutes ?? 30

  return (
    <div
      className="rounded-lg px-3 py-2.5 transition-all"
      style={{
        background: completed ? 'rgba(74,84,39,0.08)' : '#F5F4F2',
        border: completed
          ? '1px solid rgba(74,84,39,0.20)'
          : '1px solid rgba(43,49,23,0.08)',
        opacity: loading ? 0.7 : 1,
      }}
    >
      {/* Main row */}
      <div className="flex items-center gap-2.5">
        {/* Icon dot — purple for strength */}
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: '#8879E1' }}
        />

        {/* Day */}
        <span className="text-[10px] font-semibold min-w-[24px]" style={{ color: '#4A5427' }}>
          {run.dayOfWeek.slice(0, 3).toUpperCase()}
        </span>

        {/* Type badge */}
        <span
          className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0"
          style={{ background: 'rgba(136,121,225,0.12)', color: '#8879E1' }}
        >
          Strength
        </span>

        {/* Label */}
        <span className="flex-1 text-xs truncate" style={{ color: '#1E1611' }}>
          {run.description || `Strength session — ${duration} min`}
        </span>

        {/* Duration */}
        <span
          className="text-xs font-semibold shrink-0"
          style={{ color: '#736554' }}
        >
          {duration} min
        </span>

        {/* Expand toggle (only if exercises) */}
        {run.exercises && run.exercises.length > 0 && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-[10px] shrink-0 px-1.5 py-0.5 rounded-lg"
            style={{ color: '#736554', background: 'rgba(43,49,23,0.06)' }}
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
            <span style={{ color: '#4A5427' }}>✓</span>
          ) : (
            <span style={{ color: '#E3D2B4' }}>○</span>
          )}
        </button>
      </div>

      {/* Exercises list */}
      {expanded && run.exercises && run.exercises.length > 0 && (
        <div
          className="mt-2 pt-2 space-y-1"
          style={{ borderTop: '1px solid rgba(43,49,23,0.08)' }}
        >
          {run.exercises.map((ex, i) => (
            <div key={i} className="flex items-start gap-2 text-xs" style={{ color: '#736554' }}>
              <span style={{ color: '#8879E1', flexShrink: 0 }}>·</span>
              <span>{ex}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
