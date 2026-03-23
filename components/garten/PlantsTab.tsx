"use client"

import { useCallback, useEffect, useState } from "react"

interface GardenPlant {
  id: string
  name: string
  variety: string | null
  sowingMethod: string
  weeksIndoor: number | null
  weeksToPike: number | null
  daysToMaturity: number | null
  harvestDays: number | null
  openfarmSlug: string | null
  openfarmData: unknown
  thumbnailUrl: string | null
}

interface OpenfarmCrop {
  id: string
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

const METHOD_LABELS: Record<string, string> = {
  INDOOR: "Voranzucht",
  DIRECT: "Direktaussaat",
  BOTH: "Beides",
}

const emptyForm = () => ({
  name: "", variety: "", sowingMethod: "INDOOR",
  weeksIndoor: "", weeksToPike: "", daysToMaturity: "", harvestDays: "",
  thumbnailUrl: "",
})

export default function PlantsTab() {
  const [plants, setPlants] = useState<GardenPlant[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [openfarmQuery, setOpenfarmQuery] = useState("")
  const [openfarmResults, setOpenfarmResults] = useState<OpenfarmCrop[]>([])
  const [searching, setSearching] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [addingToSeason, setAddingToSeason] = useState<string | null>(null)
  const [showTimeline, setShowTimeline] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch("/api/garden/plants")
    if (res.ok) setPlants(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd() { setForm(emptyForm()); setOpenfarmResults([]); setOpenfarmQuery(""); setShowAdd(true); setEditId(null); setShowTimeline(false) }
  function openEdit(p: GardenPlant) {
    setForm({
      name: p.name, variety: p.variety ?? "", sowingMethod: p.sowingMethod,
      weeksIndoor: p.weeksIndoor?.toString() ?? "",
      weeksToPike: p.weeksToPike?.toString() ?? "",
      daysToMaturity: p.daysToMaturity?.toString() ?? "",
      harvestDays: p.harvestDays?.toString() ?? "",
      thumbnailUrl: p.thumbnailUrl ?? "",
    })
    setEditId(p.id); setShowAdd(false); setOpenfarmResults([]); setOpenfarmQuery(""); setShowTimeline(false)
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
      daysToMaturity: a.growing_degree_days ? Math.round(a.growing_degree_days / 15).toString() : f.daysToMaturity,
      harvestDays: a.harvest_days ? a.harvest_days.toString() : f.harvestDays,
      sowingMethod: a.sowing_method?.toLowerCase().includes("direct") ? "DIRECT" : f.sowingMethod,
      thumbnailUrl: a.thumbnail_url ?? f.thumbnailUrl,
    }))
    setOpenfarmResults([])
    setShowTimeline(true)
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
      alert(`Zur Saison ${CURRENT_YEAR} hinzugefügt! Todos wurden automatisch generiert.`)
    }
  }

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
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Anzuchtmethode</label>
        <div className="flex gap-2">
          {(["INDOOR", "DIRECT", "BOTH"] as const).map(m => (
            <button key={m} onClick={() => setForm(f => ({ ...f, sowingMethod: m }))}
              className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-colors ${form.sowingMethod === m ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {METHOD_LABELS[m]}
            </button>
          ))}
        </div>
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
                  <div className="min-w-0">
                    <div className="font-medium">{c.attributes.name}</div>
                    {c.attributes.sun_requirements && <div className="text-gray-400 text-xs">{c.attributes.sun_requirements}</div>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Timeline overrides */}
      <div className="text-sm">
        <button type="button" onClick={() => setShowTimeline(t => !t)}
          className="text-xs text-gray-500 select-none flex items-center gap-1">
          <span>{showTimeline ? "▲" : "▼"}</span> Zeitplan anpassen (optional)
        </button>
        {showTimeline && (
          <div className="grid grid-cols-2 gap-3 mt-2">
            {[
              { key: "weeksIndoor", label: "Wochen Voranzucht", placeholder: "Standard: 8" },
              { key: "weeksToPike", label: "Wochen bis Pikieren", placeholder: "Standard: 4" },
              { key: "daysToMaturity", label: "Tage bis Ernte", placeholder: "Standard: 60" },
              { key: "harvestDays", label: "Erntefenster (Tage)", placeholder: "Standard: 30" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                <input type="number" value={(form as Record<string, string>)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full border border-gray-300 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
            ))}
          </div>
        )}
      </div>

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
                      <div className="font-medium text-gray-900 text-sm">
                        {plant.name}{plant.variety && <span className="text-gray-400 font-normal ml-1">· {plant.variety}</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{METHOD_LABELS[plant.sowingMethod]}</div>
                    </div>
                    <button onClick={() => setExpandedId(expandedId === plant.id ? null : plant.id)}
                      className="text-gray-400 hover:text-gray-700 text-xs px-2">
                      {expandedId === plant.id ? "▲" : "▼"}
                    </button>
                    <button onClick={() => openEdit(plant)} className="text-gray-400 hover:text-gray-700 text-xs">✏️</button>
                    <button onClick={() => remove(plant.id)} className="text-gray-400 hover:text-red-500 text-xs">🗑️</button>
                  </div>

                  {expandedId === plant.id && (
                    <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                        <div>🌱 Voranzucht: <span className="font-medium">{plant.weeksIndoor ?? 8} Wo. vor Eisheiligen</span></div>
                        <div>🪴 Pikieren: <span className="font-medium">{plant.weeksToPike ?? 4} Wo. nach Aussaat</span></div>
                        <div>🥬 Reifezeit: <span className="font-medium">{plant.daysToMaturity ?? 60} Tage</span></div>
                        <div>📅 Ernte: <span className="font-medium">{plant.harvestDays ?? 30} Tage Fenster</span></div>
                      </div>
                      <button
                        onClick={() => addToSeason(plant.id)}
                        disabled={addingToSeason === plant.id}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-1.5 rounded-xl text-xs font-medium disabled:opacity-40">
                        {addingToSeason === plant.id ? "…" : `+ Zur Saison ${CURRENT_YEAR} hinzufügen`}
                      </button>
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
