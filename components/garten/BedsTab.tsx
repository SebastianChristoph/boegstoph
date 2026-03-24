"use client"

import { useCallback, useEffect, useState } from "react"
import BedGrid, { BedCellData, plantBg } from "./BedGrid"

interface GardenBed {
  id: string
  name: string
  size: string | null
  gridCols: number
  gridRows: number
  gridCells: string | null
  cellSize: number
  cellAssignments: string | null // JSON: { "2026": { [cellIndex: string]: plantId } }
  sunRequirements: string | null
}

interface GardenPlant {
  id: string
  name: string
  variety: string | null
  thumbnailUrl: string | null
  sunRequirements: string | null
  waterRequirements: string | null
  needsSupport: boolean
  goodNeighbors: { id: string }[]
  badNeighbors: { id: string }[]
}

interface GardenSeason {
  id: string
  year: number
  bedId: string | null
  plantId: string
  plant: { name: string; variety: string | null; thumbnailUrl: string | null }
}

interface HistSeason {
  id: string
  year: number
  bedId: string | null
  plantId: string
  plant: { name: string }
}

interface RotationWarning {
  plantName: string
  years: number[]
  level: "warning" | "error"
}

const CURRENT_YEAR = new Date().getFullYear()

function plantLabel(p: { name: string; variety: string | null }) {
  return p.name + (p.variety ? ` · ${p.variety}` : "")
}

function parseGridCells(gridCells: string | null, cols: number, rows: number): number[] {
  if (!gridCells) return Array.from({ length: cols * rows }, (_, i) => i)
  try { return JSON.parse(gridCells) } catch { return Array.from({ length: cols * rows }, (_, i) => i) }
}

function parseCellAssignments(cellAssignments: string | null, year: number): Record<string, string> {
  if (!cellAssignments) return {}
  try {
    const all = JSON.parse(cellAssignments)
    return all[year.toString()] ?? {}
  } catch { return {} }
}

function buildCellDataFromAssignments(
  assignments: Record<string, string>,
  bedSeasons: GardenSeason[],
  uniquePlantIds: string[]
): Map<number, BedCellData> {
  const map = new Map<number, BedCellData>()
  Object.entries(assignments).forEach(([cellIndexStr, plantId]) => {
    const cellIndex = parseInt(cellIndexStr)
    const pIdx = uniquePlantIds.indexOf(plantId)
    if (pIdx === -1) return
    const season = bedSeasons.find(s => s.plantId === plantId)
    if (!season) return
    map.set(cellIndex, {
      bg: plantBg(pIdx),
      thumbnailUrl: season.plant.thumbnailUrl,
      label: plantLabel(season.plant),
    })
  })
  return map
}

function consecutiveFromEnd(years: number[]): number {
  if (years.length === 0) return 0
  const sorted = [...years].sort((a, b) => a - b)
  let count = 1
  for (let i = sorted.length - 1; i > 0; i--) {
    if (sorted[i] - sorted[i - 1] === 1) count++
    else break
  }
  return count
}

function getRotationWarnings(bedId: string, histSeasons: HistSeason[], currentSeasons: GardenSeason[]): RotationWarning[] {
  const all = [
    ...histSeasons.filter(s => s.bedId === bedId),
    ...currentSeasons.filter(s => s.bedId === bedId).map(s => ({ ...s, plant: { name: s.plant.name } })),
  ]
  const plantMap = new Map<string, { name: string; years: number[] }>()
  for (const s of all) {
    if (!plantMap.has(s.plantId)) plantMap.set(s.plantId, { name: s.plant.name, years: [] })
    const entry = plantMap.get(s.plantId)!
    if (!entry.years.includes(s.year)) entry.years.push(s.year)
  }
  const warnings: RotationWarning[] = []
  plantMap.forEach((data) => {
    const sortedYears = data.years.slice().sort((a: number, b: number) => a - b)
    const consecutive = consecutiveFromEnd(sortedYears)
    if (consecutive >= 3) warnings.push({ plantName: data.name, years: sortedYears, level: "error" })
    else if (consecutive >= 2) warnings.push({ plantName: data.name, years: sortedYears, level: "warning" })
  })
  return warnings
}

interface BedIssue {
  key: string
  type: "bad_neighbor" | "sun_mismatch" | "water_mismatch"
  message: string
  involvedIds: string[]
}

interface BedSuggestion {
  replaceId: string
  replaceName: string
  alternatives: GardenPlant[]
}

interface BedEvaluation {
  rating: "good" | "okay" | "bad"
  positives: string[]
  issues: BedIssue[]
  suggestions: BedSuggestion[]
}

function evaluateBed(
  bed: GardenBed,
  bedSeasons: GardenSeason[],
  allPlants: GardenPlant[],
  allSeasons: GardenSeason[]
): BedEvaluation {
  const bedPlants = bedSeasons.map(s => allPlants.find(p => p.id === s.plantId)).filter(Boolean) as GardenPlant[]
  const positives: string[] = []
  const issues: BedIssue[] = []

  // Neighbor compatibility
  for (let i = 0; i < bedPlants.length; i++) {
    for (let j = i + 1; j < bedPlants.length; j++) {
      const a = bedPlants[i], b = bedPlants[j]
      const isGood = a.goodNeighbors.some(n => n.id === b.id) || b.goodNeighbors.some(n => n.id === a.id)
      const isBad = a.badNeighbors.some(n => n.id === b.id) || b.badNeighbors.some(n => n.id === a.id)
      if (isGood) positives.push(`${a.name} & ${b.name} sind gute Nachbarn`)
      if (isBad) issues.push({ key: `bad-${a.id}-${b.id}`, type: "bad_neighbor", message: `${a.name} & ${b.name} vertragen sich nicht`, involvedIds: [a.id, b.id] })
    }
  }

  // Sun requirements
  if (bed.sunRequirements) {
    const sunOk = bedPlants.filter(p => p.sunRequirements === bed.sunRequirements)
    const sunMismatch = bedPlants.filter(p => p.sunRequirements && p.sunRequirements !== bed.sunRequirements)
    if (sunOk.length === bedPlants.length && bedPlants.length > 0 && bedPlants.every(p => p.sunRequirements))
      positives.push(`Alle Pflanzen passen zum Standort (${bed.sunRequirements})`)
    sunMismatch.forEach(p => {
      issues.push({ key: `sun-${p.id}`, type: "sun_mismatch", message: `${p.name} braucht ${p.sunRequirements}, Beet ist ${bed.sunRequirements}`, involvedIds: [p.id] })
    })
  }

  // Water requirements consistency
  const plantsWithWater = bedPlants.filter(p => p.waterRequirements)
  if (plantsWithWater.length >= 2) {
    const groups = new Map<string, string[]>()
    for (const p of plantsWithWater) {
      const key = p.waterRequirements!
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(p.name)
    }
    if (groups.size > 1) {
      const parts = Array.from(groups.entries()).map(([req, names]) => `${names.join(", ")} (${req})`)
      issues.push({ key: "water", type: "water_mismatch", message: `Unterschiedlicher Wasserbedarf: ${parts.join(" · ")}`, involvedIds: [] })
    } else if (groups.size === 1) {
      const [req] = groups.keys()
      positives.push(`Gleicher Wasserbedarf (${req})`)
    }
  }

  // Suggestions: for bad-neighbor issues, find pool alternatives
  const inBedIds = new Set(bedPlants.map(p => p.id))
  const seasonPoolIds = new Set(allSeasons.map(s => s.plantId))
  const poolPlants = allPlants.filter(p => seasonPoolIds.has(p.id) && !inBedIds.has(p.id))
  const suggestions: BedSuggestion[] = []
  const alreadySuggested = new Set<string>()

  for (const issue of issues.filter(i => i.type === "bad_neighbor")) {
    for (const pid of issue.involvedIds) {
      if (alreadySuggested.has(pid)) continue
      alreadySuggested.add(pid)
      const problematic = allPlants.find(p => p.id === pid)
      if (!problematic) continue
      const remaining = bedPlants.filter(p => p.id !== pid)
      const candidates = poolPlants.filter(candidate => {
        const noBad = remaining.every(rp =>
          !candidate.badNeighbors.some(n => n.id === rp.id) &&
          !rp.badNeighbors.some(n => n.id === candidate.id)
        )
        const sunOk = !bed.sunRequirements || !candidate.sunRequirements || candidate.sunRequirements === bed.sunRequirements
        return noBad && sunOk
      })
      if (candidates.length > 0) {
        suggestions.push({ replaceId: pid, replaceName: problematic.name, alternatives: candidates.slice(0, 3) })
      }
    }
  }

  const rating: "good" | "okay" | "bad" = issues.length === 0 ? "good" : issues.length === 1 ? "okay" : "bad"
  return { rating, positives, issues, suggestions }
}

function getCompatibility(bedPlantIds: string[], allPlants: GardenPlant[]) {
  const good: string[] = []
  const bad: string[] = []
  const bedPlants = allPlants.filter(p => bedPlantIds.includes(p.id))
  for (let i = 0; i < bedPlants.length; i++) {
    for (let j = i + 1; j < bedPlants.length; j++) {
      const a = bedPlants[i], b = bedPlants[j]
      const isGood = a.goodNeighbors.some(n => n.id === b.id) || b.goodNeighbors.some(n => n.id === a.id)
      const isBad = a.badNeighbors.some(n => n.id === b.id) || b.badNeighbors.some(n => n.id === a.id)
      if (isGood) good.push(`${plantLabel(a)} & ${plantLabel(b)}`)
      if (isBad) bad.push(`${plantLabel(a)} & ${plantLabel(b)}`)
    }
  }
  return { good, bad }
}

function GridEditor({
  cols, rows, activeCells,
  onToggle, onAllActive, onAllInactive,
  onColsChange, onRowsChange,
}: {
  cols: number; rows: number; activeCells: number[]
  onToggle: (i: number) => void
  onAllActive: () => void
  onAllInactive: () => void
  onColsChange: (c: number) => void
  onRowsChange: (r: number) => void
}) {
  const areaSqm = (activeCells.length * 0.04).toFixed(2)
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
        <span className="shrink-0">Raster:</span>
        <div className="flex items-center gap-1">
          <button onClick={() => onColsChange(Math.max(3, cols - 1))} className="w-6 h-6 rounded border border-gray-300 hover:border-gray-400 text-sm leading-none">−</button>
          <span className="w-6 text-center font-mono">{cols}</span>
          <button onClick={() => onColsChange(Math.min(20, cols + 1))} className="w-6 h-6 rounded border border-gray-300 hover:border-gray-400 text-sm leading-none">+</button>
          <span className="text-gray-400 mx-0.5">×</span>
          <button onClick={() => onRowsChange(Math.max(2, rows - 1))} className="w-6 h-6 rounded border border-gray-300 hover:border-gray-400 text-sm leading-none">−</button>
          <span className="w-6 text-center font-mono">{rows}</span>
          <button onClick={() => onRowsChange(Math.min(15, rows + 1))} className="w-6 h-6 rounded border border-gray-300 hover:border-gray-400 text-sm leading-none">+</button>
          <span className="text-gray-400 ml-1">(à 20 cm)</span>
        </div>
      </div>
      <p className="text-xs text-gray-400">Tippe Zellen an, um sie zu entfernen oder hinzuzufügen — forme so dein Beet nach.</p>
      <div className="overflow-x-auto pb-1">
        <BedGrid cols={cols} rows={rows} activeCells={activeCells} editable onToggle={onToggle} />
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-400">
        <button onClick={onAllActive} className="hover:text-gray-600 underline">Alle aktiv</button>
        <button onClick={onAllInactive} className="hover:text-gray-600 underline">Alle inaktiv</button>
        <span className="ml-auto">{activeCells.length} Zellen ≈ {areaSqm} m²</span>
      </div>
    </div>
  )
}

export default function BedsTab() {
  const [beds, setBeds] = useState<GardenBed[]>([])
  const [seasons, setSeasons] = useState<GardenSeason[]>([])
  const [histSeasons, setHistSeasons] = useState<HistSeason[]>([])
  const [plants, setPlants] = useState<GardenPlant[]>([])

  // Create bed state
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState("")
  const [newSize, setNewSize] = useState("")
  const [newSun, setNewSun] = useState("")
  const [newGridCols, setNewGridCols] = useState(10)
  const [newGridRows, setNewGridRows] = useState(8)
  const [newActiveCells, setNewActiveCells] = useState<number[]>(() =>
    Array.from({ length: 10 * 8 }, (_, i) => i)
  )

  // Edit name/size state
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editSize, setEditSize] = useState("")
  const [editSun, setEditSun] = useState("")

  // Edit grid state
  const [editGridBedId, setEditGridBedId] = useState<string | null>(null)
  const [editGridCols, setEditGridCols] = useState(10)
  const [editGridRows, setEditGridRows] = useState(8)
  const [editGridCells, setEditGridCells] = useState<number[]>([])

  const [assigning, setAssigning] = useState<string | null>(null)
  const [selectingCell, setSelectingCell] = useState<{ bedId: string; cellIndex: number } | null>(null)
  const [evalOpen, setEvalOpen] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    const [bedsRes, seasonsRes, plantsRes, histRes] = await Promise.all([
      fetch("/api/garden/beds"),
      fetch(`/api/garden/seasons?year=${CURRENT_YEAR}`),
      fetch("/api/garden/plants"),
      fetch(`/api/garden/seasons?minYear=${CURRENT_YEAR - 2}&slim=1`),
    ])
    if (bedsRes.ok) setBeds(await bedsRes.json())
    if (seasonsRes.ok) setSeasons(await seasonsRes.json())
    if (plantsRes.ok) setPlants(await plantsRes.json())
    if (histRes.ok) {
      const all: HistSeason[] = await histRes.json()
      // Exclude current year — those come from `seasons`
      setHistSeasons(all.filter(s => s.year < CURRENT_YEAR))
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Reset new grid when size changes
  useEffect(() => {
    setNewActiveCells(Array.from({ length: newGridCols * newGridRows }, (_, i) => i))
  }, [newGridCols, newGridRows])

  async function addBed() {
    if (!newName.trim()) return
    const res = await fetch("/api/garden/beds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        size: newSize || null,
        sunRequirements: newSun || null,
        gridCols: newGridCols,
        gridRows: newGridRows,
        gridCells: JSON.stringify(newActiveCells),
      }),
    })
    if (res.ok) {
      const bed = await res.json()
      setBeds(b => [...b, bed])
      setNewName(""); setNewSize(""); setNewSun(""); setShowAdd(false)
      setNewGridCols(10); setNewGridRows(8)
    }
  }

  async function saveBed(id: string) {
    const res = await fetch(`/api/garden/beds/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, size: editSize, sunRequirements: editSun || null }),
    })
    if (res.ok) {
      const updated = await res.json()
      setBeds(b => b.map(x => x.id === id ? updated : x))
      setEditId(null)
    }
  }

  async function saveGrid(bedId: string) {
    const res = await fetch(`/api/garden/beds/${bedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gridCols: editGridCols,
        gridRows: editGridRows,
        gridCells: JSON.stringify(editGridCells),
      }),
    })
    if (res.ok) {
      const updated = await res.json()
      setBeds(b => b.map(x => x.id === bedId ? updated : x))
      setEditGridBedId(null)
    }
  }

  function openGridEdit(bed: GardenBed) {
    setEditGridBedId(bed.id)
    setEditGridCols(bed.gridCols)
    setEditGridRows(bed.gridRows)
    setEditGridCells(parseGridCells(bed.gridCells, bed.gridCols, bed.gridRows))
  }

  function setEditGridColsAndReset(cols: number) {
    setEditGridCols(cols)
    setEditGridCells(Array.from({ length: cols * editGridRows }, (_, i) => i))
  }

  function setEditGridRowsAndReset(rows: number) {
    setEditGridRows(rows)
    setEditGridCells(Array.from({ length: editGridCols * rows }, (_, i) => i))
  }

  async function saveCellAssignments(bedId: string, allAssignments: Record<string, Record<string, string>>) {
    const res = await fetch(`/api/garden/beds/${bedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cellAssignments: JSON.stringify(allAssignments) }),
    })
    if (res.ok) {
      const updated = await res.json()
      setBeds(b => b.map(x => x.id === bedId ? updated : x))
      setSelectingCell(null)
    }
  }

  function getCellAllAssignments(bed: GardenBed): Record<string, Record<string, string>> {
    try { return bed.cellAssignments ? JSON.parse(bed.cellAssignments) : {} } catch { return {} }
  }

  async function assignCell(bedId: string, cellIndex: number, plantId: string) {
    const bed = beds.find(b => b.id === bedId)
    if (!bed) return
    const all = getCellAllAssignments(bed)
    const yearKey = CURRENT_YEAR.toString()
    if (!all[yearKey]) all[yearKey] = {}
    all[yearKey][cellIndex.toString()] = plantId
    await saveCellAssignments(bedId, all)
  }

  async function clearCell(bedId: string, cellIndex: number) {
    const bed = beds.find(b => b.id === bedId)
    if (!bed) return
    const all = getCellAllAssignments(bed)
    const yearKey = CURRENT_YEAR.toString()
    if (all[yearKey]) delete all[yearKey][cellIndex.toString()]
    await saveCellAssignments(bedId, all)
  }

  async function removeBed(id: string) {
    if (!confirm("Beet löschen?")) return
    await fetch(`/api/garden/beds/${id}`, { method: "DELETE" })
    setBeds(b => b.filter(x => x.id !== id))
  }

  async function assignPlantToBed(plantId: string, bedId: string) {
    const unassigned = seasons.find(s => s.plantId === plantId && s.bedId === null)
    let res: Response
    if (unassigned) {
      res = await fetch(`/api/garden/seasons/${unassigned.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bedId }),
      })
      if (res.ok) {
        const updated = await res.json()
        setSeasons(s => s.map(x => x.id === unassigned.id ? updated : x))
        setAssigning(null)
      }
    } else {
      res = await fetch("/api/garden/seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plantId, year: CURRENT_YEAR, bedId }),
      })
      if (res.ok) {
        const newSeason = await res.json()
        setSeasons(s => [...s, newSeason])
        setAssigning(null)
      }
    }
  }

  async function removeFromBed(seasonId: string) {
    const season = seasons.find(s => s.id === seasonId)
    const res = await fetch(`/api/garden/seasons/${seasonId}`, { method: "DELETE" })
    if (res.ok) {
      setSeasons(s => s.filter(x => x.id !== seasonId))
      // Clear cell assignments for this plant in this bed
      if (season?.bedId) {
        const bed = beds.find(b => b.id === season.bedId)
        if (bed) {
          const all = getCellAllAssignments(bed)
          const yearKey = CURRENT_YEAR.toString()
          if (all[yearKey]) {
            Object.keys(all[yearKey]).forEach(k => {
              if (all[yearKey][k] === season.plantId) delete all[yearKey][k]
            })
            await saveCellAssignments(season.bedId, all)
          }
        }
      }
    }
  }

  return (
    <div>
      <button
        onClick={() => setShowAdd(!showAdd)}
        className="w-full border-2 border-dashed border-gray-300 hover:border-primary-400 rounded-xl py-2.5 text-sm text-gray-500 hover:text-primary-600 transition-colors mb-4"
      >
        + Beet anlegen
      </button>

      {showAdd && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 shadow-sm space-y-3">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Beet-Name (z.B. Hochbeet 1)"
            onKeyDown={e => e.key === "Enter" && addBed()}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          <input
            value={newSize}
            onChange={e => setNewSize(e.target.value)}
            placeholder="Beschreibung (optional, z.B. Hochbeet 2×1m)"
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          <select value={newSun} onChange={e => setNewSun(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white">
            <option value="">Standort wählen (optional)</option>
            <option value="Vollsonne">☀️ Vollsonne</option>
            <option value="Halbschatten">🌤 Halbschatten</option>
            <option value="Schatten">🌑 Schatten</option>
          </select>
          <div className="border-t border-gray-100 pt-3">
            <GridEditor
              cols={newGridCols}
              rows={newGridRows}
              activeCells={newActiveCells}
              onToggle={i => setNewActiveCells(prev =>
                prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
              )}
              onAllActive={() => setNewActiveCells(Array.from({ length: newGridCols * newGridRows }, (_, i) => i))}
              onAllInactive={() => setNewActiveCells([])}
              onColsChange={setNewGridCols}
              onRowsChange={setNewGridRows}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={addBed}
              disabled={!newName.trim()}
              className="flex-1 bg-primary-600 text-white py-2 rounded-xl text-sm font-medium disabled:opacity-40"
            >
              Anlegen
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 rounded-xl text-sm text-gray-500 hover:bg-gray-100">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {beds.length === 0 && !showAdd ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">🪴</div>
          <p className="text-sm">Noch keine Beete angelegt</p>
        </div>
      ) : (
        <div className="space-y-3">
          {beds.map(bed => {
            const bedSeasons = seasons.filter(s => s.bedId === bed.id)
            const activeCells = parseGridCells(bed.gridCells, bed.gridCols, bed.gridRows)
            const uniquePlantIds = bedSeasons.map(s => s.plantId).filter((id, i, arr) => arr.indexOf(id) === i)
            const assignments = parseCellAssignments(bed.cellAssignments, CURRENT_YEAR)
            const cellData = buildCellDataFromAssignments(assignments, bedSeasons, uniquePlantIds)

            return (
              <div key={bed.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl">🪴</span>
                  <div className="flex-1 min-w-0">
                    {editId === bed.id ? (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex gap-2">
                          <input
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="flex-1 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                          />
                          <input
                            value={editSize}
                            onChange={e => setEditSize(e.target.value)}
                            placeholder="Beschreibung"
                            className="w-28 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                          />
                        </div>
                        <div className="flex gap-2">
                          <select value={editSun} onChange={e => setEditSun(e.target.value)}
                            className="flex-1 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white">
                            <option value="">Standort (optional)</option>
                            <option value="Vollsonne">☀️ Vollsonne</option>
                            <option value="Halbschatten">🌤 Halbschatten</option>
                            <option value="Schatten">🌑 Schatten</option>
                          </select>
                          <button onClick={() => saveBed(bed.id)} className="text-xs text-primary-600 font-medium px-2">✓</button>
                          <button onClick={() => setEditId(null)} className="text-xs text-gray-400 px-1">✕</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="font-medium text-gray-900 text-sm">{bed.name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          {bed.size && <span>{bed.size}</span>}
                          {bed.sunRequirements && <span>{bed.sunRequirements === "Vollsonne" ? "☀️" : bed.sunRequirements === "Halbschatten" ? "🌤" : "🌑"} {bed.sunRequirements}</span>}
                        </div>
                      </>
                    )}
                  </div>
                  {editId !== bed.id && (
                    <>
                      <button
                        onClick={() => { setEditId(bed.id); setEditName(bed.name); setEditSize(bed.size ?? ""); setEditSun(bed.sunRequirements ?? "") }}
                        className="text-gray-400 hover:text-gray-700 text-xs"
                        title="Name bearbeiten"
                      >✏️</button>
                      <button onClick={() => removeBed(bed.id)} className="text-gray-400 hover:text-red-500 text-xs">🗑️</button>
                    </>
                  )}
                </div>

                {/* Grid visualization */}
                <div className="px-4 pb-3">
                  {editGridBedId === bed.id ? (
                    <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 space-y-3">
                      <GridEditor
                        cols={editGridCols}
                        rows={editGridRows}
                        activeCells={editGridCells}
                        onToggle={i => setEditGridCells(prev =>
                          prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
                        )}
                        onAllActive={() => setEditGridCells(Array.from({ length: editGridCols * editGridRows }, (_, i) => i))}
                        onAllInactive={() => setEditGridCells([])}
                        onColsChange={setEditGridColsAndReset}
                        onRowsChange={setEditGridRowsAndReset}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveGrid(bed.id)}
                          className="flex-1 bg-primary-600 text-white py-1.5 rounded-lg text-xs font-medium"
                        >
                          Raster speichern
                        </button>
                        <button
                          onClick={() => setEditGridBedId(null)}
                          className="px-3 rounded-lg text-xs text-gray-500 hover:bg-gray-100"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="overflow-x-auto pb-1">
                        <BedGrid
                          cols={bed.gridCols}
                          rows={bed.gridRows}
                          activeCells={activeCells}
                          cellData={cellData}
                          highlightedCell={selectingCell?.bedId === bed.id ? selectingCell.cellIndex : null}
                          onCellClick={i => {
                            if (selectingCell?.bedId === bed.id && selectingCell.cellIndex === i) {
                              setSelectingCell(null)
                            } else {
                              setSelectingCell({ bedId: bed.id, cellIndex: i })
                            }
                          }}
                        />
                      </div>

                      {/* Cell plant picker */}
                      {selectingCell?.bedId === bed.id && (
                        <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                          {uniquePlantIds.length === 0 ? (
                            <p className="text-xs text-gray-400">Erst Pflanzen dem Beet zuweisen.</p>
                          ) : (
                            <>
                              <p className="text-xs text-gray-500 mb-1.5">Pflanze wählen:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {uniquePlantIds.map((plantId, pIdx) => {
                                  const season = bedSeasons.find(s => s.plantId === plantId)!
                                  const isAssigned = assignments[selectingCell.cellIndex.toString()] === plantId
                                  return (
                                    <button
                                      key={plantId}
                                      onClick={() => assignCell(bed.id, selectingCell.cellIndex, plantId)}
                                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors"
                                      style={{
                                        backgroundColor: isAssigned ? plantBg(pIdx) : plantBg(pIdx) + "44",
                                        borderColor: plantBg(pIdx),
                                        fontWeight: isAssigned ? 600 : undefined,
                                      }}
                                    >
                                      {season.plant.thumbnailUrl && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={season.plant.thumbnailUrl} alt="" className="w-4 h-4 rounded object-cover shrink-0" />
                                      )}
                                      {plantLabel(season.plant)}
                                    </button>
                                  )
                                })}
                                {assignments[selectingCell.cellIndex.toString()] && (
                                  <button
                                    onClick={() => clearCell(bed.id, selectingCell.cellIndex)}
                                    className="text-xs text-red-500 px-2 py-1 rounded-full border border-red-200 bg-red-50"
                                  >
                                    ✕ Leeren
                                  </button>
                                )}
                                <button onClick={() => setSelectingCell(null)} className="text-xs text-gray-400 px-2 py-1">
                                  Abbrechen
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Legend */}
                      {uniquePlantIds.length > 0 && (
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                          {uniquePlantIds.map((plantId, pIdx) => {
                            const season = bedSeasons.find(s => s.plantId === plantId)!
                            return (
                              <div key={plantId} className="flex items-center gap-1 text-xs text-gray-600">
                                <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: plantBg(pIdx), flexShrink: 0 }} />
                                {plantLabel(season.plant)}
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {uniquePlantIds.length === 0 && (
                        <p className="text-xs text-gray-400 mt-1">Pflanzen zuweisen, dann Zellen anklicken zum Platzieren.</p>
                      )}
                      <button
                        onClick={() => openGridEdit(bed)}
                        className="text-xs text-gray-400 hover:text-primary-600 mt-1.5 block"
                      >
                        Raster anpassen ✏️
                      </button>
                    </div>
                  )}
                </div>

                {/* Plants section */}
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                  {bedSeasons.length === 0 ? (
                    <p className="text-xs text-gray-400">Keine Pflanzen zugewiesen</p>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {bedSeasons.map(s => (
                          <span key={s.id} className="flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            {s.plant.thumbnailUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={s.plant.thumbnailUrl} alt="" className="w-4 h-4 rounded object-cover shrink-0" />
                            ) : "🌱"}
                            {s.plant.name}{s.plant.variety ? ` (${s.plant.variety})` : ""}
                            <button onClick={() => removeFromBed(s.id)} className="text-green-600 hover:text-red-500 ml-0.5">✕</button>
                          </span>
                        ))}
                      </div>
                      {(() => {
                        const bedPlantIds = bedSeasons.map(s => s.plantId).filter((id, i, arr) => arr.indexOf(id) === i)
                        if (bedPlantIds.length < 2) return null
                        const { good, bad } = getCompatibility(bedPlantIds, plants)
                        if (good.length === 0 && bad.length === 0) return null
                        return (
                          <div className="space-y-1 mb-2">
                            {good.map(pair => (
                              <div key={pair} className="flex items-start gap-1.5 text-xs text-green-700 bg-green-50 rounded-lg px-2 py-1.5">
                                <span className="shrink-0">🤝</span>
                                <span><span className="font-medium">{pair}</span> — passen gut zusammen</span>
                              </div>
                            ))}
                            {bad.map(pair => (
                              <div key={pair} className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 rounded-lg px-2 py-1.5">
                                <span className="shrink-0">⚠️</span>
                                <span><span className="font-medium">{pair}</span> — vertragen sich nicht</span>
                              </div>
                            ))}
                          </div>
                        )
                      })()}
                    </>
                  )}

                  {/* Rankhilfe */}
                  {(() => {
                    const supportPlants = bedSeasons
                      .map(s => plants.find(p => p.id === s.plantId))
                      .filter(p => p?.needsSupport)
                    if (supportPlants.length === 0) return null
                    return (
                      <div className="flex items-start gap-1.5 text-xs text-blue-700 bg-blue-50 rounded-lg px-2 py-1.5 mb-2">
                        <span className="shrink-0">🪢</span>
                        <span><span className="font-medium">Rankhilfe nötig:</span> {supportPlants.map(p => p!.name).join(", ")}</span>
                      </div>
                    )
                  })()}

                  {/* Standort-Kompatibilität */}
                  {(() => {
                    if (!bed.sunRequirements) return null
                    const mismatched = bedSeasons
                      .map(s => plants.find(p => p.id === s.plantId))
                      .filter(p => p?.sunRequirements && p.sunRequirements !== bed.sunRequirements)
                    if (mismatched.length === 0) return null
                    return (
                      <div className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5 mb-2">
                        <span className="shrink-0">☀️</span>
                        <span>
                          <span className="font-medium">Standort-Konflikt ({bed.sunRequirements}):</span>{" "}
                          {mismatched.map(p => `${p!.name} (${p!.sunRequirements})`).join(", ")}
                        </span>
                      </div>
                    )
                  })()}

                  {/* Fruchtfolge */}
                  {(() => {
                    const warnings = getRotationWarnings(bed.id, histSeasons, seasons)
                    if (warnings.length === 0) return null
                    return (
                      <div className="space-y-1 mb-2">
                        {warnings.map(w => (
                          <div key={w.plantName} className={`flex items-start gap-1.5 text-xs rounded-lg px-2 py-1.5 ${w.level === "error" ? "text-red-700 bg-red-50" : "text-amber-700 bg-amber-50"}`}>
                            <span className="shrink-0">🔄</span>
                            <span>
                              <span className="font-medium">{w.plantName}</span>
                              {w.level === "error"
                                ? ` — ${w.years.join(", ")}: 3+ Jahre in Folge, Standortwechsel empfohlen`
                                : ` — ${w.years.join(" & ")}: 2. Jahr in Folge`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  })()}

                  {/* Beet-Bewertung */}
                  {bedSeasons.length >= 2 && (() => {
                    const isOpen = evalOpen.has(bed.id)
                    const eval_ = isOpen ? evaluateBed(bed, bedSeasons, plants, seasons) : null
                    const ratingIcon = eval_?.rating === "good" ? "🟢" : eval_?.rating === "okay" ? "🟡" : "🔴"
                    return (
                      <div className="mb-2">
                        <button
                          onClick={() => setEvalOpen(prev => {
                            const next = new Set(prev)
                            if (next.has(bed.id)) next.delete(bed.id)
                            else next.add(bed.id)
                            return next
                          })}
                          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary-600 transition-colors"
                        >
                          <span>📊</span>
                          <span>Beet-Bewertung</span>
                          {eval_ && <span>{ratingIcon}</span>}
                          <span className="text-gray-400">{isOpen ? "▲" : "▼"}</span>
                        </button>
                        {isOpen && eval_ && (
                          <div className="mt-2 space-y-1.5">
                            <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1.5 rounded-lg ${eval_.rating === "good" ? "bg-green-50 text-green-700" : eval_.rating === "okay" ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-700"}`}>
                              <span>{ratingIcon}</span>
                              <span>{eval_.rating === "good" ? "Dieses Beet sieht gut aus!" : eval_.rating === "okay" ? "Kleiner Verbesserungsbedarf" : "Mehrere Probleme gefunden"}</span>
                            </div>
                            {eval_.positives.map((p, i) => (
                              <div key={i} className="flex items-start gap-1.5 text-xs text-green-700 bg-green-50 rounded-lg px-2 py-1.5">
                                <span className="shrink-0">✅</span>
                                <span>{p}</span>
                              </div>
                            ))}
                            {eval_.issues.map(issue => (
                              <div key={issue.key} className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 rounded-lg px-2 py-1.5">
                                <span className="shrink-0">{issue.type === "bad_neighbor" ? "⚔️" : issue.type === "sun_mismatch" ? "☀️" : "💧"}</span>
                                <span>{issue.message}</span>
                              </div>
                            ))}
                            {eval_.suggestions.map(s => (
                              <div key={s.replaceId} className="flex items-start gap-1.5 text-xs text-indigo-700 bg-indigo-50 rounded-lg px-2 py-1.5">
                                <span className="shrink-0">💡</span>
                                <span>
                                  <span className="font-medium">Statt {s.replaceName}</span> passen besser:{" "}
                                  {s.alternatives.map(a => a.name).join(", ")}
                                </span>
                              </div>
                            ))}
                            {eval_.issues.length > 0 && eval_.suggestions.length === 0 && (
                              <div className="flex items-start gap-1.5 text-xs text-gray-500 bg-gray-50 rounded-lg px-2 py-1.5">
                                <span className="shrink-0">💡</span>
                                <span>Keine Alternativen aus dem Saison-Pool verfügbar</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Add plant */}
                  {(() => {
                    const inThisBed = bedSeasons.map(s => s.plantId)
                    const seasonPlantIds = seasons.map(s => s.plantId).filter((id, i, arr) => arr.indexOf(id) === i)
                    const available = plants.filter(p => seasonPlantIds.includes(p.id) && !inThisBed.includes(p.id))
                    if (available.length === 0 && assigning !== bed.id) return (
                      <p className="text-xs text-gray-400 mt-1">Keine weiteren Saisonpflanzen verfügbar — zuerst im Tab Pflanzen zur Saison hinzufügen</p>
                    )
                    return assigning === bed.id ? (
                      <div className="space-y-1 mt-1">
                        <p className="text-xs text-gray-500 mb-1">Pflanze wählen:</p>
                        {available.map(p => (
                          <button
                            key={p.id}
                            onClick={() => assignPlantToBed(p.id, bed.id)}
                            className="flex items-center gap-2 w-full text-left text-xs bg-white border border-gray-200 hover:border-primary-400 rounded-lg px-3 py-1.5"
                          >
                            {p.thumbnailUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.thumbnailUrl} alt="" className="w-5 h-5 rounded object-cover shrink-0" />
                            ) : <span>🌱</span>}
                            {p.name}{p.variety ? ` (${p.variety})` : ""}
                          </button>
                        ))}
                        <button onClick={() => setAssigning(null)} className="text-xs text-gray-400 mt-1">Abbrechen</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAssigning(bed.id)}
                        className="text-xs text-primary-600 hover:underline mt-1 block"
                      >
                        + Pflanze zuweisen
                      </button>
                    )
                  })()}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
