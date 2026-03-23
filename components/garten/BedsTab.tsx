"use client"

import { useCallback, useEffect, useState } from "react"

interface GardenBed {
  id: string
  name: string
  size: string | null
}

interface GardenPlant {
  id: string
  name: string
  variety: string | null
}

interface GardenSeason {
  id: string
  year: number
  bedId: string | null
  plant: { name: string; variety: string | null }
}

const CURRENT_YEAR = new Date().getFullYear()

export default function BedsTab() {
  const [beds, setBeds] = useState<GardenBed[]>([])
  const [seasons, setSeasons] = useState<GardenSeason[]>([])
  const [plants, setPlants] = useState<GardenPlant[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState("")
  const [newSize, setNewSize] = useState("")
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editSize, setEditSize] = useState("")
  const [assigning, setAssigning] = useState<string | null>(null) // bedId being assigned to

  const load = useCallback(async () => {
    const [bedsRes, seasonsRes, plantsRes] = await Promise.all([
      fetch("/api/garden/beds"),
      fetch(`/api/garden/seasons?year=${CURRENT_YEAR}`),
      fetch("/api/garden/plants"),
    ])
    if (bedsRes.ok) setBeds(await bedsRes.json())
    if (seasonsRes.ok) setSeasons(await seasonsRes.json())
    if (plantsRes.ok) setPlants(await plantsRes.json())
  }, [])

  useEffect(() => { load() }, [load])

  async function addBed() {
    if (!newName.trim()) return
    const res = await fetch("/api/garden/beds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, size: newSize }),
    })
    if (res.ok) {
      const bed = await res.json()
      setBeds(b => [...b, bed])
      setNewName(""); setNewSize(""); setShowAdd(false)
    }
  }

  async function saveBed(id: string) {
    const res = await fetch(`/api/garden/beds/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, size: editSize }),
    })
    if (res.ok) {
      const updated = await res.json()
      setBeds(b => b.map(x => x.id === id ? updated : x))
      setEditId(null)
    }
  }

  async function removeBed(id: string) {
    if (!confirm("Beet löschen?")) return
    await fetch(`/api/garden/beds/${id}`, { method: "DELETE" })
    setBeds(b => b.filter(x => x.id !== id))
  }

  async function assignPlantToBed(plantId: string, bedId: string) {
    // Always create a new season for this plant+bed combination
    const res = await fetch("/api/garden/seasons", {
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

  async function removeFromBed(seasonId: string) {
    const res = await fetch(`/api/garden/seasons/${seasonId}`, { method: "DELETE" })
    if (res.ok) setSeasons(s => s.filter(x => x.id !== seasonId))
  }

  return (
    <div>
      <button onClick={() => setShowAdd(!showAdd)}
        className="w-full border-2 border-dashed border-gray-300 hover:border-primary-400 rounded-xl py-2.5 text-sm text-gray-500 hover:text-primary-600 transition-colors mb-4">
        + Beet anlegen
      </button>

      {showAdd && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 shadow-sm">
          <div className="space-y-3">
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Beet-Name (z.B. Hochbeet 1)" onKeyDown={e => e.key === "Enter" && addBed()}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
            <input value={newSize} onChange={e => setNewSize(e.target.value)}
              placeholder="Größe (optional, z.B. 2x1m)"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
            <div className="flex gap-2">
              <button onClick={addBed} disabled={!newName.trim()}
                className="flex-1 bg-primary-600 text-white py-2 rounded-xl text-sm font-medium disabled:opacity-40">
                Anlegen
              </button>
              <button onClick={() => setShowAdd(false)} className="px-4 rounded-xl text-sm text-gray-500 hover:bg-gray-100">Abbrechen</button>
            </div>
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
            return (
              <div key={bed.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl">🪴</span>
                  <div className="flex-1 min-w-0">
                    {editId === bed.id ? (
                      <div className="flex gap-2">
                        <input value={editName} onChange={e => setEditName(e.target.value)}
                          className="flex-1 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                        <input value={editSize} onChange={e => setEditSize(e.target.value)}
                          placeholder="Größe" className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
                        <button onClick={() => saveBed(bed.id)} className="text-xs text-primary-600 font-medium px-1">✓</button>
                        <button onClick={() => setEditId(null)} className="text-xs text-gray-400 px-1">✕</button>
                      </div>
                    ) : (
                      <>
                        <div className="font-medium text-gray-900 text-sm">{bed.name}</div>
                        {bed.size && <div className="text-xs text-gray-500">{bed.size}</div>}
                      </>
                    )}
                  </div>
                  {editId !== bed.id && <>
                    <button onClick={() => { setEditId(bed.id); setEditName(bed.name); setEditSize(bed.size ?? "") }}
                      className="text-gray-400 hover:text-gray-700 text-xs">✏️</button>
                    <button onClick={() => removeBed(bed.id)} className="text-gray-400 hover:text-red-500 text-xs">🗑️</button>
                  </>}
                </div>

                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                  {bedSeasons.length === 0 ? (
                    <p className="text-xs text-gray-400">Keine Pflanzen zugewiesen</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {bedSeasons.map(s => (
                        <span key={s.id} className="flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          🌱 {s.plant.name}{s.plant.variety ? ` (${s.plant.variety})` : ""}
                          <button onClick={() => removeFromBed(s.id)} className="text-green-600 hover:text-red-500 ml-0.5">✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                  {plants.length > 0 && (
                    assigning === bed.id ? (
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 mb-1">Pflanze wählen:</p>
                        {plants.map(p => (
                          <button key={p.id} onClick={() => assignPlantToBed(p.id, bed.id)}
                            className="block w-full text-left text-xs bg-white border border-gray-200 hover:border-primary-400 rounded-lg px-3 py-1.5">
                            🌱 {p.name}{p.variety ? ` (${p.variety})` : ""}
                          </button>
                        ))}
                        <button onClick={() => setAssigning(null)} className="text-xs text-gray-400 mt-1">Abbrechen</button>
                      </div>
                    ) : (
                      <button onClick={() => setAssigning(bed.id)}
                        className="text-xs text-primary-600 hover:underline">+ Pflanze zuweisen</button>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
