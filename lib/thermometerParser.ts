export interface ThermometerReading {
  timestamp: Date
  temperature: number
  humidity: number
}

// "out" sensor moved from outdoor (Gartenhaus) to the bedroom in Oct 2026.
// Data through this date stays the Outdoor season; data from BEDROOM_START
// is the bedroom. The gap between the two dates is the moving transition
// and is deliberately excluded from both.
export const OUTDOOR_SEASON_END = new Date("2026-10-04T23:59:59.999Z")
export const BEDROOM_START = new Date("2026-10-06T00:00:00.000Z")

export function parseThermometerCSV(csv: string): ThermometerReading[] {
  const lines = csv.replace(/^\uFEFF/, "").trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const results: ThermometerReading[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const parts = line.split(',')
    if (parts.length < 3) continue

    const timestamp = new Date(parts[0].trim())
    const temperature = parseFloat(parts[1].trim())
    const humidity = parseFloat(parts[2].trim())

    if (isNaN(timestamp.getTime()) || isNaN(temperature) || isNaN(humidity)) continue
    results.push({ timestamp, temperature, humidity })
  }

  return results
}
