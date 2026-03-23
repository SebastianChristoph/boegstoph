import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export interface CalendarEvent {
  id: string
  summary: string
  start: string
  end: string
  allDay: boolean
  location?: string
}

// Convert a naive ICS datetime string + TZID to a UTC Date
function icsToUTC(value: string, tzid: string): Date {
  // value: "20260323T190000" or "20260323T190000Z"
  const y = parseInt(value.slice(0, 4))
  const mo = parseInt(value.slice(4, 6)) - 1
  const d = parseInt(value.slice(6, 8))
  const h = parseInt(value.slice(9, 11))
  const mi = parseInt(value.slice(11, 13))
  const s = parseInt(value.slice(13, 15) || "0")

  if (value.endsWith("Z")) {
    return new Date(Date.UTC(y, mo, d, h, mi, s))
  }

  // Guess: treat as UTC, then figure out the actual Berlin offset at that point
  const guess = Date.UTC(y, mo, d, h, mi, s)
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tzid,
    year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", second: "numeric",
    hour12: false,
  })
  const parts = Object.fromEntries(fmt.formatToParts(new Date(guess)).map(p => [p.type, p.value]))
  const gotH = parseInt(parts.hour) % 24
  const gotMi = parseInt(parts.minute)
  const gotS = parseInt(parts.second)
  const diffMs = (gotH * 3600 + gotMi * 60 + gotS - h * 3600 - mi * 60 - s) * 1000
  return new Date(guess - diffMs)
}

function parseICS(text: string): CalendarEvent[] {
  // Unfold lines (CRLF + SPACE/TAB = continuation)
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const lines = unfolded.split("\n")

  const events: CalendarEvent[] = []
  let inside = false
  let cur: Record<string, string> = {}

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line === "BEGIN:VEVENT") { inside = true; cur = {}; continue }
    if (line === "END:VEVENT") {
      inside = false
      const ev = buildEvent(cur)
      if (ev) events.push(ev)
      continue
    }
    if (!inside) continue
    const colon = line.indexOf(":")
    if (colon < 1) continue
    const key = line.slice(0, colon)
    const val = line.slice(colon + 1)
    // Store first occurrence only (handles DTSTART vs DTSTART;TZID=...)
    const baseKey = key.split(";")[0]
    if (!cur[baseKey]) {
      cur[baseKey] = val
      cur[`__param_${baseKey}`] = key // store full key with params
    }
  }

  return events
}

function buildEvent(cur: Record<string, string>): CalendarEvent | null {
  const dtStartKey = cur["__param_DTSTART"] ?? "DTSTART"
  const dtEndKey = cur["__param_DTEND"] ?? "DTEND"
  const dtStartVal = cur["DTSTART"]
  const dtEndVal = cur["DTEND"]

  if (!dtStartVal) return null

  const tzid = dtStartKey.includes("TZID=")
    ? dtStartKey.split("TZID=")[1]
    : "Europe/Berlin"

  const allDay = dtStartKey.includes("VALUE=DATE") || dtStartVal.length === 8

  let start: Date
  let end: Date

  if (allDay) {
    const y = parseInt(dtStartVal.slice(0, 4))
    const mo = parseInt(dtStartVal.slice(4, 6)) - 1
    const d = parseInt(dtStartVal.slice(6, 8))
    start = new Date(Date.UTC(y, mo, d))
    if (dtEndVal) {
      const ey = parseInt(dtEndVal.slice(0, 4))
      const emo = parseInt(dtEndVal.slice(4, 6)) - 1
      const ed = parseInt(dtEndVal.slice(6, 8))
      end = new Date(Date.UTC(ey, emo, ed))
    } else {
      end = new Date(start.getTime() + 86400000)
    }
  } else {
    start = icsToUTC(dtStartVal, tzid)
    end = dtEndVal ? icsToUTC(dtEndVal, tzid) : new Date(start.getTime() + 3600000)
  }

  return {
    id: cur["UID"] ?? String(Math.random()),
    summary: cur["SUMMARY"] ?? "(kein Titel)",
    start: start.toISOString(),
    end: end.toISOString(),
    allDay,
    location: cur["LOCATION"] || undefined,
  }
}

// Get today's date string in Berlin timezone: "2026-03-23"
function berlinDateStr(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" })
}

export async function GET() {
  const url = process.env.GOOGLE_CALENDAR_ICS_URL
  if (!url) return NextResponse.json([])

  try {
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) return NextResponse.json([])
    const text = await res.text()
    const all = parseICS(text)

    const todayStr = berlinDateStr(new Date())

    const todays = all.filter(ev => {
      // For timed events: check if start date (in Berlin) is today
      // For all-day: same check on UTC date
      const startDate = ev.allDay
        ? new Date(ev.start).toISOString().slice(0, 10)
        : berlinDateStr(new Date(ev.start))
      return startDate === todayStr
    })

    todays.sort((a, b) => {
      if (a.allDay && !b.allDay) return -1
      if (!a.allDay && b.allDay) return 1
      return new Date(a.start).getTime() - new Date(b.start).getTime()
    })

    return NextResponse.json(todays)
  } catch (e) {
    console.error("Calendar fetch error:", e)
    return NextResponse.json([])
  }
}
