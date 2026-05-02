'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Week, PlannedRun, ActualRun } from '@/types'
import { RunOverride, applyOverrides } from '@/lib/training-plan'

// ─── Type styles ──────────────────────────────────────────────────────────────

const TYPE_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  easy:        { bg: 'rgba(47,148,97,0.10)',    color: 'var(--accent-green)',  dot: 'var(--accent-green)'  },
  tempo:       { bg: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)',  dot: 'var(--accent)'        },
  interval:    { bg: 'rgba(251,188,85,0.18)',   color: 'var(--color-warning)',dot: 'var(--color-warning)' },
  quality:     { bg: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)',  dot: 'var(--accent)'        }, // legacy
  medium_long: { bg: 'rgba(136,121,225,0.12)', color: 'var(--accent-violet)',dot: 'var(--accent-violet)' },
  long:        { bg: 'rgba(136,121,225,0.12)', color: 'var(--accent-violet)',dot: 'var(--accent-violet)' },
  race:        { bg: 'rgba(243,65,65,0.10)',    color: 'var(--color-error)',  dot: 'var(--color-error)'   },
  strength:    { bg: 'rgba(136,121,225,0.12)', color: 'var(--accent-violet)',dot: 'var(--accent-violet)' },
}

const TYPE_LABELS: Record<string, string> = {
  easy:        'Easy',
  tempo:       'Tempo',
  interval:    'Interval',
  quality:     'Tempo',       // legacy
  medium_long: 'Mid-Long',
  long:        'Long Run',
  race:        'Race',
  strength:    'Strength',
}

const DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isoToDate(iso: string): string {
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

function getOriginalDate(run: PlannedRun, overrides: RunOverride[]): string {
  const o = overrides.find((o) => o.newDate === run.date && o.runType === run.type)
  return o ? o.originalDate : run.date
}

// ─── Run chip (used in both layouts) ─────────────────────────────────────────

interface ChipProps {
  run:      PlannedRun
  actual?:  ActualRun
  editMode: boolean
  dragId:   string        // always originalDate::type
  isPast:   boolean
  compact?: boolean       // true = grid column, false = agenda row
}

function RunChip({ run, actual, editMode, dragId, isPast, compact = false }: ChipProps) {
  const style = TYPE_STYLE[run.type] ?? { bg: 'rgba(var(--tint),0.06)', color: 'var(--text-dim)', dot: 'var(--text-dim)' }

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId, disabled: !editMode, data: { run },
  })

  const stat = run.type === 'strength'
    ? `${run.durationMinutes ?? 30} min`
    : `${run.targetDistanceKm} km`

  const chipStyle: React.CSSProperties = {
    background: actual ? 'var(--card-done)' : isPast ? 'var(--card-missed)' : 'var(--card-base)',
    border:     actual ? '1px solid var(--card-done-border)' : isPast ? '1px solid var(--card-missed-border)' : '1px solid var(--border)',
    opacity:    isDragging ? 0.35 : 1,
    transform:  transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
  }

  // Drag handle — listeners live here only so the rest of the card scrolls freely on touch
  const handle = editMode ? (
    <span
      {...listeners}
      style={{ touchAction: 'none', cursor: 'grab', color: 'var(--text-muted)', fontSize: compact ? 9 : 14, lineHeight: 1, userSelect: 'none', flexShrink: 0 }}
    >
      ⠿
    </span>
  ) : null

  if (compact) {
    // Grid column chip — badge + stat + truncated description
    return (
      <div
        ref={setNodeRef}
        className="rounded-lg p-1.5 text-xs select-none"
        style={chipStyle}
        {...(editMode ? attributes : {})}
      >
        <div className="flex items-center gap-1 flex-wrap">
          {handle}
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: style.dot }} />
          <span
            className="text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-full"
            style={{ background: style.bg, color: style.color }}
          >
            {TYPE_LABELS[run.type]}
          </span>
          {actual && <span style={{ color: 'var(--accent-green)', fontSize: 8 }}>✓</span>}
          {!actual && isPast && <span style={{ color: 'var(--accent)', fontSize: 8 }}>✗</span>}
        </div>
        <div className="mt-1 font-semibold" style={{ color: 'var(--text-dim)', fontSize: 10 }}>{stat}</div>
        {run.description && (
          <div className="mt-0.5 leading-snug" style={{ color: 'var(--text-secondary)', fontSize: 9 }}>
            {run.description}
          </div>
        )}
      </div>
    )
  }

  // Agenda row chip — wider, full description visible
  return (
    <div
      ref={setNodeRef}
      className="rounded-xl px-3 py-2.5 text-xs select-none flex items-start gap-2.5"
      style={{ ...chipStyle, minWidth: 0 }}
      {...(editMode ? attributes : {})}
    >
      {handle}
      <span className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: style.dot }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0"
            style={{ background: style.bg, color: style.color }}
          >
            {TYPE_LABELS[run.type]}
          </span>
          <span className="font-semibold shrink-0" style={{ color: 'var(--text-dim)', fontSize: 11 }}>{stat}</span>
          {actual && <span style={{ color: 'var(--accent-green)', fontSize: 10 }}>✓</span>}
          {!actual && isPast && <span style={{ color: 'var(--accent)', fontSize: 10 }}>✗</span>}
        </div>
        {run.description && (
          <div className="leading-snug mt-0.5" style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
            {run.description}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Drag overlay chip ────────────────────────────────────────────────────────

function DragOverlayChip({ run }: { run: PlannedRun }) {
  const style = TYPE_STYLE[run.type] ?? { bg: 'rgba(var(--tint),0.06)', color: 'var(--text-dim)', dot: 'var(--text-dim)' }
  const stat = run.type === 'strength' ? `${run.durationMinutes ?? 30} min` : `${run.targetDistanceKm} km`
  return (
    <div
      className="rounded-xl px-3 py-2.5 text-xs shadow-lg flex items-center gap-2"
      style={{ background: 'var(--card-base)', border: '1px solid var(--border)', opacity: 0.95, cursor: 'grabbing', minWidth: 120 }}
    >
      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>⠿</span>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: style.dot }} />
      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: style.bg, color: style.color }}>
        {TYPE_LABELS[run.type]}
      </span>
      <span className="font-semibold" style={{ color: 'var(--text-dim)', fontSize: 11 }}>{stat}</span>
    </div>
  )
}

// ─── Agenda day row (mobile) ──────────────────────────────────────────────────

interface DayRowProps {
  date:      string
  dayIndex:  number
  runs:      PlannedRun[]
  actuals:   ActualRun[]
  editMode:  boolean
  today:     boolean
  overrides: RunOverride[]
}

function DayRow({ date, dayIndex, runs, actuals, editMode, today, overrides }: DayRowProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `mobile::${date}`, disabled: !editMode })
  const isPast = date < new Date().toISOString().slice(0, 10)

  return (
    <div
      ref={setNodeRef}
      className="flex gap-3 px-3 py-3 transition-colors"
      style={{
        borderBottom: '1px solid var(--border)',
        background:   isOver && editMode ? 'rgba(var(--accent-rgb),0.05)' : 'transparent',
        // Fixed-width left accent — never shifts content
        boxShadow:    isOver && editMode ? 'inset 3px 0 0 var(--accent)' : 'none',
      }}
    >
      {/* Day label */}
      <div className="w-12 shrink-0 pt-0.5">
        <div
          className="text-[9px] font-bold uppercase tracking-wider"
          style={{ color: today ? 'var(--accent)' : 'var(--text-muted)' }}
        >
          {DAY_NAMES[dayIndex]}
        </div>
        <div
          className={`text-sm font-semibold leading-tight ${today ? 'w-6 h-6 rounded-full flex items-center justify-center text-white text-xs' : ''}`}
          style={{
            color:      today ? '#fff' : 'var(--text-secondary)',
            background: today ? 'var(--accent)' : undefined,
          }}
        >
          {isoToDate(date)}
        </div>
      </div>

      {/* Runs or rest */}
      <div className="flex-1 flex flex-col gap-1.5">
        {runs.length === 0 ? (
          <div className="py-2 text-xs" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Rest day</div>
        ) : (
          runs.map((run) => {
            const actual = findActual(run, actuals)
            const originalDate = getOriginalDate(run, overrides)
            const dragId = `${originalDate}::${run.type}`
            return (
              <RunChip
                key={dragId}
                run={run}
                actual={actual}
                editMode={editMode}
                dragId={dragId}
                isPast={isPast}
                compact={false}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── Calendar day column (desktop) ───────────────────────────────────────────

interface DayColumnProps {
  date:      string
  dayIndex:  number
  runs:      PlannedRun[]
  actuals:   ActualRun[]
  editMode:  boolean
  today:     boolean
  overrides: RunOverride[]
}

function DayColumn({ date, dayIndex, runs, actuals, editMode, today, overrides }: DayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: date, disabled: !editMode })
  const isPast = date < new Date().toISOString().slice(0, 10)

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col gap-1 rounded-lg p-1 transition-colors"
      style={{
        minHeight: 80,
        background: isOver && editMode ? 'rgba(var(--accent-rgb),0.08)' : today ? 'var(--surface)' : 'transparent',
        border: isOver && editMode ? '1px dashed rgba(var(--accent-rgb),0.40)' : today ? '1px solid var(--border)' : '1px solid transparent',
      }}
    >
      {/* Day header */}
      <div className="text-center mb-0.5">
        <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: today ? 'var(--accent)' : 'var(--text-muted)' }}>
          {DAY_NAMES[dayIndex]}
        </div>
        <div
          className={today ? 'w-5 h-5 rounded-full flex items-center justify-center mx-auto text-white' : ''}
          style={{ fontSize: 11, fontWeight: 600, color: today ? '#fff' : 'var(--text-secondary)', background: today ? 'var(--accent)' : undefined }}
        >
          {isoToDate(date)}
        </div>
      </div>

      {runs.map((run) => {
        const actual = findActual(run, actuals)
        const originalDate = getOriginalDate(run, overrides)
        const dragId = `${originalDate}::${run.type}`
        return (
          <RunChip key={dragId} run={run} actual={actual} editMode={editMode} dragId={dragId} isPast={isPast} compact />
        )
      })}
    </div>
  )
}

// ─── Week section ─────────────────────────────────────────────────────────────

interface WeekSectionProps {
  week:      Week
  actuals:   ActualRun[]
  editMode:  boolean
  isCurrent: boolean
  overrides: RunOverride[]
  isMobile:  boolean
}

function WeekSection({ week, actuals, editMode, isCurrent, overrides, isMobile }: WeekSectionProps) {
  const days = weekDays(week.startDate)
  const today = new Date().toISOString().slice(0, 10)

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
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-bold" style={{ fontFamily: 'Nohemi, Inter, sans-serif', color: 'var(--text-primary)' }}>
          Week {week.weekNumber}
        </span>
        {isCurrent && (
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)' }}>
            Current
          </span>
        )}
        {week.isCutback && (
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(136,121,225,0.12)', color: 'var(--accent-violet)' }}>
            Cutback
          </span>
        )}
        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
          {startLabel} – {endLabel} · {week.targetKm} km
        </span>
      </div>

      {isMobile ? (
        /* ── Agenda list (mobile) ── */
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          {days.map((date, i) => (
            <DayRow
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
      ) : (
        /* ── Calendar grid (desktop) ── */
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
              overrides={overrides}
            />
          ))}
        </div>
      )}

      {/* Week notes */}
      {week.notes && (
        <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
          {week.notes}
        </p>
      )}
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface Props {
  onClose:           () => void
  planId:            string
  weeks:             Week[]
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
  const [isMobile,  setIsMobile]  = useState(false)

  // Detect viewport
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Escape key
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

  const displayedWeeks = applyOverrides(weeks, overrides)

  const sensors = useSensors(
    // Mouse / stylus — activate after moving 8px
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // Touch — require a 200ms press on the handle before drag starts,
    // so normal scroll gestures on the card body pass through untouched
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  function onDragStart(event: DragStartEvent) {
    setActiveRun((event.active.data.current?.run as PlannedRun | undefined) ?? null)
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveRun(null)
    const { active, over } = event
    if (!over) return

    // Mobile droppable IDs are prefixed with "mobile::"
    const rawOverId = over.id as string
    const newDate = rawOverId.startsWith('mobile::') ? rawOverId.slice(8) : rawOverId

    const [originalDate, runType] = (active.id as string).split('::')

    const runWeek = weeks.find((w) =>
      w.runs.some((r) => r.date === originalDate && r.type === runType)
    )
    if (!runWeek) return

    const targetWeek = weeks.find((w) => newDate >= w.startDate && newDate <= w.endDate)
    if (!targetWeek || targetWeek.weekNumber !== runWeek.weekNumber) return

    const existingOverride = overrides.find(
      (o) => o.originalDate === originalDate && o.runType === runType
    )
    const currentDate = existingOverride?.newDate ?? originalDate
    if (currentDate === newDate) return

    const prevOverrides = overrides
    const isReset = newDate === originalDate

    if (isReset) {
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
      const without = overrides.filter(
        (o) => !(o.originalDate === originalDate && o.runType === runType)
      )
      onOverridesChange([...without, { originalDate, runType, newDate }])
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
    /* Full-screen panel — no backdrop, no margins */
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 shrink-0"
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
              <>✓ Done</>
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
          className="px-5 py-2 text-xs font-medium shrink-0"
          style={{ background: 'rgba(var(--accent-rgb),0.06)', borderBottom: '1px solid rgba(var(--accent-rgb),0.15)', color: 'var(--accent)' }}
        >
          ⠿ Drag trainings to a different day within the same week.
        </div>
      )}

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-5 py-6">
          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            {displayedWeeks.map((week) => (
              <WeekSection
                key={week.weekNumber}
                week={week}
                actuals={weekActuals(week)}
                editMode={editMode}
                isCurrent={week.weekNumber === currentWeek}
                overrides={overrides}
                isMobile={isMobile}
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
