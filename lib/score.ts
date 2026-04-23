import { Week, ActualRun, PlannedRun } from '@/types'

export interface WeekScore {
  total: number | null // null = no runs logged at all
  mileage: number      // 0–40
  pace: number         // 0–35
  hr: number           // 0–25 (12 = neutral when no HR data)
  hrHasData: boolean   // false = HR component was estimated at neutral
  isPartial: boolean   // current week still in progress
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function findActual(planned: PlannedRun, actualRuns: ActualRun[]): ActualRun | undefined {
  const pt = new Date(planned.date).getTime()
  return actualRuns.find(
    (a) => Math.abs(new Date(a.runDate).getTime() - pt) <= 86_400_000 * 1.5
  )
}

// ─── mileage (40 pts) ─────────────────────────────────────────────────────────
// Actual km / planned km, capped at 100 %. Over-running isn't penalised.

function scoreMileage(plannedKm: number, actualKm: number): number {
  if (plannedKm === 0) return 40
  return Math.round(Math.min(1, actualKm / plannedKm) * 40)
}

// ─── pace (35 pts) ───────────────────────────────────────────────────────────
// Compares actual pace vs target pace per completed run.
//   Easy runs (no pace target) → full points for completion
//   Quality/long runs with a target → scored on closeness:
//     ≤ ±5 %  → 100 %  (1.0)
//     ≤ ±15 % → linear drop to 50 % (0.5)
//     ≤ ±20 % → linear drop to 0    (0.0)

function scorePace(week: Week, actualRuns: ActualRun[]): number {
  const results: number[] = []
  for (const run of week.runs) {
    const actual = findActual(run, actualRuns)
    if (!actual) continue
    if (!run.targetPaceMinPerKm) {
      results.push(1.0) // easy run: reward completion
      continue
    }
    const frac = (actual.paceMinPerKm - run.targetPaceMinPerKm) / run.targetPaceMinPerKm
    const abs = Math.abs(frac)
    let s: number
    if (abs <= 0.05) s = 1.0
    else if (abs <= 0.15) s = 1.0 - ((abs - 0.05) / 0.10) * 0.5
    else s = Math.max(0, 0.5 - ((abs - 0.15) / 0.10) * 0.5)
    results.push(s)
  }
  if (results.length === 0) return 0
  return Math.round((results.reduce((a, b) => a + b, 0) / results.length) * 35)
}

// ─── HR efficiency (25 pts) ──────────────────────────────────────────────────
// Easy / long / medium_long: low HR is good (zone 2 target ≤ 145 bpm)
// Quality / race: higher HR is expected and rewards working hard (≥ 160 bpm)
// Returns null when no run has HR data (WeekCard shows neutral placeholder).

function scoreHR(week: Week, actualRuns: ActualRun[]): number | null {
  const results: number[] = []
  for (const run of week.runs) {
    const actual = findActual(run, actualRuns)
    if (!actual?.averageHeartrate) continue
    const hr = actual.averageHeartrate
    let s: number
    if (run.type === 'easy' || run.type === 'long' || run.type === 'medium_long') {
      if (hr <= 145)       s = 1.0
      else if (hr <= 155)  s = 1.0 - ((hr - 145) / 10) * 0.5
      else                 s = Math.max(0, 0.5 - ((hr - 155) / 20) * 0.5)
    } else {
      // quality / race — reward effort
      if (hr >= 160)       s = 1.0
      else if (hr >= 150)  s = 0.5 + ((hr - 150) / 10) * 0.5
      else                 s = Math.max(0, ((hr - 130) / 20) * 0.5)
    }
    results.push(s)
  }
  if (results.length === 0) return null
  return Math.round((results.reduce((a, b) => a + b, 0) / results.length) * 25)
}

// ─── public API ──────────────────────────────────────────────────────────────

export function calcWeekScore(
  week: Week,
  actualRuns: ActualRun[],
  isCurrentWeek: boolean,
): WeekScore {
  if (actualRuns.length === 0) {
    return { total: null, mileage: 0, pace: 0, hr: 0, hrHasData: false, isPartial: isCurrentWeek }
  }

  const actualKm = actualRuns.reduce((s, r) => s + r.distanceKm, 0)
  const mileage  = scoreMileage(week.targetKm, actualKm)
  const pace     = scorePace(week, actualRuns)
  const hrRaw    = scoreHR(week, actualRuns)
  const hr       = hrRaw ?? 12   // 12/25 ≈ neutral 50 % when no HR data

  return {
    total: mileage + pace + hr,
    mileage,
    pace,
    hr,
    hrHasData: hrRaw !== null,
    isPartial: isCurrentWeek,
  }
}

export function scoreColor(total: number): string {
  if (total >= 85) return '#4A5427'  // green — Excellent
  if (total >= 65) return '#EE6B17'  // orange — Good
  if (total >= 40) return '#A08B6E'  // amber — Partial
  return '#736554'                   // dim — Missed
}

export function scoreLabel(total: number): string {
  if (total >= 85) return 'Excellent'
  if (total >= 65) return 'Good'
  if (total >= 40) return 'Partial'
  return 'Missed'
}
