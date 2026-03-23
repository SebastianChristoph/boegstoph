export type EventType = "SOWING_INDOOR" | "PIKE" | "TRANSPLANT" | "SOWING_DIRECT" | "HARVEST_START"

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
  weeksIndoor: number | null
  weeksToPike: number | null
  daysToMaturity: number | null
  harvestDays: number | null
  plant: {
    name: string
    variety?: string | null
    sowingMethod: string
    weeksIndoor: number | null
    weeksToPike: number | null
    daysToMaturity: number | null
    harvestDays: number | null
  }
}

const EVENT_META: Record<EventType, { label: string; emoji: string }> = {
  SOWING_INDOOR: { label: "Aussaat (innen)", emoji: "🌱" },
  PIKE: { label: "Pikieren", emoji: "🪴" },
  TRANSPLANT: { label: "Auspflanzen", emoji: "🌿" },
  SOWING_DIRECT: { label: "Direktaussaat", emoji: "🌱" },
  HARVEST_START: { label: "Ernte beginnt", emoji: "🥬" },
}

export function eisheiligeDate(year: number): Date {
  return new Date(year, 4, 15)
}

export function generateTimeline(season: SeasonForTimeline): TimelineEvent[] {
  const year = season.year
  const eish = eisheiligeDate(year)

  const weeksIndoor = season.weeksIndoor ?? season.plant.weeksIndoor ?? 8
  const weeksToPike = season.weeksToPike ?? season.plant.weeksToPike ?? 4
  const daysToMaturity = season.daysToMaturity ?? season.plant.daysToMaturity ?? 60
  const method = season.plant.sowingMethod

  const events: TimelineEvent[] = []
  const base = { plantName: season.plant.name, variety: season.plant.variety ?? undefined, seasonId: season.id }

  if (method === "INDOOR" || method === "BOTH") {
    const indoorDate = new Date(eish)
    indoorDate.setDate(indoorDate.getDate() - weeksIndoor * 7)
    events.push({ type: "SOWING_INDOOR", ...EVENT_META.SOWING_INDOOR, date: new Date(indoorDate), ...base })

    const pikeDate = new Date(indoorDate)
    pikeDate.setDate(pikeDate.getDate() + weeksToPike * 7)
    events.push({ type: "PIKE", ...EVENT_META.PIKE, date: new Date(pikeDate), ...base })

    events.push({ type: "TRANSPLANT", ...EVENT_META.TRANSPLANT, date: new Date(eish), ...base })

    const harvestDate = new Date(eish)
    harvestDate.setDate(harvestDate.getDate() + daysToMaturity)
    events.push({ type: "HARVEST_START", ...EVENT_META.HARVEST_START, date: new Date(harvestDate), ...base })
  }

  if (method === "DIRECT" || method === "BOTH") {
    events.push({ type: "SOWING_DIRECT", ...EVENT_META.SOWING_DIRECT, date: new Date(eish), ...base })

    const harvestDate = new Date(eish)
    harvestDate.setDate(harvestDate.getDate() + daysToMaturity)
    events.push({ type: "HARVEST_START", ...EVENT_META.HARVEST_START, date: new Date(harvestDate), ...base })
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
