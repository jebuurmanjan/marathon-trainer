import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getUserPlan } from '@/lib/user-plan'
import { formatGoalTime } from '@/lib/plan-generator'
import { RUN_TYPE_LABELS, formatPaceDisplay } from '@/lib/training-plan'

// Escape special characters in iCal text fields
function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

// Format a date string (YYYY-MM-DD) as iCal DATE value: YYYYMMDD
function toIcalDate(dateStr: string): string {
  return dateStr.replace(/-/g, '')
}

// Add one day to a YYYY-MM-DD date (for DTEND of all-day events)
function nextDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

// Wrap long lines at 75 octets (iCal RFC 5545 §3.1)
function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line)
  if (bytes.length <= 75) return line
  const out: string[] = []
  let pos = 0
  while (pos < line.length) {
    if (pos === 0) {
      out.push(line.slice(0, 75))
      pos = 75
    } else {
      out.push(' ' + line.slice(pos, pos + 74))
      pos += 74
    }
  }
  return out.join('\r\n')
}

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userPlan = await getUserPlan(session.userId, session.stravaId)
  if (!userPlan) {
    return NextResponse.json({ error: 'No active plan' }, { status: 404 })
  }

  const { plan, config } = userPlan
  const goalLabel = formatGoalTime(config.goalSeconds)
  const raceDateLabel = new Date(config.raceDate + 'T12:00:00Z').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const lines: string[] = []

  lines.push(
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Marathon Trainer//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Sub ${goalLabel} Training Plan`,
    `X-WR-CALDESC:${plan.length}-week marathon training plan — target sub ${goalLabel} on ${raceDateLabel}`,
  )

  for (const week of plan) {
    for (const run of week.runs) {
      // Strength sessions belong in the plan UI, not the running calendar
      if (run.type === 'strength') continue

      const typeLabel = RUN_TYPE_LABELS[run.type] ?? run.type
      const paceNote  = run.targetPaceMinPerKm
        ? ` @ ${formatPaceDisplay(run.targetPaceMinPerKm)}`
        : ' — easy effort'

      const summary     = `${typeLabel} ${run.targetDistanceKm} km${paceNote}`
      const description = [
        `Week ${week.weekNumber} · ${week.phase.charAt(0).toUpperCase() + week.phase.slice(1)} phase`,
        run.description,
        week.notes,
      ].filter(Boolean).join('\\n\\n')

      const uid = `w${week.weekNumber}-${run.date}-${run.type}@marathon-trainer`

      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTART;VALUE=DATE:${toIcalDate(run.date)}`,
        `DTEND;VALUE=DATE:${nextDay(run.date)}`,
        foldLine(`SUMMARY:${esc(summary)}`),
        foldLine(`DESCRIPTION:${esc(description)}`),
        `CATEGORIES:${typeLabel}`,
        'URL:https://marathon-trainer-phi.vercel.app/plan',
        'END:VEVENT',
      )
    }
  }

  // Race day event
  lines.push(
    'BEGIN:VEVENT',
    `UID:race-day-${config.raceDate}@marathon-trainer`,
    `DTSTART;VALUE=DATE:${toIcalDate(config.raceDate)}`,
    `DTEND;VALUE=DATE:${nextDay(config.raceDate)}`,
    `SUMMARY:🏁 Marathon Race Day — Sub ${goalLabel}`,
    `DESCRIPTION:Race day! Target time: ${goalLabel} (${formatPaceDisplay(config.goalSeconds / 42.195 / 60)}). Good luck!`,
    'CATEGORIES:Race',
    'END:VEVENT',
  )

  lines.push('END:VCALENDAR')

  const icsContent = lines.join('\r\n')

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="marathon-training-plan.ics"`,
      'Cache-Control': 'no-cache',
    },
  })
}
