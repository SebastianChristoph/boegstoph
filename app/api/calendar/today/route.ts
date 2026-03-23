import { NextResponse } from "next/server"
import * as ical from "node-ical"

export const dynamic = "force-dynamic"

export interface CalendarEvent {
  id: string
  summary: string
  start: string   // ISO string
  end: string     // ISO string
  allDay: boolean
  location?: string
}

function toLocalMidnight(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function GET() {
  const url = process.env.GOOGLE_CALENDAR_ICS_URL
  if (!url) return NextResponse.json([])

  try {
    const data = await ical.async.fromURL(url)
    const now = new Date()
    const todayStart = toLocalMidnight(now)
    const todayEnd = new Date(todayStart)
    todayEnd.setDate(todayEnd.getDate() + 1)

    const events: CalendarEvent[] = []

    for (const event of Object.values(data)) {
      if (event.type !== "VEVENT") continue

      // Handle recurring events — node-ical expands them into separate VEVENT entries
      const start = event.start as Date
      const end = (event.end as Date) ?? start

      if (!start) continue

      const allDay =
        (start as unknown as { dateOnly?: boolean }).dateOnly === true ||
        (start.getHours() === 0 && start.getMinutes() === 0 && start.getSeconds() === 0 &&
          end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0 &&
          end.getTime() - start.getTime() >= 86400000)

      // Check if event overlaps with today
      const eventStart = new Date(start)
      const eventEnd = new Date(end)

      const overlaps = eventStart < todayEnd && eventEnd > todayStart
      if (!overlaps) continue

      events.push({
        id: event.uid as string ?? String(Math.random()),
        summary: (event.summary as string) ?? "(kein Titel)",
        start: eventStart.toISOString(),
        end: eventEnd.toISOString(),
        allDay,
        location: event.location as string | undefined,
      })
    }

    events.sort((a, b) => {
      if (a.allDay && !b.allDay) return -1
      if (!a.allDay && b.allDay) return 1
      return new Date(a.start).getTime() - new Date(b.start).getTime()
    })

    return NextResponse.json(events)
  } catch (e) {
    console.error("Calendar fetch error:", e)
    return NextResponse.json([])
  }
}
