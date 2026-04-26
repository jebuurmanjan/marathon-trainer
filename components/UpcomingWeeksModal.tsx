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

// ─── Type colours (matches RunRow) ───────────────────────────────────────────

const TYPE_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  easy:        { bg: 'rgba(74,84,39,0.10)',   color: 'var(--accent-green)',  dot: 'var(--accent-green)'  },
  quality:     { bg: 'rgba(238,107,23,0.12)', color: 'var(--accent)',        dot: 'var(--accent)'        },
  medium_long: { bg: 'rgba(136,121,225,0.12)',color: 'var(--accent-violet)', dot: 'var(--accent-violet)' },
  long:        { bg: 'rgba(136,121,225,0.12)',color: 'var(--accent-violet)', dot: 'var(--accent-violet)' },
  race:        { bg: 'rgba(238,107,23,0.12)', color: 'var(--accent)',        dot: 'var(--accent)'        },
  strength:    { bg: 'rgba(136,121,225,0.12)',color: 'var(--accent-violet)', dot: 'var(--accent-violet)' },
}

const RUN_TYPE_LABELS: Record<string, string> = {
  easy:        'Easy',
  quality:     'Quality',
  medium_long: 'Med Long',
  long:        'Long Run',
  race:        'Race',
  strength:    'Strength',
}

const DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isoToDisplayDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z')
  return String(d.getUTCDate())
}

function isToday(iso: string): boolean {
  return iso === new Date().toISOString().slice(0, 10)
}

/** Get all 7 ISO dates (Mon–Sun) for the week containing startDate */
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
  run:       PlannedRun
  actual?:   ActualRun
  editMode:  boolean
  dragId:    string
  isPast:    boolean
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
    opacity:   isDragging ? 0.4 : 1,
    transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
    cursor:    editMode ? 'grab' : 'default',
  }

  return (
    <div
      ref={setNodeRef}
      className="rounded-lg px-2 py-1.5 text-xs flex items-start gap-1.5 select-none"
      style={chipStyle}
      {...(editMode ? { ...listeners, ...attributes } : {})}
    >
      {editMode && (
        <span className="text-[10px] shrink-0 mt-0.5 cursor-grab" style={{ color: 'var(--text-muted)' }}>
          ⠿
        </span>
      )}
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0 mt-1"
        style={{ background: style.dot }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-0.5">
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-full shrink-0"
            style={{ background: style.bg, color: style.color }}
          >
            {RUN_TYPE_LABELS[run.type]}
          </span>
          {actual && <span style={{ color: 'var(--accent-green)', fontSize: 9 }}>✓</span>}
          {!actual && isPast && <span style={{ color: 'var(--accent)', fontSize: 9 }}>✗</span>}
        </div>
        <div className="truncate leading-tight" style={{ color: 'var(--text-primary)', fontSize: 10 }}>
          {run.description}
        </div>
        <div className="font-semibold mt-0.5" style={{ color: 'var(--text-dim)', fontSize: 10 }}>
          {run.type === 'strength'
            ? `${run.durationMinutes ?? 30} min`
            : `${run.targetDistanceKm} km`
          }
        </div>
      </div>
    </div>
  )
}

// ─── Drag Overlay Chip ────────────────────────────────────────────────────────

function DragOverlayChip({ run }: { run: PlannedRun }) {
  const style = TYPE_STYLE[run.type] ?? { bg: 'rgba(var(--tint),0.06)', color: 'var(--text-dim)', dot: 'var(--text-dim)' }
  return (
    <div
      className="rounded-lg px-2 py-1.5 text-xs flex items-start gap-1.5 shadow-lg"
      style={{
        background: 'var(--card-base)',
        border: '1px solid var(--border)',
        opacity: 0.95,
        cursor: 'grabbing',
        minWidth: 100,
      }}
    >
      <span className="text-[10px] shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>⠿</span>
      <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1" style={{ background: style.dot }} />
      <div className="flex-1 min-w-0">
        <span
          className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-full"
          style={{ background: style.bg, color: style.color }}
        >
          {RUN_TYPE_LABELS[run.type]}
        </span>
        <div className="truncate leading-tight mt-0.5 font-semibold" style={{ color: 'var(--text-dim)', fontSize: 10 }}>
          {run.type === 'strength' ? `${run.durationMinutes ?? 30} min` : `${run.targetDistanceKm} km`}
        </div>
      </div>
    </div>
  )
}

// ─── Day Column ───────────────────────────────────────────────────────────────

interface DayColumnProps {
  date:       string
  dayIndex:   number
  runs:       PlannedRun[]
  actuals:    ActualRun[]
  editMode:   boolean
  today:      boolean
  isActive:   boolean  // drag is hovering over this column
  weekStart:  string
}

function DayColumn({ date, dayIndex, runs, actuals, editMode, today, isActive, weekStart }: DayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: date, disabled: !editMode })
  const isPast = date < new Date().toISOString().slice(0, 10)

  return (
    <div
      ref={editMode ? setNodeRef : undefined}
      className="flex flex-col gap-1.5 min-h-[80px] rounded-lg p-1.5 transition-colors"
      style={{
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
      <div className="text-center mb-1">
        <div
          className="text-[9px] font-bold uppercase tracking-wider"
          style={{ color: today ? 'var(--accent)' : 'var(--text-muted)' }}
        >
          {DAY_NAMES[dayIndex]}
        </div>
        <div
          className={`text-xs font-semibold ${today ? 'w-5 h-5 rounded-full flex items-center justify-center mx-auto text-white' : ''}`}
          style={{
            color:      today ? '#fff' : 'var(--text-secondary)',
            background: today ? 'var(--accent)' : undefined,
            fontSize:   11,
          }}
        >
          {isoToDisplayDate(date)}
        </div>
      </div>

      {/* Run chips */}
      {runs.map((run) => {
        const actual = findActual(run, actuals)
        const dragId = `${run.date}::${run.type}`
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
  week:       Week
  actuals:    ActualRun[]
  editMode:   boolean
  isCurrent:  boolean
}

function WeekSection({ week, actuals, editMode, isCurrent }: WeekSectionProps) {
  const days = weekDays(week.startDate)
  const today = new Date().toISOString().slice(0, 10)

  // Group runs by their displayed date
  const runsByDay: Record<string, PlannedRun[]> = {}
  for (const day of days) runsByDay[day] = []
  for (const run of week.runs) {
    if (runsByDay[run.date]) runsByDay[run.date].push(run)
    else runsByDay[run.date] = [run]
  }

  const startLabel = new Date(week.startDate + 'T12:00:00Z')
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  const endLabel = new Date(week.endDate + 'T12:00:00Z')
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

  return (
    <div className="mb-8">
      {/* Week header */}
      <div className="flex items-center gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
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
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
            {startLabel} – {endLabel} · {week.targetKm} km
          </div>
        </div>
      </div>

      {/* 7-column grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((date, i) => (
          <DayColumn
            key={date}
            date={date}
            dayIndex={i}
            runs={runsByDay[date] ?? []}
            actuals={actuals}
            editMode={editMode}
            today={date === today}
            isActive={false}
            weekStart={week.startDate}
          />
        ))}
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
  weeks:             Week[]       // base weeks — no overrides applied
  actualRuns:        ActualRun[]
  currentWeek:       number
  overrides:         RunOverride[]
  onOverridesChange: (overrides: RunOverride[]) => void
}

export default function UpcomingWeeksModal({ onClose, planId, weeks, actualRuns, currentWeek, overrides, onOverridesChange }: Props) {
  const [editMode,  setEditMode]  = useState(false)
  const [activeRun, setActiveRun] = useState<PlannedRun | null>(null)

  // Escape key to close
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

  // Apply overrides to get displayed weeks
  const displayedWeeks = applyOverrides(weeks, overrides)

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function onDragStart(event: DragStartEvent) {
    const run = event.active.data.current?.run as PlannedRun | undefined
    setActiveRun(run ?? null)
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveRun(null)
    const { active, over } = event
    if (!over) return

    const newDate = over.id as string
    const [originalDate, runType] = (active.id as string).split('::')

    // Find which week this run originally belongs to
    const runWeek = weeks.find((w) =>
      w.runs.some((r) => r.date === originalDate && r.type === runType)
    )
    if (!runWeek) return

    // Block cross-week drops
    const targetWeek = weeks.find(
      (w) => newDate >= w.startDate && newDate <= w.endDate
    )
    if (!targetWeek || targetWeek.weekNumber !== runWeek.weekNumber) return

    // No-op if dropped on same date
    const currentOverride = overrides.find(
      (o) => o.originalDate === originalDate && o.runType === runType
    )
    const currentDate = currentOverride?.newDate ?? originalDate
    if (currentDate === newDate) return

    // Optimistic update
    const isReset = newDate === originalDate
    const prevOverrides = overrides

    if (isReset) {
      const next = overrides.filter(
        (o) => !(o.originalDate === originalDate && o.runType === runType)
      )
      onOverridesChange(next)
      try {
        await fetch('/api/plan-overrides', {
          method:  'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ planId, originalDate, runType }),
        })
      } catch {
        onOverridesChange(prevOverrides) // revert
      }
    } else {
      const without = overrides.filter(
        (o) => !(o.originalDate === originalDate && o.runType === runType)
      )
      const next = [...without, { originalDate, runType, newDate }]
      onOverridesChange(next)
      try {
        await fetch('/api/plan-overrides', {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ planId, originalDate, runType, newDate }),
        })
      } catch {
        onOverridesChange(prevOverrides) // revert
      }
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
        className="w-full max-w-5xl mx-4 my-8 rounded-2xl flex flex-col"
        style={{
          background: 'var(--bg-base)',
          maxHeight:  'calc(100vh - 4rem)',
          overflowY:  'hidden',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <h2
              className="text-lg font-semibold"
              style={{ fontFamily: 'Nohemi, Inter, sans-serif', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}
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
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={
                editMode
                  ? { background: 'var(--accent)', color: '#fff' }
                  : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }
              }
            >
              {editMode ? (
                <>✓ Done editing</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Edit schedule
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors"
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
            className="px-6 py-2.5 text-xs font-medium shrink-0"
            style={{ background: 'rgba(238,107,23,0.06)', borderBottom: '1px solid rgba(238,107,23,0.15)', color: 'var(--accent)' }}
          >
            ⠿ Drag trainings to a different day. Only within the same week.
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            {displayedWeeks.map((week) => (
              <WeekSection
                key={week.weekNumber}
                week={week}
                actuals={weekActuals(week)}
                editMode={editMode}
                isCurrent={week.weekNumber === currentWeek}
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
