"use client"

import { useState, useEffect, useCallback } from "react"

const CURRENT_YEAR = new Date().getFullYear()

const HERB_KEYWORDS = ["dill", "koriander", "basilikum", "minze", "thymian", "rosmarin", "petersilie", "schnittlauch", "liebstöckl", "salbei", "oregano", "lavendel", "kräuter"]
const UNITS = ["Stück", "Handvoll", "g", "kg"]

function defaultUnit(plantName: string) {
  const lower = plantName.toLowerCase()
  return HERB_KEYWORDS.some(k => lower.includes(k)) ? "Handvoll" : "Stück"
}

interface HarvestEntry {
  id: string
  plantName: string
  quantity: number
  unit: string
  harvestDate: string
  notes: string | null
}

interface SeasonPlant {
  plant: { name: string }
}

function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function HarvestTab() {
  const [entries, setEntries] = useState<HarvestEntry[]>([])
  const [seasonPlants, setSeasonPlants] = useState<string[]>([])
  const [showForm, setShowForm] = useState(false)
  const [plantName, setPlantName] = useState("")
  const [customPlant, setCustomPlant] = useState("")
  const [quantity, setQuantity] = useState("")
  const [unit, setUnit] = useState("Stück")
  const [harvestDate, setHarvestDate] = useState(todayISO())
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/garden/harvest?year=${CURRENT_YEAR}`)
    if (res.ok) setEntries(await res.json())
  }, [])

  useEffect(() => {
    load()
    fetch(`/api/garden/seasons?year=${CURRENT_YEAR}`)
      .then(r => r.ok ? r.json() : [])
      .then((seasons: SeasonPlant[]) => {
        const names = [...new Set(seasons.map((s: SeasonPlant) => s.plant.name))].sort()
        setSeasonPlants(names)
      })
  }, [load])

  function handlePlantSelect(name: string) {
    setPlantName(name)
    if (name !== "__custom__") setUnit(defaultUnit(name))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const finalPlant = plantName === "__custom__" ? customPlant.trim() : plantName
    if (!finalPlant || !quantity) return
    setSaving(true)
    await fetch("/api/garden/harvest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plantName: finalPlant, quantity: parseFloat(quantity), unit, harvestDate, notes }),
    })
    setPlantName("")
    setCustomPlant("")
    setQuantity("")
    setUnit("Stück")
    setHarvestDate(todayISO())
    setNotes("")
    setShowForm(false)
    setSaving(false)
    load()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/garden/harvest/${id}`, { method: "DELETE" })
    load()
  }

  // group entries by date
  const grouped: Record<string, HarvestEntry[]> = {}
  for (const e of entries) {
    const key = fmtDate(e.harvestDate)
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(e)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Ernte {CURRENT_YEAR}</p>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          {showForm ? "✕ Abbrechen" : "＋ Ernte eintragen"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 space-y-3">
          {/* Plant picker */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Pflanze</label>
            <select
              value={plantName}
              onChange={e => handlePlantSelect(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-400"
              required
            >
              <option value="">-- Pflanze wählen --</option>
              {seasonPlants.map(n => <option key={n} value={n}>{n}</option>)}
              <option value="__custom__">Andere…</option>
            </select>
            {plantName === "__custom__" && (
              <input
                type="text"
                value={customPlant}
                onChange={e => { setCustomPlant(e.target.value); setUnit(defaultUnit(e.target.value)) }}
                placeholder="Pflanze eingeben…"
                className="mt-2 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                required
              />
            )}
          </div>

          {/* Quantity + Unit */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Menge</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="z.B. 3"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                required
              />
            </div>
            <div className="w-32">
              <label className="block text-xs text-gray-500 mb-1">Einheit</label>
              <select
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-400"
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Erntedatum</label>
            <input
              type="date"
              value={harvestDate}
              onChange={e => setHarvestDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Notiz (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="z.B. sehr gute Qualität"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-primary-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Speichern…" : "Eintragen"}
          </button>
        </form>
      )}

      {/* Entries */}
      {entries.length === 0 && !showForm && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">🧺</div>
          <p className="text-sm">Noch keine Ernte eingetragen.</p>
        </div>
      )}

      {Object.entries(grouped).map(([date, items]) => (
        <div key={date} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="text-xs font-medium text-gray-400 mb-3">{date}</div>
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-800">{item.plantName}</span>
                  <span className="text-sm text-gray-500 ml-2">{item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(1)} {item.unit}</span>
                  {item.notes && <span className="text-xs text-gray-400 ml-2">· {item.notes}</span>}
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none shrink-0"
                  title="Löschen"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
