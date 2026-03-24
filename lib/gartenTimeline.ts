export type EventType = "SOWING_INDOOR" | "TRANSPLANT" | "SOWING_DIRECT"

export interface TimelineEvent {
  type: EventType
  label: string
  emoji: string
  date: Date
  plantName: string
  variety?: string
  seasonId: string
}

export interface SeasonForTimeline {
  id: string
  year: number
  plant: {
    name: string
    variety?: string | null
    vorzuchtMonat: number | null
    aussaatMonat: number | null
  }
}

const EVENT_META: Record<EventType, { label: string; emoji: string }> = {
  SOWING_INDOOR: { label: "Vorzucht starten", emoji: "🌱" },
  TRANSPLANT:    { label: "Auspflanzen (Eisheilige)", emoji: "🌿" },
  SOWING_DIRECT: { label: "Direktaussaat", emoji: "🌱" },
}

export function eisheiligeDate(year: number): Date {
  return new Date(year, 4, 15)
}

export function generateTimeline(season: SeasonForTimeline): TimelineEvent[] {
  const year = season.year
  const { vorzuchtMonat, aussaatMonat } = season.plant
  const events: TimelineEvent[] = []
  const base = { plantName: season.plant.name, variety: season.plant.variety ?? undefined, seasonId: season.id }

  if (vorzuchtMonat) {
    events.push({ type: "SOWING_INDOOR", ...EVENT_META.SOWING_INDOOR, date: new Date(year, vorzuchtMonat - 1, 1), ...base })
    events.push({ type: "TRANSPLANT", ...EVENT_META.TRANSPLANT, date: eisheiligeDate(year), ...base })
  }

  if (aussaatMonat) {
    events.push({ type: "SOWING_DIRECT", ...EVENT_META.SOWING_DIRECT, date: new Date(year, aussaatMonat - 1, 1), ...base })
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime())
}

export function generateTodosFromTimeline(season: SeasonForTimeline): Array<{ title: string; dueDate: Date; type: string }> {
  return generateTimeline(season).map(ev => ({
    title: `${ev.plantName}${ev.variety ? ` (${ev.variety})` : ""}: ${ev.label}`,
    dueDate: ev.date,
    type: ev.type,
  }))
}

export function formatDE(date: Date): string {
  return date.toLocaleDateString("de-DE", { day: "numeric", month: "long" })
}
