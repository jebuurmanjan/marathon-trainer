export type Phase = 'base' | 'build' | 'peak' | 'sharpen' | 'taper'
export type RunType = 'easy' | 'quality' | 'medium_long' | 'long' | 'race'

export interface PlannedRun {
  weekNumber: number
  phase: Phase
  date: string          // ISO YYYY-MM-DD
  dayOfWeek: string     // 'Tuesday', 'Thursday', etc.
  type: RunType
  targetDistanceKm: number
  targetPaceMinPerKm?: number   // undefined = easy (no target pace)
  description: string
}

export interface Week {
  weekNumber: number
  phase: Phase
  startDate: string   // ISO YYYY-MM-DD (Monday)
  endDate: string     // ISO YYYY-MM-DD (Sunday)
  targetKm: number
  notes: string
  runs: PlannedRun[]
  isCutback: boolean
}

export interface ActualRun {
  id: number
  stravaActivityId: string
  runDate: string         // ISO YYYY-MM-DD
  distanceKm: number
  movingTimeSeconds: number
  paceMinPerKm: number
  averageHeartrate?: number
  maxHeartrate?: number
  name: string
}

export interface User {
  id: string
  stravaId: number
  name: string
  profilePhotoUrl?: string
}

export interface Suggestion {
  id: number
  weekNumber: number
  suggestion: string
  generatedAt: string
}

export interface WeekProgress {
  weekNumber: number
  plannedKm: number
  actualKm: number
  plannedRuns: number
  completedRuns: number
  runs: PlannedRun[]
  actualRuns: ActualRun[]
}
