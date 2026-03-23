// Shared ICS parsing logic for calendar routes

export interface CalendarEvent {
  id: string
  summary: string
  start: string
  end: string
  allDay: boolean
  location?: string
}

interface ParsedVEvent {
  uid: string
  summary: string
  status: string | null
  dtStartVal: string
  dtStartKey: string
  dtEndVal: string | null
  dtEndKey: string
  rrule: string | null
  exdates: string[]
  exdateTzid: string
  location?: string
}

interface RRuleData {
  freq: string
  interval: number
  byday: string[] | null
  until: string | null
  count: number | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function icsToUTC(value: string, tzid: string): Date {
  const y = parseInt(value.slice(0, 4))
  const mo = parseInt(value.slice(4, 6)) - 1
  const d = parseInt(value.slice(6, 8))
  const h = parseInt(value.slice(9, 11) || "0")
  const mi = parseInt(value.slice(11, 13) || "0")
  const s = parseInt(value.slice(13, 15) || "0")

  if (value.endsWith("Z")) return new Date(Date.UTC(y, mo, d, h, mi, s))

  const guess = Date.UTC(y, mo, d, h, mi, s)
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tzid,
    year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", second: "numeric",
    hour12: false,
  })
  const parts = Object.fromEntries(fmt.formatToParts(new Date(guess)).map(p => [p.type, p.value]))
  const gotH = parseInt(parts.hour) % 24
  const diffMs = (gotH * 3600 + parseInt(parts.minute) * 60 + parseInt(parts.second)
    - h * 3600 - mi * 60 - s) * 1000
  return new Date(guess - diffMs)
}

export function berlinDateStr(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" })
}

function dowFromDateStr(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  return ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()]
}

function parseRRule(rrule: string): RRuleData {
  const parts = Object.fromEntries(rrule.split(";").map(p => {
    const eq = p.indexOf("=")
    return [p.slice(0, eq), p.slice(eq + 1)]
  }))
  return {
    freq: parts["FREQ"] ?? "WEEKLY",
    interval: parseInt(parts["INTERVAL"] ?? "1"),
    byday: parts["BYDAY"] ? parts["BYDAY"].split(",").map(d => d.replace(/^[+-]?\d+/, "")) : null,
    until: parts["UNTIL"] ?? null,
    count: parts["COUNT"] ? parseInt(parts["COUNT"]) : null,
  }
}

// ── RRULE occurrence check (works for both timed and all-day) ─────────────────

function rruleOccursOn(startDateStr: string, rrule: RRuleData, targetDateStr: string): boolean {
  if (targetDateStr < startDateStr) return false

  // Check UNTIL (compare date portions only — close enough)
  if (rrule.until) {
    const untilDate = rrule.until.slice(0, 4) + "-" + rrule.until.slice(4, 6) + "-" + rrule.until.slice(6, 8)
    if (targetDateStr > untilDate) return false
  }

  const startMs = new Date(startDateStr + "T12:00:00Z").getTime()
  const targetMs = new Date(targetDateStr + "T12:00:00Z").getTime()
  const daysDiff = Math.round((targetMs - startMs) / 86400000)
  const interval = rrule.interval

  if (rrule.freq === "DAILY") {
    if (daysDiff % interval !== 0) return false
    if (rrule.count !== null && Math.floor(daysDiff / interval) + 1 > rrule.count) return false
    return true
  }

  if (rrule.freq === "WEEKLY") {
    const weeksDiff = Math.round(daysDiff / 7)
    const targetDow = dowFromDateStr(targetDateStr)

    if (rrule.byday) {
      if (!rrule.byday.includes(targetDow)) return false
      if (weeksDiff % interval !== 0) return false
      if (rrule.count !== null) {
        // Each week contributes byday.length occurrences
        const occ = Math.floor(weeksDiff / interval) * rrule.byday.length + 1
        if (occ > rrule.count) return false
      }
    } else {
      if (dowFromDateStr(startDateStr) !== targetDow) return false
      if (weeksDiff % interval !== 0) return false
      if (rrule.count !== null && Math.floor(weeksDiff / interval) + 1 > rrule.count) return false
    }
    return true
  }

  if (rrule.freq === "MONTHLY") {
    const [sy, sm, sd] = startDateStr.split("-").map(Number)
    const [ty, tm, td] = targetDateStr.split("-").map(Number)
    if (sd !== td) return false
    const monthsDiff = (ty - sy) * 12 + (tm - sm)
    if (monthsDiff % interval !== 0) return false
    if (rrule.count !== null && Math.floor(monthsDiff / interval) + 1 > rrule.count) return false
    return true
  }

  if (rrule.freq === "YEARLY") {
    const [sy, sm, sd] = startDateStr.split("-").map(Number)
    const [ty, tm, td] = targetDateStr.split("-").map(Number)
    if (sm !== tm || sd !== td) return false
    const yearsDiff = ty - sy
    if (yearsDiff % interval !== 0) return false
    if (rrule.count !== null && Math.floor(yearsDiff / interval) + 1 > rrule.count) return false
    return true
  }

  return false
}

// ── ICS parser ────────────────────────────────────────────────────────────────

export function parseICS(text: string): ParsedVEvent[] {
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const lines = unfolded.split("\n")

  const events: ParsedVEvent[] = []
  let inside = false
  let cur: Record<string, string> = {}
  let exdates: string[] = []
  let exdateTzid = "Europe/Berlin"

  for (const raw of lines) {
    const line = raw.trimEnd()

    if (line === "BEGIN:VEVENT") { inside = true; cur = {}; exdates = []; exdateTzid = "Europe/Berlin"; continue }

    if (line === "END:VEVENT") {
      inside = false
      const dtStartVal = cur["DTSTART"]
      if (dtStartVal) {
        events.push({
          uid: cur["UID"] ?? String(Math.random()),
          summary: cur["SUMMARY"] ?? "(kein Titel)",
          status: cur["STATUS"] ?? null,
          dtStartVal,
          dtStartKey: cur["__param_DTSTART"] ?? "DTSTART",
          dtEndVal: cur["DTEND"] ?? null,
          dtEndKey: cur["__param_DTEND"] ?? "DTEND",
          rrule: cur["RRULE"] ?? null,
          exdates,
          exdateTzid,
          location: cur["LOCATION"] || undefined,
        })
      }
      continue
    }

    if (!inside) continue
    const colon = line.indexOf(":")
    if (colon < 1) continue
    const key = line.slice(0, colon)
    const val = line.slice(colon + 1)
    const baseKey = key.split(";")[0]

    if (baseKey === "EXDATE") {
      exdates.push(...val.split(","))
      if (key.includes("TZID=")) exdateTzid = key.split("TZID=")[1].split(";")[0]
      continue
    }
    if (!cur[baseKey]) { cur[baseKey] = val; cur[`__param_${baseKey}`] = key }
  }

  return events
}

// ── Event builder for a single date ──────────────────────────────────────────

function isExcluded(ev: ParsedVEvent, todayStr: string): boolean {
  return ev.exdates.some(exdate => {
    try {
      if (exdate.length === 8) return exdate.slice(0, 4) + "-" + exdate.slice(4, 6) + "-" + exdate.slice(6, 8) === todayStr
      return berlinDateStr(icsToUTC(exdate, ev.exdateTzid)) === todayStr
    } catch { return false }
  })
}

export function buildEventsForDate(parsed: ParsedVEvent[], targetDateStr: string): CalendarEvent[] {
  const results: CalendarEvent[] = []

  for (const ev of parsed) {
    if (ev.status === "CANCELLED") continue

    const tzid = ev.dtStartKey.includes("TZID=")
      ? ev.dtStartKey.split("TZID=")[1].split(";")[0]
      : "Europe/Berlin"

    const allDay = ev.dtStartKey.includes("VALUE=DATE") || ev.dtStartVal.length === 8

    if (allDay) {
      const startDateStr = ev.dtStartVal.slice(0, 4) + "-" + ev.dtStartVal.slice(4, 6) + "-" + ev.dtStartVal.slice(6, 8)
      const matches = startDateStr === targetDateStr
        || (ev.rrule ? rruleOccursOn(startDateStr, parseRRule(ev.rrule), targetDateStr) : false)
      if (!matches) continue
      if (isExcluded(ev, targetDateStr)) continue

      const y = parseInt(ev.dtStartVal.slice(0, 4))
      const mo = parseInt(ev.dtStartVal.slice(4, 6)) - 1
      const d = parseInt(ev.dtStartVal.slice(6, 8))
      const start = new Date(Date.UTC(y, mo, d))
      let end: Date
      if (ev.dtEndVal) {
        const ey = parseInt(ev.dtEndVal.slice(0, 4))
        const emo = parseInt(ev.dtEndVal.slice(4, 6)) - 1
        const ed = parseInt(ev.dtEndVal.slice(6, 8))
        end = new Date(Date.UTC(ey, emo, ed))
      } else {
        end = new Date(start.getTime() + 86400000)
      }
      results.push({ id: ev.uid + (ev.rrule ? "_" + targetDateStr : ""), summary: ev.summary, start: start.toISOString(), end: end.toISOString(), allDay: true, location: ev.location })
      continue
    }

    // Timed event
    const startUTC = icsToUTC(ev.dtStartVal, tzid)
    const startDateStr = berlinDateStr(startUTC)
    let occurrenceStart: Date | null = null

    if (startDateStr === targetDateStr) {
      occurrenceStart = startUTC
    } else if (ev.rrule) {
      const rrule = parseRRule(ev.rrule)
      if (rruleOccursOn(startDateStr, rrule, targetDateStr)) {
        const datePart = targetDateStr.replace(/-/g, "")
        const timePart = ev.dtStartVal.length > 8 ? ev.dtStartVal.slice(8) : ""
        occurrenceStart = icsToUTC(datePart + timePart, tzid)
      }
    }

    if (!occurrenceStart) continue
    if (isExcluded(ev, targetDateStr)) continue

    const endTzid = ev.dtEndKey.includes("TZID=") ? ev.dtEndKey.split("TZID=")[1].split(";")[0] : tzid
    const origEnd = ev.dtEndVal ? icsToUTC(ev.dtEndVal, endTzid) : new Date(startUTC.getTime() + 3600000)
    const occurrenceEnd = new Date(occurrenceStart.getTime() + (origEnd.getTime() - startUTC.getTime()))

    results.push({
      id: ev.uid + (ev.rrule ? "_" + targetDateStr : ""),
      summary: ev.summary,
      start: occurrenceStart.toISOString(),
      end: occurrenceEnd.toISOString(),
      allDay: false,
      location: ev.location,
    })
  }

  return results
}

export function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    if (a.allDay && !b.allDay) return -1
    if (!a.allDay && b.allDay) return 1
    return new Date(a.start).getTime() - new Date(b.start).getTime()
  })
}
