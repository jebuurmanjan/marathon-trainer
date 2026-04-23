import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase'
import { getActualRuns, formatPace } from '@/lib/strava'
import { trainingPlan, getCurrentWeekNumber, formatPaceDisplay, PACES } from '@/lib/training-plan'
import { PlannedRun, ActualRun } from '@/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// POST /api/suggestions — generate a new AI coaching suggestion
export async function POST() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const currentWeek = getCurrentWeekNumber()
  if (currentWeek < 1 || currentWeek > 26) {
    return NextResponse.json({ error: 'Plan not active' }, { status: 400 })
  }

  // Gather context: current week + last 2 weeks actual runs
  const lookbackWeek = Math.max(1, currentWeek - 2)
  const planWeeks = trainingPlan.slice(lookbackWeek - 1, currentWeek)

  const startDate = planWeeks[0].startDate
  const endDate = planWeeks[planWeeks.length - 1].endDate

  const actualRuns = await getActualRuns(session.userId, startDate, endDate)

  // Build context string for Claude
  const context = buildContext(planWeeks, actualRuns, currentWeek)

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 600,
    system: `You are an expert marathon coach helping an athlete prepare for a sub-3:30 marathon (target pace: 4:58/km).
The athlete has run two marathons before: 3:48 and 3:35. They are following a 26-week training plan.
Be direct, specific, and encouraging. Give one or two concrete adjustments for the coming week based on the data.
Format your response as 2-3 short paragraphs. No bullet points. No greetings.`,
    messages: [
      {
        role: 'user',
        content: `Here is my training data for the past ${planWeeks.length} week(s):\n\n${context}\n\nBased on this, what adjustments should I make to my training this week?`,
      },
    ],
  })

  const suggestion = message.content[0].type === 'text' ? message.content[0].text : ''

  // Store in DB
  const db = createServerClient()
  const { data } = await db
    .from('ai_suggestions')
    .insert({
      user_id: session.userId,
      week_number: currentWeek,
      suggestion,
      context: { planWeeks: planWeeks.map((w) => w.weekNumber), actualRunCount: actualRuns.length },
    })
    .select()
    .single()

  return NextResponse.json({ suggestion: data })
}

// GET /api/suggestions — fetch all past suggestions
export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServerClient()
  const { data } = await db
    .from('ai_suggestions')
    .select('*')
    .eq('user_id', session.userId)
    .order('generated_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ suggestions: data ?? [] })
}

function buildContext(
  planWeeks: typeof trainingPlan,
  actualRuns: ActualRun[],
  currentWeek: number
): string {
  const lines: string[] = []

  for (const week of planWeeks) {
    const label = week.weekNumber === currentWeek ? `Week ${week.weekNumber} (CURRENT)` : `Week ${week.weekNumber}`
    lines.push(`${label} — Phase: ${week.phase}, Target: ${week.targetKm} km`)
    lines.push('Planned runs:')

    for (const run of week.runs) {
      const pace = run.targetPaceMinPerKm ? ` at ${formatPaceDisplay(run.targetPaceMinPerKm)}` : ' easy'
      lines.push(`  ${run.dayOfWeek}: ${run.type} ${run.targetDistanceKm} km${pace}`)

      // Find matching actual run (same date ±1 day)
      const planned = new Date(run.date)
      const actual = actualRuns.find((a) => {
        const d = new Date(a.runDate)
        return Math.abs(d.getTime() - planned.getTime()) <= 86400000
      })

      if (actual) {
        const paceStr = formatPace(actual.paceMinPerKm)
        const hrStr = actual.averageHeartrate ? `, avg HR ${actual.averageHeartrate}` : ''
        lines.push(
          `    → COMPLETED: ${actual.distanceKm} km at ${paceStr}${hrStr} ("${actual.name}")`
        )
        // Flag if pace was significantly off target
        if (run.targetPaceMinPerKm) {
          const diff = actual.paceMinPerKm - run.targetPaceMinPerKm
          if (diff > 0.3) lines.push(`    ⚠ Ran ${Math.round(diff * 60)}s/km slower than target`)
          if (diff < -0.3) lines.push(`    ⚠ Ran ${Math.round(Math.abs(diff) * 60)}s/km faster than target`)
        }
      } else if (week.weekNumber < currentWeek) {
        lines.push(`    → MISSED`)
      } else {
        lines.push(`    → Upcoming`)
      }
    }
    lines.push('')
  }

  lines.push(`Target marathon pace: ${formatPaceDisplay(PACES.mp!)} (sub 3:30)`)
  return lines.join('\n')
}
