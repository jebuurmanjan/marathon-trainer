'use client'

import { useState, useEffect, useCallback } from 'react'
import { PlannedRun, StrengthWorkout, StrengthOverride, WorkoutCategory, WorkoutEquipment } from '@/types'

const CATEGORY_LABELS: Record<WorkoutCategory, string> = {
  core_stability: 'Core & Stability',
  legs:           'Legs',
  plyometrics:    'Plyometrics',
  upper_body:     'Upper Body',
}

interface WorkoutSwapModalProps {
  run:             PlannedRun
  planId:          string
  workouts:        StrengthWorkout[]
  currentOverride?: StrengthOverride
  onClose:         () => void
  onSwapped:       (override: StrengthOverride) => void
  onReset:         () => void
}

function WorkoutOption({
  workout,
  isSelected,
  onSelect,
}: {
  workout:    StrengthWorkout
  isSelected: boolean
  onSelect:   () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="rounded-xl px-4 py-3 transition-all"
      style={{
        background: isSelected ? 'rgba(var(--accent-rgb),0.08)' : 'var(--surface)',
        border: isSelected
          ? '1px solid rgba(var(--accent-rgb),0.30)'
          : '1px solid rgba(var(--tint),0.08)',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: 'var(--text-primary)' }}>
            {workout.name}
          </p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {/* Equipment pill */}
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={
                workout.equipment === 'gym'
                  ? { background: 'rgba(136,121,225,0.12)', color: 'var(--accent-violet)' }
                  : { background: 'rgba(74,222,128,0.12)', color: '#16a34a' }
              }
            >
              {workout.equipment === 'gym' ? 'Gym' : 'Home'}
            </span>
            {/* Category pill */}
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(var(--tint),0.08)', color: 'var(--text-secondary)' }}
            >
              {CATEGORY_LABELS[workout.category]}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
              {workout.duration_minutes} min
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Expand toggle */}
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{ color: 'var(--text-dim)', background: 'rgba(var(--tint),0.06)' }}
          >
            {expanded ? '▲' : '▼'}
          </button>
          {/* Select button */}
          <button
            onClick={onSelect}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={
              isSelected
                ? { background: 'var(--accent)', color: '#fff' }
                : { background: 'rgba(var(--accent-rgb),0.10)', color: 'var(--accent)' }
            }
          >
            {isSelected ? '✓ Selected' : 'Select'}
          </button>
        </div>
      </div>

      {/* Exercise list */}
      {expanded && (
        <div
          className="mt-2.5 pt-2.5 space-y-1"
          style={{ borderTop: '1px solid rgba(var(--tint),0.08)' }}
        >
          {workout.exercises.map((ex, i) => (
            <div key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-dim)' }}>
              <span style={{ color: 'var(--accent-violet)', flexShrink: 0 }}>·</span>
              <span>{ex}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function WorkoutSwapModal({
  run, planId, workouts, currentOverride, onClose, onSwapped, onReset,
}: WorkoutSwapModalProps) {
  const [equipmentFilter, setEquipmentFilter] = useState<WorkoutEquipment | 'all'>('all')
  const [categoryFilter,  setCategoryFilter]  = useState<WorkoutCategory | 'all'>('all')
  const [saving,          setSaving]          = useState(false)

  // Close on Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !saving) onClose()
  }, [onClose, saving])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  const visible = workouts.filter((w) =>
    (equipmentFilter === 'all' || w.equipment === equipmentFilter) &&
    (categoryFilter  === 'all' || w.category  === categoryFilter)
  )

  const dateLabel = new Date(run.date + 'T12:00:00Z').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  async function handleSelect(workout: StrengthWorkout) {
    if (saving) return
    setSaving(true)

    const override: StrengthOverride = {
      sessionDate:     run.date,
      weekNumber:      run.weekNumber,
      workoutId:       workout.id,
      workoutName:     workout.name,
      workoutCategory: workout.category,
      exercises:       workout.exercises,
      durationMinutes: workout.duration_minutes,
    }

    // Optimistic update
    onSwapped(override)

    try {
      const res = await fetch('/api/plan-strength-overrides', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          planId,
          sessionDate: run.date,
          weekNumber:  run.weekNumber,
          workoutId:   workout.id,
        }),
      })
      if (!res.ok) throw new Error('save failed')
    } catch {
      // Revert: restore previous override (or remove if there was none)
      if (currentOverride) {
        onSwapped(currentOverride)
      } else {
        onReset()
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (saving) return
    setSaving(true)

    // Optimistic
    onReset()

    try {
      await fetch('/api/plan-strength-overrides', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ planId, sessionDate: run.date }),
      })
    } catch {
      // Revert
      if (currentOverride) onSwapped(currentOverride)
    } finally {
      setSaving(false)
    }
  }

  const filterChipStyle = (active: boolean): React.CSSProperties => active
    ? { background: 'var(--accent)', color: '#fff' }
    : { background: 'var(--surface)', border: '1px solid rgba(var(--tint),0.10)', color: 'var(--text-secondary)' }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(16,24,40,0.60)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose() }}
    >
      {/* Panel */}
      <div
        className="w-full max-w-2xl mx-auto my-8 rounded-2xl flex flex-col"
        style={{
          background: 'var(--bg-base)',
          maxHeight: 'calc(100vh - 4rem)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-start justify-between shrink-0"
          style={{ borderBottom: '1px solid rgba(var(--tint),0.08)' }}
        >
          <div>
            <h2
              className="text-base font-semibold"
              style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: 'var(--text-primary)' }}
            >
              Choose workout
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{dateLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg"
            style={{ color: 'var(--text-muted)', background: 'var(--surface)' }}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div
          className="px-6 py-3 flex flex-wrap gap-2 shrink-0"
          style={{ borderBottom: '1px solid rgba(var(--tint),0.08)' }}
        >
          {/* Equipment */}
          <div className="flex gap-1.5">
            {(['all', 'home', 'gym'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setEquipmentFilter(v)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg capitalize"
                style={filterChipStyle(equipmentFilter === v)}
              >
                {v === 'all' ? 'All equipment' : v === 'home' ? 'Home' : 'Gym'}
              </button>
            ))}
          </div>
          <div className="w-px self-stretch" style={{ background: 'rgba(var(--tint),0.08)' }} />
          {/* Category */}
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'core_stability', 'legs', 'plyometrics', 'upper_body'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setCategoryFilter(v)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg"
                style={filterChipStyle(categoryFilter === v)}
              >
                {v === 'all' ? 'All categories' : CATEGORY_LABELS[v as WorkoutCategory]}
              </button>
            ))}
          </div>
        </div>

        {/* Workout list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {visible.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-dim)' }}>
              No workouts match the current filters.
            </p>
          ) : (
            visible.map((w) => (
              <WorkoutOption
                key={w.id}
                workout={w}
                isSelected={currentOverride?.workoutId === w.id}
                onSelect={() => handleSelect(w)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-between gap-3 shrink-0"
          style={{ borderTop: '1px solid rgba(var(--tint),0.08)' }}
        >
          {currentOverride ? (
            <button
              onClick={handleReset}
              disabled={saving}
              className="text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
              style={{ color: 'var(--text-dim)', background: 'rgba(var(--tint),0.06)' }}
            >
              Reset to default
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            disabled={saving}
            className="text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
            style={{ background: 'var(--surface)', border: '1px solid rgba(var(--tint),0.10)', color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
