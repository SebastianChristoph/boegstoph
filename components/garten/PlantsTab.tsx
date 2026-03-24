"use client"

import { useCallback, useEffect, useState } from "react"

interface NeighborRef { id: string; name: string; variety: string | null }

interface GardenPlant {
  id: string
  name: string
  variety: string | null
  vorzuchtMonat: number | null
  aussaatMonat: number | null
  sunRequirements: string | null
  waterRequirements: string | null
  rowSpacing: number | null
  openfarmSlug: string | null
  openfarmData: unknown
  thumbnailUrl: string | null
  notes: string | null
  goodNeighbors: NeighborRef[]
  badNeighbors: NeighborRef[]
  ownGoodNeighborIds: string[]
  ownBadNeighborIds: string[]
}

interface OpenfarmCrop {
  id: string
  source?: "local" | "growstuff"
  attributes: {
    name: string
    slug: string
    description: string | null
    sun_requirements: string | null
    sowing_method: string | null
    spread: number | null
    row_spacing: number | null
    height: number | null
    growing_degree_days: number | null
    harvest_days?: number | null
    thumbnail_url?: string | null
  }
}

const CURRENT_YEAR = new Date().getFullYear()

const MONTH_LABELS = ["", "Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]

const SUN_LABELS: Record<string, string> = { Vollsonne: "☀️ Vollsonne", Halbschatten: "🌤 Halbschatten", Schatten: "🌑 Schatten" }
const WATER_LABELS: Record<string, string> = { niedrig: "💧 niedrig", mittel: "💧💧 mittel", hoch: "💧💧💧 hoch" }

const emptyForm = () => ({
  name: "", variety: "",
  vorzuchtMonat: "", aussaatMonat: "",
  sunRequirements: "", waterRequirements: "", rowSpacing: "",
  thumbnailUrl: "", notes: "",
  goodNeighborIds: [] as string[],
  badNeighborIds: [] as string[],
})

export default function PlantsTab() {
  const [plants, setPlants] = useState<GardenPlant[]>([])
  const [seasonPlantIds, setSeasonPlantIds] = useState<Set<string>>(new Set())
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [openfarmQuery, setOpenfarmQuery] = useState("")
  const [openfarmResults, setOpenfarmResults] = useState<OpenfarmCrop[]>([])
  const [searching, setSearching] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [addingToSeason, setAddingToSeason] = useState<string | null>(null)
  const [showNeighbors, setShowNeighbors] = useState(false)

  const load = useCallback(async () => {
    const [plantsRes, seasonsRes] = await Promise.all([
      fetch("/api/garden/plants"),
      fetch(`/api/garden/seasons?year=${CURRENT_YEAR}`),
    ])
    if (plantsRes.ok) setPlants(await plantsRes.json())
    if (seasonsRes.ok) {
      const seasons: { plantId: string }[] = await seasonsRes.json()
      setSeasonPlantIds(new Set(seasons.map(s => s.plantId)))
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setForm(emptyForm()); setOpenfarmResults([]); setOpenfarmQuery("")
    setShowAdd(true); setEditId(null); setShowNeighbors(false)
  }
  function openEdit(p: GardenPlant) {
    setForm({
      name: p.name, variety: p.variety ?? "",
      vorzuchtMonat: p.vorzuchtMonat?.toString() ?? "",
      aussaatMonat: p.aussaatMonat?.toString() ?? "",
      sunRequirements: p.sunRequirements ?? "",
      waterRequirements: p.waterRequirements ?? "",
      rowSpacing: p.rowSpacing?.toString() ?? "",
      thumbnailUrl: p.thumbnailUrl ?? "",
      notes: p.notes ?? "",
      goodNeighborIds: p.ownGoodNeighborIds,
      badNeighborIds: p.ownBadNeighborIds,
    })
    setEditId(p.id); setShowAdd(false); setOpenfarmResults([]); setOpenfarmQuery("")
    setShowNeighbors(false)
  }

  async function searchOpenfarm() {
    if (!openfarmQuery.trim()) return
    setSearching(true)
    const res = await fetch(`/api/garden/openfarm?q=${encodeURIComponent(openfarmQuery)}`)
    if (res.ok) {
      const data = await res.json()
      setOpenfarmResults((data.data ?? []).slice(0, 5))
    }
    setSearching(false)
  }

  function applyOpenfarm(crop: OpenfarmCrop) {
    const a = crop.attributes
    setForm(f => ({
      ...f,
      name: f.name || a.name,
      thumbnailUrl: a.thumbnail_url ?? f.thumbnailUrl,
    }))
    setOpenfarmResults([])
  }

  function toggleNeighbor(id: string, type: "good" | "bad") {
    setForm(f => {
      const goodIds = f.goodNeighborIds.filter(x => x !== id)
      const badIds = f.badNeighborIds.filter(x => x !== id)
      if (type === "good" && !f.goodNeighborIds.includes(id)) return { ...f, goodNeighborIds: [...goodIds, id], badNeighborIds: badIds }
      if (type === "bad" && !f.badNeighborIds.includes(id)) return { ...f, goodNeighborIds: goodIds, badNeighborIds: [...badIds, id] }
      // clicking same type again → remove
      return { ...f, goodNeighborIds: goodIds, badNeighborIds: badIds }
    })
  }

  async function save() {
    const method = editId ? "PATCH" : "POST"
    const url = editId ? `/api/garden/plants/${editId}` : "/api/garden/plants"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      await load()
      setShowAdd(false)
      setEditId(null)
    }
  }

  async function remove(id: string) {
    if (!confirm("Pflanze löschen? Alle Saisons werden ebenfalls gelöscht.")) return
    await fetch(`/api/garden/plants/${id}`, { method: "DELETE" })
    setPlants(p => p.filter(x => x.id !== id))
  }

  async function addToSeason(plantId: string) {
    setAddingToSeason(plantId)
    const res = await fetch("/api/garden/seasons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plantId, year: CURRENT_YEAR }),
    })
    setAddingToSeason(null)
    if (res.ok) {
      setSeasonPlantIds(prev => new Set([...Array.from(prev), plantId]))
      alert(`Zur Saison ${CURRENT_YEAR} hinzugefügt! Todos wurden automatisch generiert.`)
    }
  }

  // Plants available for neighbor selection (excluding current plant)
  const neighborCandidates = plants.filter(p => p.id !== editId)

  const formFields = (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Name *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="z.B. Tomate" className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Sorte</label>
          <input value={form.variety} onChange={e => setForm(f => ({ ...f, variety: e.target.value }))}
            placeholder="z.B. Cherry" className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Vorzucht-Monat</label>
          <select value={form.vorzuchtMonat} onChange={e => setForm(f => ({ ...f, vorzuchtMonat: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white">
            <option value="">—</option>
            {MONTH_LABELS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Aussaat-Monat</label>
          <select value={form.aussaatMonat} onChange={e => setForm(f => ({ ...f, aussaatMonat: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white">
            <option value="">—</option>
            {MONTH_LABELS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Standort</label>
          <select value={form.sunRequirements} onChange={e => setForm(f => ({ ...f, sunRequirements: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white">
            <option value="">—</option>
            <option value="Vollsonne">☀️ Vollsonne</option>
            <option value="Halbschatten">🌤 Halbschatten</option>
            <option value="Schatten">🌑 Schatten</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Bewässerung</label>
          <select value={form.waterRequirements} onChange={e => setForm(f => ({ ...f, waterRequirements: e.target.value }))}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white">
            <option value="">—</option>
            <option value="niedrig">💧 niedrig</option>
            <option value="mittel">💧💧 mittel</option>
            <option value="hoch">💧💧💧 hoch</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Reihenabstand (cm)</label>
        <input type="number" value={form.rowSpacing} onChange={e => setForm(f => ({ ...f, rowSpacing: e.target.value }))}
          placeholder="z.B. 40" className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
      </div>

      {/* Plant search */}
      <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
        <p className="text-xs text-gray-500 mb-2">🔍 Pflanze suchen (optional)</p>
        <div className="flex gap-2">
          <input value={openfarmQuery} onChange={e => setOpenfarmQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && searchOpenfarm()}
            placeholder="Pflanze suchen…" className="flex-1 border border-gray-300 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
          <button onClick={searchOpenfarm} disabled={searching}
            className="bg-primary-600 text-white px-3 py-1.5 rounded-xl text-sm disabled:opacity-60 flex items-center gap-1.5 min-w-[70px] justify-center">
            {searching ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Suche…
              </>
            ) : "Suche"}
          </button>
        </div>
        {openfarmResults.length > 0 && (
          <ul className="mt-2 space-y-1">
            {openfarmResults.map(c => (
              <li key={c.id}>
                <button onClick={() => applyOpenfarm(c)}
                  className="w-full text-left px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-primary-400 text-sm flex items-center gap-2">
                  {c.attributes.thumbnail_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.attributes.thumbnail_url} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{c.attributes.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${c.source === "local" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                        {c.source === "local" ? "Lokale DB" : "Growstuff"}
                      </span>
                    </div>
                    {c.attributes.sun_requirements && <div className="text-gray-400 text-xs">{c.attributes.sun_requirements}</div>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Notizen */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Notizen zur Pflanze</label>
        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Erfahrungen, Besonderheiten…" rows={2}
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" />
      </div>

      {/* Nachbarschaft */}
      {neighborCandidates.length > 0 && (
        <div className="text-sm">
          <button type="button" onClick={() => setShowNeighbors(n => !n)}
            className="text-xs text-gray-500 select-none flex items-center gap-1">
            <span>{showNeighbors ? "▲" : "▼"}</span> Nachbarschaft festlegen (optional)
          </button>
          {showNeighbors && (
            <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {neighborCandidates.map(p => {
                const isGood = form.goodNeighborIds.includes(p.id)
                const isBad = form.badNeighborIds.includes(p.id)
                const label = `${p.name}${p.variety ? ` · ${p.variety}` : ""}`
                return (
                  <div key={p.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1.5">
                    <span className="flex-1 text-xs text-gray-700 truncate">{label}</span>
                    <button onClick={() => toggleNeighbor(p.id, "good")}
                      title="Guter Nachbar"
                      className={`text-xs px-2 py-0.5 rounded-lg transition-colors ${isGood ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500 hover:bg-green-100"}`}>
                      🤝
                    </button>
                    <button onClick={() => toggleNeighbor(p.id, "bad")}
                      title="Schlechter Nachbar"
                      className={`text-xs px-2 py-0.5 rounded-lg transition-colors ${isBad ? "bg-red-500 text-white" : "bg-gray-200 text-gray-500 hover:bg-red-100"}`}>
                      🚫
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}


      <div className="flex gap-2 pt-1">
        <button onClick={save} disabled={!form.name.trim()}
          className="flex-1 bg-primary-600 text-white py-2 rounded-xl text-sm font-medium disabled:opacity-40">
          Speichern
        </button>
        <button onClick={() => { setShowAdd(false); setEditId(null) }}
          className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100">
          Abbrechen
        </button>
      </div>
    </div>
  )

  return (
    <div>
      {!showAdd && !editId && (
        <button onClick={openAdd}
          className="w-full border-2 border-dashed border-gray-300 hover:border-primary-400 rounded-xl py-3 text-sm text-gray-500 hover:text-primary-600 transition-colors mb-4">
          + Pflanze hinzufügen
        </button>
      )}

      {showAdd && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 text-sm mb-3">Neue Pflanze</h3>
          {formFields}
        </div>
      )}

      {plants.length === 0 && !showAdd ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">🌱</div>
          <p className="text-sm">Noch keine Pflanzen angelegt</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {plants.map(plant => (
            <li key={plant.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              {editId === plant.id ? (
                <div className="p-4">
                  <h3 className="font-semibold text-gray-800 text-sm mb-3">Pflanze bearbeiten</h3>
                  {formFields}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 px-4 py-3">
                    {plant.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={plant.thumbnailUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                    ) : (
                      <span className="text-xl shrink-0">🌱</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm flex items-center gap-1.5 flex-wrap">
                        {plant.name}{plant.variety && <span className="text-gray-400 font-normal">· {plant.variety}</span>}
                        {seasonPlantIds.has(plant.id)
                          ? <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">{CURRENT_YEAR} ✓</span>
                          : <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">nicht in Saison</span>
                        }
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                        {plant.vorzuchtMonat && <span>🌱 Vorzucht: {MONTH_LABELS[plant.vorzuchtMonat]}</span>}
                        {plant.vorzuchtMonat && <span>🌿 Auspflanzen: Mitte Mai</span>}
                        {plant.aussaatMonat && <span>🪴 Direktaussaat: {MONTH_LABELS[plant.aussaatMonat]}</span>}
                        {plant.sunRequirements && <span>{SUN_LABELS[plant.sunRequirements]}</span>}
                        {plant.goodNeighbors.length > 0 && <span className="text-green-600">🤝 {plant.goodNeighbors.length}</span>}
                        {plant.badNeighbors.length > 0 && <span className="text-red-500">🚫 {plant.badNeighbors.length}</span>}
                      </div>
                    </div>
                    <button onClick={() => setExpandedId(expandedId === plant.id ? null : plant.id)}
                      className="text-gray-400 hover:text-gray-700 text-xs px-2">
                      {expandedId === plant.id ? "▲" : "▼"}
                    </button>
                    <button onClick={() => openEdit(plant)} className="text-gray-400 hover:text-gray-700 text-xs">✏️</button>
                    <button onClick={() => remove(plant.id)} className="text-gray-400 hover:text-red-500 text-xs">🗑️</button>
                  </div>

                  {expandedId === plant.id && (
                    <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        {plant.vorzuchtMonat && <div>🌱 Vorzucht: <span className="font-medium">{MONTH_LABELS[plant.vorzuchtMonat]}</span></div>}
                        {plant.vorzuchtMonat && <div>🌿 Auspflanzen: <span className="font-medium">Mitte Mai (Eisheilige)</span></div>}
                        {plant.aussaatMonat && <div>🪴 Direktaussaat: <span className="font-medium">{MONTH_LABELS[plant.aussaatMonat]}</span></div>}
                        {plant.sunRequirements && <div>{SUN_LABELS[plant.sunRequirements] ?? plant.sunRequirements}</div>}
                        {plant.waterRequirements && <div>{WATER_LABELS[plant.waterRequirements] ?? plant.waterRequirements}</div>}
                        {plant.rowSpacing && <div>↔ Reihe: <span className="font-medium">{plant.rowSpacing} cm</span></div>}
                      </div>
                      {plant.notes && (
                        <div className="text-xs text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-100">
                          📝 {plant.notes}
                        </div>
                      )}
                      {(plant.goodNeighbors.length > 0 || plant.badNeighbors.length > 0) && (
                        <div className="space-y-1">
                          {plant.goodNeighbors.length > 0 && (
                            <div className="text-xs">
                              <span className="text-green-700 font-medium">🤝 Gute Nachbarn: </span>
                              <span className="text-gray-600">{plant.goodNeighbors.map(n => n.name + (n.variety ? ` · ${n.variety}` : "")).join(", ")}</span>
                            </div>
                          )}
                          {plant.badNeighbors.length > 0 && (
                            <div className="text-xs">
                              <span className="text-red-600 font-medium">🚫 Schlechte Nachbarn: </span>
                              <span className="text-gray-600">{plant.badNeighbors.map(n => n.name + (n.variety ? ` · ${n.variety}` : "")).join(", ")}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {seasonPlantIds.has(plant.id) ? (
                        <div className="text-xs text-green-700 bg-green-50 rounded-xl py-1.5 text-center font-medium">
                          ✓ In Saison {CURRENT_YEAR}
                        </div>
                      ) : (
                        <button
                          onClick={() => addToSeason(plant.id)}
                          disabled={addingToSeason === plant.id}
                          className="w-full bg-green-600 hover:bg-green-700 text-white py-1.5 rounded-xl text-xs font-medium disabled:opacity-40">
                          {addingToSeason === plant.id ? "…" : `+ Zur Saison ${CURRENT_YEAR} hinzufügen`}
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
