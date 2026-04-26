'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Week, PlannedRun, ActualRun } from '@/types'
import { RunOverride, applyOverrides } from '@/lib/training-plan'

// ─── Type colours ─────────────────────────────────────────────────────────────

const TYPE_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  easy:        { bg: 'rgba(74,84,39,0.10)',   color: 'var(--accent-green)',  dot: 'var(--accent-green)'  },
  quality:     { bg: 'rgba(238,107,23,0.12)', color: 'var(--accent)',        dot: 'var(--accent)'        },
  medium_long: { bg: 'rgba(136,121,225,0.12)',color: 'var(--accent-violet)', dot: 'var(--accent-violet)' },
  long:        { bg: 'rgba(136,121,225,0.12)',color: 'var(--accent-violet)', dot: 'var(--accent-violet)' },
  race:        { bg: 'rgba(238,107,23,0.12)', color: 'var(--accent)',        dot: 'var(--accent)'        },
  strength:    { bg: 'rgba(136,121,225,0.12)',color: 'var(--accent-violet)', dot: 'var(--accent-violet)' },
}

// Abbreviated labels that fit in narrow chips
const CHIP_LABELS: Record<string, string> = {
  easy:        'Easy',
  quality:     'Quality',
  medium_long: 'Med Long',
  long:        'Long',
  race:        'Race',
  strength:    'Strength',
}

const DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isoToDisplayDate(iso: string): string {
  return String(new Date(iso + 'T12:00:00Z').getUTCDate())
}

function weekDays(startDate: string): string[] {
  const days: string[] = []
  const start = new Date(startDate + 'T12:00:00Z')
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setUTCDate(d.getUTCDate() + i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

function findActual(run: PlannedRun, actuals: ActualRun[]): ActualRun | undefined {
  const pt = new Date(run.date).getTime()
  return actuals.find((a) => Math.abs(new Date(a.runDate).getTime() - pt) <= 86_400_000 * 1.5)
}

// ─── Run Chip ─────────────────────────────────────────────────────────────────

interface ChipProps {
  run:          PlannedRun
  actual?:      ActualRun
  editMode:     boolean
  dragId:       string   // always encodes the ORIGINAL date
  isPast:       boolean
}

function RunChip({ run, actual, editMode, dragId, isPast }: ChipProps) {
  const style = TYPE_STYLE[run.type] ?? { bg: 'rgba(var(--tint),0.06)', color: 'var(--text-dim)', dot: 'var(--text-dim)' }

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id:       dragId,
    disabled: !editMode,
    data:     { run },
  })

  const chipStyle: React.CSSProperties = {
    background: actual  ? 'var(--card-done)'
               : isPast ? 'var(--card-missed)'
               :           'var(--card-base)',
    border: actual  ? '1px solid var(--card-done-border)'
           : isPast ? '1px solid var(--card-missed-border)'
           :           '1px solid var(--border)',
    opacity:   isDragging ? 0.35 : 1,
    transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
    cursor:    editMode ? 'grab' : 'default',
  }

  const stat = run.type === 'strength'
    ? `${run.durationMinutes ?? 30}m`
    : `${run.targetDistanceKm}k`

  return (
    <div
      ref={setNodeRef}
      className="rounded-lg p-1.5 text-xs select-none"
      style={chipStyle}
      {...(editMode ? { ...listeners, ...attributes } : {})}
    >
      {/* Top row: handle (edit) + dot + badge + status */}
      <div className="flex items-center gap-1">
        {editMode && (
          <span style={{ color: 'var(--text-muted)', fontSize: 9, lineHeight: 1 }}>⠿</span>
        )}
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: style.dot }} />
        <span
          className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-full truncate"
          style={{ background: style.bg, color: style.color }}
        >
          {CHIP_LABELS[run.type]}
        </span>
        {actual && <span style={{ color: 'var(--accent-green)', fontSize: 8 }}>✓</span>}
        {!actual && isPast && <span style={{ color: 'var(--accent)', fontSize: 8 }}>✗</span>}
      </div>
      {/* Stat row */}
      <div className="mt-1 font-semibold" style={{ color: 'var(--text-dim)', fontSize: 10 }}>
        {stat}
      </div>
    </div>
  )
}

// ─── Drag Overlay Chip ────────────────────────────────────────────────────────

function DragOverlayChip({ run }: { run: PlannedRun }) {
  const style = TYPE_STYLE[run.type] ?? { bg: 'rgba(var(--tint),0.06)', color: 'var(--text-dim)', dot: 'var(--text-dim)' }
  const stat = run.type === 'strength'
    ? `${run.durationMinutes ?? 30}m`
    : `${run.targetDistanceKm}k`
  return (
    <div
      className="rounded-lg p-1.5 text-xs shadow-lg"
      style={{
        background: 'var(--card-base)',
        border: '1px solid var(--border)',
        opacity: 0.95,
        cursor: 'grabbing',
        minWidth: 64,
      }}
    >
      <div className="flex items-center gap-1">
        <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>⠿</span>
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: style.dot }} />
        <span
          className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-full"
          style={{ background: style.bg, color: style.color }}
        >
          {CHIP_LABELS[run.type]}
        </span>
      </div>
      <div className="mt-1 font-semibold" style={{ color: 'var(--text-dim)', fontSize: 10 }}>
        {stat}
      </div>
    </div>
  )
}

// ─── Day Column ───────────────────────────────────────────────────────────────

interface DayColumnProps {
  date:      string
  dayIndex:  number
  runs:      PlannedRun[]           // displayed runs (overrides already applied)
  actuals:   ActualRun[]
  editMode:  boolean
  today:     boolean
  overrides: RunOverride[]          // needed to look up original date per run
}

function DayColumn({ date, dayIndex, runs, actuals, editMode, today, overrides }: DayColumnProps) {
  // Always register the element; disabled prop controls droppability
  const { setNodeRef, isOver } = useDroppable({ id: date, disabled: !editMode })
  const isPast = date < new Date().toISOString().slice(0, 10)

  return (
    <div
      ref={setNodeRef}                          // always registered — fixes drop detection
      className="flex flex-col gap-1 rounded-lg p-1 transition-colors"
      style={{
        minHeight: 64,
        background: isOver && editMode
          ? 'rgba(238,107,23,0.08)'
          : today
          ? 'var(--surface)'
          : 'transparent',
        border: isOver && editMode
          ? '1px dashed rgba(238,107,23,0.40)'
          : today
          ? '1px solid var(--border)'
          : '1px solid transparent',
      }}
    >
      {/* Day header */}
      <div className="text-center mb-0.5">
        <div
          className="text-[9px] font-bold uppercase tracking-wider"
          style={{ color: today ? 'var(--accent)' : 'var(--text-muted)' }}
        >
          {DAY_NAMES[dayIndex]}
        </div>
        <div
          className={today ? 'w-5 h-5 rounded-full flex items-center justify-center mx-auto text-white' : ''}
          style={{
            fontSize:   11,
            fontWeight: 600,
            color:      today ? '#fff' : 'var(--text-secondary)',
            background: today ? 'var(--accent)' : undefined,
          }}
        >
          {isoToDisplayDate(date)}
        </div>
      </div>

      {/* Run chips */}
      {runs.map((run) => {
        const actual = findActual(run, actuals)
        // Find the original date: if this run has been moved, look up the override
        // that set newDate = run.date for this runType. Otherwise run.date IS the original.
        const override = overrides.find(
          (o) => o.newDate === run.date && o.runType === run.type
        )
        const originalDate = override?.originalDate ?? run.date
        const dragId = `${originalDate}::${run.type}`
        return (
          <RunChip
            key={dragId}
            run={run}
            actual={actual}
            editMode={editMode}
            dragId={dragId}
            isPast={isPast}
          />
        )
      })}
    </div>
  )
}

// ─── Week Section ─────────────────────────────────────────────────────────────

interface WeekSectionProps {
  week:      Week          // displayed week (overrides already applied)
  actuals:   ActualRun[]
  editMode:  boolean
  isCurrent: boolean
  overrides: RunOverride[]
}

function WeekSection({ week, actuals, editMode, isCurrent, overrides }: WeekSectionProps) {
  const days = weekDays(week.startDate)
  const today = new Date().toISOString().slice(0, 10)

  // Group displayed runs by their current date
  const runsByDay: Record<string, PlannedRun[]> = {}
  for (const day of days) runsByDay[day] = []
  for (const run of week.runs) {
    if (runsByDay[run.date]) {
      runsByDay[run.date].push(run)
    } else {
      // Run was moved outside the standard 7 days — still show it
      runsByDay[run.date] = [run]
    }
  }

  const startLabel = new Date(week.startDate + 'T12:00:00Z')
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  const endLabel = new Date(week.endDate + 'T12:00:00Z')
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

  return (
    <div className="mb-8">
      {/* Week header */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-sm font-bold"
          style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: 'var(--text-primary)' }}
        >
          Week {week.weekNumber}
        </span>
        {isCurrent && (
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(238,107,23,0.12)', color: 'var(--accent)' }}
          >
            Current
          </span>
        )}
        {week.isCutback && (
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(136,121,225,0.12)', color: 'var(--accent-violet)' }}
          >
            Cutback
          </span>
        )}
        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
          {startLabel} – {endLabel} · {week.targetKm} km
        </span>
      </div>

      {/* 7-column grid — horizontally scrollable on mobile */}
      <div className="overflow-x-auto -mx-6 px-6 pb-1">
        <div className="grid grid-cols-7 gap-1" style={{ minWidth: 460 }}>
          {days.map((date, i) => (
            <DayColumn
              key={date}
              date={date}
              dayIndex={i}
              runs={runsByDay[date] ?? []}
              actuals={actuals}
              editMode={editMode}
              today={date === today}
              overrides={overrides}
            />
          ))}
        </div>
      </div>

      {/* Week notes */}
      {week.notes && (
        <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
          {week.notes}
        </p>
      )}
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface Props {
  onClose:           () => void
  planId:            string
  weeks:             Week[]         // base weeks — no overrides applied
  actualRuns:        ActualRun[]
  currentWeek:       number
  overrides:         RunOverride[]
  onOverridesChange: (overrides: RunOverride[]) => void
}

export default function UpcomingWeeksModal({
  onClose, planId, weeks, actualRuns, currentWeek, overrides, onOverridesChange,
}: Props) {
  const [editMode,  setEditMode]  = useState(false)
  const [activeRun, setActiveRun] = useState<PlannedRun | null>(null)

  // Escape key to close / exit edit mode
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (editMode) setEditMode(false)
        else onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, editMode])

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Apply overrides to base weeks for display
  const displayedWeeks = applyOverrides(weeks, overrides)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function onDragStart(event: DragStartEvent) {
    setActiveRun((event.active.data.current?.run as PlannedRun | undefined) ?? null)
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveRun(null)
    const { active, over } = event
    if (!over) return

    const newDate = over.id as string
    // active.id is always `${originalDate}::${runType}` — original date, never the moved date
    const [originalDate, runType] = (active.id as string).split('::')

    // Validate: original run must exist in base weeks
    const runWeek = weeks.find((w) =>
      w.runs.some((r) => r.date === originalDate && r.type === runType)
    )
    if (!runWeek) return

    // Validate: target date must be in the same week
    const targetWeek = weeks.find(
      (w) => newDate >= w.startDate && newDate <= w.endDate
    )
    if (!targetWeek || targetWeek.weekNumber !== runWeek.weekNumber) return

    // No-op: dropped on the date where the run currently sits
    const existingOverride = overrides.find(
      (o) => o.originalDate === originalDate && o.runType === runType
    )
    const currentDate = existingOverride?.newDate ?? originalDate
    if (currentDate === newDate) return

    const prevOverrides = overrides
    const isReset = newDate === originalDate

    if (isReset) {
      // Dropped back on original date — remove override
      const next = overrides.filter(
        (o) => !(o.originalDate === originalDate && o.runType === runType)
      )
      onOverridesChange(next)
      try {
        await fetch('/api/plan-overrides', {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId, originalDate, runType }),
        })
      } catch { onOverridesChange(prevOverrides) }
    } else {
      // Moved to a new date — upsert override
      const without = overrides.filter(
        (o) => !(o.originalDate === originalDate && o.runType === runType)
      )
      const next = [...without, { originalDate, runType, newDate }]
      onOverridesChange(next)
      try {
        await fetch('/api/plan-overrides', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId, originalDate, runType, newDate }),
        })
      } catch { onOverridesChange(prevOverrides) }
    }
  }

  const weekActuals = (week: Week) =>
    actualRuns.filter((r) => r.runDate >= week.startDate && r.runDate <= week.endDate)

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-start overflow-hidden"
      style={{ background: 'rgba(30,22,17,0.60)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-3xl mx-4 my-8 rounded-2xl flex flex-col"
        style={{
          background: 'var(--bg-base)',
          maxHeight:  'calc(100vh - 4rem)',
          overflowY:  'hidden',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <h2
              className="text-base font-semibold"
              style={{ fontFamily: 'Nohemi, Inter, sans-serif', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}
            >
              Upcoming weeks
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
              This week and next
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditMode((e) => !e)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={
                editMode
                  ? { background: 'var(--accent)', color: '#fff' }
                  : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }
              }
            >
              {editMode ? (
                <>✓ Done</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Edit schedule
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)', background: 'var(--surface)' }}
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Edit mode hint */}
        {editMode && (
          <div
            className="px-5 py-2 text-xs font-medium shrink-0"
            style={{ background: 'rgba(238,107,23,0.06)', borderBottom: '1px solid rgba(238,107,23,0.15)', color: 'var(--accent)' }}
          >
            ⠿ Drag trainings to a different day within the same week.
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            {displayedWeeks.map((week) => (
              <WeekSection
                key={week.weekNumber}
                week={week}
                actuals={weekActuals(week)}
                editMode={editMode}
                isCurrent={week.weekNumber === currentWeek}
                overrides={overrides}
              />
            ))}
            <DragOverlay>
              {activeRun ? <DragOverlayChip run={activeRun} /> : null}
            </DragOverlay>
          </DndContext>

          {weeks.length === 0 && (
            <div className="text-center py-20 text-sm" style={{ color: 'var(--text-dim)' }}>
              No upcoming weeks found.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
