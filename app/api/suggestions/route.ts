import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSession } from '@/lib/session'
import { createServerClient } from '@/lib/supabase'
import { getActualRuns, formatPace } from '@/lib/strava'
import { formatPaceDisplay } from '@/lib/training-plan'
import { getUserPlan } from '@/lib/user-plan'
import { formatGoalTime } from '@/lib/plan-generator'
import { ActualRun, Week } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// POST /api/suggestions — generate a new AI coaching suggestion
export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userPlan = await getUserPlan(session.userId, session.stravaId)
  if (!userPlan) return NextResponse.json({ error: 'Plan not configured' }, { status: 400 })

  const { plan, currentWeek, config, paces } = userPlan

  if (currentWeek < 1 || currentWeek > 26) {
    return NextResponse.json({ error: 'Plan not active' }, { status: 400 })
  }

  // Last 2 weeks of context
  const lookbackWeek = Math.max(1, currentWeek - 2)
  const planWeeks    = plan.slice(lookbackWeek - 1, currentWeek)
  const startDate    = planWeeks[0].startDate
  const endDate      = planWeeks[planWeeks.length - 1].endDate
  const actualRuns   = await getActualRuns(session.userId, startDate, endDate)

  const goalLabel = formatGoalTime(config.goalSeconds)
  const mpLabel   = formatPaceDisplay(paces.mp)

  const context = buildContext(planWeeks, actualRuns, currentWeek)

  let message
  try {
    message = await anthropic.messages.create({
      model:      'claude-opus-4-5',
      max_tokens: 600,
      system: `You are an expert marathon coach helping an athlete prepare for a ${goalLabel} marathon (target pace: ${mpLabel}).
They are following a 27-week training plan. Be direct, specific, and encouraging.
Give one or two concrete adjustments for the coming week based on the data.
Format your response as 2–3 short paragraphs. No bullet points. No greetings.`,
      messages: [{
        role:    'user',
        content: `Here is my training data for the past ${planWeeks.length} week(s):\n\n${context}\n\nBased on this, what adjustments should I make to my training this week?`,
      }],
    })
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500
    const msg    = (err as { message?: string }).message ?? 'AI service unavailable'
    console.error('Anthropic API error:', err)
    return NextResponse.json({ error: msg }, { status: status >= 400 && status < 600 ? status : 500 })
  }

  const suggestion = message.content[0].type === 'text' ? message.content[0].text : ''

  const db = createServerClient()
  const { data } = await db
    .from('ai_suggestions')
    .insert({
      user_id:    session.userId,
      week_number: currentWeek,
      suggestion,
      context:    { planWeeks: planWeeks.map((w) => w.weekNumber), actualRunCount: actualRuns.length },
    })
    .select()
    .single()

  return NextResponse.json({ suggestion: data })
}

// GET /api/suggestions — fetch past suggestions
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServerClient()
  const { data } = await db
    .from('ai_suggestions')
    .select('*')
    .eq('user_id', session.userId)
    .order('generated_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ suggestions: data ?? [] })
}

function buildContext(planWeeks: Week[], actualRuns: ActualRun[], currentWeek: number): string {
  const lines: string[] = []

  for (const week of planWeeks) {
    const label = week.weekNumber === currentWeek ? `Week ${week.weekNumber} (CURRENT)` : `Week ${week.weekNumber}`
    lines.push(`${label} — Phase: ${week.phase}, Target: ${week.targetKm} km`)
    lines.push('Planned runs:')

    for (const run of week.runs) {
      const paceStr = run.targetPaceMinPerKm ? ` at ${formatPaceDisplay(run.targetPaceMinPerKm)}` : ' easy'
      lines.push(`  ${run.dayOfWeek}: ${run.type} ${run.targetDistanceKm} km${paceStr}`)

      const planned = new Date(run.date)
      const actual = actualRuns.find((a) => {
        const d = new Date(a.runDate)
        return Math.abs(d.getTime() - planned.getTime()) <= 86_400_000
      })

      if (actual) {
        const hr = actual.averageHeartrate ? `, avg HR ${actual.averageHeartrate}` : ''
        lines.push(`    → COMPLETED: ${actual.distanceKm} km at ${formatPace(actual.paceMinPerKm)}${hr}`)
        if (run.targetPaceMinPerKm) {
          const diff = actual.paceMinPerKm - run.targetPaceMinPerKm
          if (diff >  0.3) lines.push(`    ⚠ Ran ${Math.round(diff * 60)}s/km slower than target`)
          if (diff < -0.3) lines.push(`    ⚠ Ran ${Math.round(Math.abs(diff) * 60)}s/km faster than target`)
        }
      } else if (week.weekNumber < currentWeek) {
        lines.push('    → MISSED')
      } else {
        lines.push('    → Upcoming')
      }
    }
    lines.push('')
  }

  return lines.join('\n')
}
