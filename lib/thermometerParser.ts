export interface ThermometerReading {
  timestamp: Date
  temperature: number
  humidity: number
}

export function parseThermometerCSV(csv: string): ThermometerReading[] {
  const lines = csv.trim().split(/\r?\n/)
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
