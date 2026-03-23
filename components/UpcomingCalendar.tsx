"use client"

import { useEffect, useState } from "react"

interface CalendarEvent {
  id: string
  summary: string
  start: string
  allDay: boolean
}

interface DayData {
  dateStr: string
  dayLabel: string
  events: CalendarEvent[]
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("de-DE", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin",
  })
}

export default function UpcomingCalendar({ days = 5 }: { days?: number }) {
  const [data, setData] = useState<DayData[]>([])

  useEffect(() => {
    const load = () =>
      fetch(`/api/calendar/upcoming?days=${days}`)
        .then(r => r.ok ? r.json() : [])
        .then(setData)
        .catch(() => {})
    load()
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [days])

  if (data.length === 0) return null

  return (
    <div className="flex divide-x divide-white/10 w-full">
      {data.map((day, i) => (
        <div key={day.dateStr} className="flex-1 min-w-0 px-3">
          <div className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${i === 0 ? "text-[#4a88c2]" : "text-white/50"}`}>
            {day.dayLabel}
          </div>
          {day.events.length === 0 ? (
            <div className="text-[11px] text-white/20">—</div>
          ) : (
            <div className="space-y-1">
              {day.events.slice(0, 3).map(ev => (
                <div key={ev.id} className="flex items-baseline gap-1 min-w-0">
                  {!ev.allDay && (
                    <span className="text-[10px] text-white/40 shrink-0">{formatTime(ev.start)}</span>
                  )}
                  {ev.allDay && (
                    <span className="text-[10px] text-white/30 shrink-0">ganztg.</span>
                  )}
                  <span className="text-[11px] text-white/90 truncate leading-tight">{ev.summary}</span>
                </div>
              ))}
              {day.events.length > 3 && (
                <div className="text-[10px] text-white/30">+{day.events.length - 3} weitere</div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
