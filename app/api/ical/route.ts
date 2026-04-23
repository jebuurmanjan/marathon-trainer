import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { trainingPlan, RACE_DATE, RUN_TYPE_LABELS, formatPaceDisplay } from '@/lib/training-plan'

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

  const lines: string[] = []

  // Calendar header
  lines.push(
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sub 3:30 Marathon Trainer//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Sub 3:30 Training Plan',
    'X-WR-CALDESC:27-week marathon training plan — target sub 3:30 on 1 Nov 2026',
  )

  // One VEVENT per planned run
  for (const week of trainingPlan) {
    for (const run of week.runs) {
      const typeLabel = RUN_TYPE_LABELS[run.type] ?? run.type
      const paceNote = run.targetPaceMinPerKm
        ? ` @ ${formatPaceDisplay(run.targetPaceMinPerKm)}`
        : ' — easy effort'

      const summary = `${typeLabel} ${run.targetDistanceKm} km${paceNote}`
      const description = [
        `Week ${week.weekNumber} · ${week.phase.charAt(0).toUpperCase() + week.phase.slice(1)} phase`,
        run.description,
        week.notes,
      ].join('\\n\\n')

      const uid = `w${week.weekNumber}-${run.date}-${run.type}@marathon-trainer`

      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTART;VALUE=DATE:${toIcalDate(run.date)}`,
        `DTEND;VALUE=DATE:${nextDay(run.date)}`,
        foldLine(`SUMMARY:${esc(summary)}`),
        foldLine(`DESCRIPTION:${esc(description)}`),
        `CATEGORIES:${typeLabel}`,
        `URL:https://marathon-trainer-ten.vercel.app/plan`,
        'END:VEVENT',
      )
    }
  }

  // Race day event
  lines.push(
    'BEGIN:VEVENT',
    `UID:race-day-${RACE_DATE}@marathon-trainer`,
    `DTSTART;VALUE=DATE:${toIcalDate(RACE_DATE)}`,
    `DTEND;VALUE=DATE:${nextDay(RACE_DATE)}`,
    'SUMMARY:🏁 Marathon Race Day — Sub 3:30',
    'DESCRIPTION:Race day! Target time: 3:30:00 (4:58/km). Good luck!',
    'CATEGORIES:Race',
    'END:VEVENT',
  )

  lines.push('END:VCALENDAR')

  const icsContent = lines.join('\r\n')

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="sub330-training-plan.ics"',
      'Cache-Control': 'no-cache',
    },
  })
}
