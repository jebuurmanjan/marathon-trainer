export type Phase = 'base' | 'build' | 'peak' | 'sharpen' | 'taper'
export type RunType = 'easy' | 'quality' | 'medium_long' | 'long' | 'race' | 'strength'

export interface PlannedRun {
  weekNumber:         number
  phase:              Phase
  date:               string          // ISO YYYY-MM-DD
  dayOfWeek:          string          // 'Tuesday', 'Thursday', etc.
  type:               RunType
  targetDistanceKm:   number          // 0 for strength sessions
  targetPaceMinPerKm?: number         // undefined = easy / not applicable
  description:        string
  isOptional?:        boolean         // 4th run in 3-run plans
  // Strength-specific
  durationMinutes?:   number
  exercises?:         string[]        // e.g. ["Glute Bridge — 3×15", ...]
}

export interface Week {
  weekNumber: number
  phase:      Phase
  startDate:  string   // ISO YYYY-MM-DD (Monday)
  endDate:    string   // ISO YYYY-MM-DD (Sunday)
  targetKm:   number   // running km only (strength sessions excluded)
  notes:      string
  runs:       PlannedRun[]
  isCutback:  boolean
}

export interface ActualRun {
  id:                number
  stravaActivityId:  string
  runDate:           string         // ISO YYYY-MM-DD
  distanceKm:        number
  movingTimeSeconds: number
  paceMinPerKm:      number
  averageHeartrate?: number
  maxHeartrate?:     number
  name:              string
}

export interface User {
  id:              string
  stravaId:        number
  name:            string
  profilePhotoUrl?: string
}

export interface Suggestion {
  id:          number
  weekNumber:  number
  suggestion:  string
  generatedAt: string
}

export interface WeekProgress {
  weekNumber:    number
  plannedKm:     number
  actualKm:      number
  plannedRuns:   number
  completedRuns: number
  runs:          PlannedRun[]
  actualRuns:    ActualRun[]
}
