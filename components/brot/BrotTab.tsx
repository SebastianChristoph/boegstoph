"use client"

import { useEffect, useRef, useState } from "react"
import type { SauerteigBatch, SauerteigTodo } from "@prisma/client"

// ── Types ─────────────────────────────────────────────────────────────────────

type BatchWithTodos = SauerteigBatch & { todos: SauerteigTodo[] }
type SubTab = "sauerteig" | "rezepte"

// ── DB Recipe type ─────────────────────────────────────────────────────────────

interface DbRecipe {
  id: string
  name: string
  emoji: string
  beschreibung: string
  schwierigkeit: string
  backzeit: string
  gesamtzeit: string
  ergebnis: string
  mehltyp: string
  imageUrl: string | null
  zutaten: string  // JSON
  schritte: string // JSON
  createdAt: string
  updatedAt: string
}

function parseZutaten(r: DbRecipe): string[] {
  try { return JSON.parse(r.zutaten) } catch { return [] }
}
function parseSchritte(r: DbRecipe): string[] {
  try { return JSON.parse(r.schritte) } catch { return [] }
}

// ── Sauerteig constants ───────────────────────────────────────────────────────

const TYPE_EMOJI: Record<string, string> = { Roggen: "🌾", Weizen: "🌿", Dinkel: "✨" }
const TYPE_TEMP: Record<string, string> = {
  Roggen: "26–28°C",
  Weizen: "24–26°C",
  Dinkel: "22–24°C",
}
const TYPE_MEHL: Record<string, string> = {
  Roggen: "Roggenmehl Type 1150",
  Weizen: "Weizenmehl Type 550",
  Dinkel: "Dinkelmehl Type 1050",
}

// ── Difficulty badge ──────────────────────────────────────────────────────────

function DiffBadge({ diff }: { diff: string }) {
  const colors: Record<string, string> = {
    "Anfänger": "bg-green-100 text-green-700",
    "Mittel": "bg-amber-100 text-amber-700",
    "Fortgeschritten": "bg-red-100 text-red-700",
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[diff] ?? "bg-gray-100 text-gray-600"}`}>{diff}</span>
  )
}

// ── Recipe card ───────────────────────────────────────────────────────────────

function RecipeCard({
  recipe,
  onClick,
  onEdit,
  onDelete,
}: {
  recipe: DbRecipe
  onClick: () => void
  onEdit: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="relative text-left bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md hover:border-amber-300 transition-all group">
      {/* Edit / Delete buttons */}
      <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/90 hover:bg-amber-50 border border-gray-200 text-gray-500 hover:text-amber-600 text-sm shadow-sm"
          title="Bearbeiten"
        >✏️</button>
        <button
          onClick={onDelete}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/90 hover:bg-red-50 border border-gray-200 text-gray-500 hover:text-red-500 text-sm shadow-sm"
          title="Löschen"
        >🗑️</button>
      </div>

      <button onClick={onClick} className="w-full text-left">
        {/* Image */}
        <div className="h-40 bg-amber-50 overflow-hidden flex items-center justify-center">
          {recipe.imageUrl && !imgError ? (
            <img
              src={recipe.imageUrl}
              alt={recipe.name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="text-5xl">{recipe.emoji}</span>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <div className="flex items-start justify-between gap-1 mb-1">
            <span className="font-semibold text-gray-900 text-sm leading-snug">{recipe.emoji} {recipe.name}</span>
          </div>
          <DiffBadge diff={recipe.schwierigkeit} />
          <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">{recipe.beschreibung}</p>
          <div className="flex gap-3 mt-3 text-xs text-gray-400">
            <span>🕐 {recipe.backzeit}</span>
            <span>⏱ {recipe.gesamtzeit}</span>
            <span>🍞 {recipe.ergebnis}</span>
          </div>
        </div>
      </button>
    </div>
  )
}

// ── Recipe detail modal ───────────────────────────────────────────────────────

function RecipeModal({ recipe, onClose }: { recipe: DbRecipe; onClose: () => void }) {
  const [imgError, setImgError] = useState(false)
  const zutaten = parseZutaten(recipe)
  const schritte = parseSchritte(recipe)

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-xl w-full max-w-lg max-h-[90dvh] flex flex-col">
        {/* Header image */}
        <div className="h-48 bg-amber-50 relative overflow-hidden shrink-0 rounded-t-3xl md:rounded-t-2xl">
          {recipe.imageUrl && !imgError ? (
            <img
              src={recipe.imageUrl}
              alt={recipe.name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-7xl">{recipe.emoji}</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <div className="flex items-start gap-2 mb-2 flex-wrap">
            <h2 className="font-bold text-gray-900 text-xl">{recipe.emoji} {recipe.name}</h2>
          </div>
          <div className="flex gap-2 flex-wrap mb-3">
            <DiffBadge diff={recipe.schwierigkeit} />
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{recipe.mehltyp}</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">{recipe.beschreibung}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { label: "Backzeit", value: recipe.backzeit, icon: "🕐" },
              { label: "Gesamtzeit", value: recipe.gesamtzeit, icon: "⏱" },
              { label: "Ergebnis", value: recipe.ergebnis, icon: "🍞" },
            ].map((s) => (
              <div key={s.label} className="bg-amber-50 rounded-xl px-3 py-2 text-center">
                <div className="text-xl mb-0.5">{s.icon}</div>
                <div className="text-xs font-semibold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Zutaten */}
          <h3 className="font-semibold text-gray-900 mb-2">Zutaten</h3>
          <ul className="space-y-1.5 mb-5">
            {zutaten.map((z, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                <span>{z}</span>
              </li>
            ))}
          </ul>

          {/* Anleitung */}
          <h3 className="font-semibold text-gray-900 mb-2">Anleitung</h3>
          <ol className="space-y-3 pb-2">
            {schritte.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-700">
                <span className="bg-amber-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{s}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}

// ── Recipe form modal (Add / Edit) ────────────────────────────────────────────

const EMPTY_FORM = {
  name: "",
  emoji: "🍞",
  beschreibung: "",
  schwierigkeit: "Anfänger",
  backzeit: "",
  gesamtzeit: "",
  ergebnis: "",
  mehltyp: "",
  imageUrl: "",
  zutaten: [""],
  schritte: [""],
}

function RecipeFormModal({
  initial,
  onSave,
  onCancel,
}: {
  initial?: DbRecipe
  onSave: (data: typeof EMPTY_FORM) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState(() =>
    initial
      ? {
          name: initial.name,
          emoji: initial.emoji,
          beschreibung: initial.beschreibung,
          schwierigkeit: initial.schwierigkeit,
          backzeit: initial.backzeit,
          gesamtzeit: initial.gesamtzeit,
          ergebnis: initial.ergebnis,
          mehltyp: initial.mehltyp,
          imageUrl: initial.imageUrl ?? "",
          zutaten: parseZutaten(initial).length > 0 ? parseZutaten(initial) : [""],
          schritte: parseSchritte(initial).length > 0 ? parseSchritte(initial) : [""],
        }
      : { ...EMPTY_FORM, zutaten: [""], schritte: [""] }
  )
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imgPreviewError, setImgPreviewError] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function setField<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function setListItem(key: "zutaten" | "schritte", idx: number, value: string) {
    setForm((f) => {
      const arr = [...f[key]]
      arr[idx] = value
      return { ...f, [key]: arr }
    })
  }

  function addListItem(key: "zutaten" | "schritte") {
    setForm((f) => ({ ...f, [key]: [...f[key], ""] }))
  }

  function removeListItem(key: "zutaten" | "schritte", idx: number) {
    setForm((f) => {
      const arr = f[key].filter((_, i) => i !== idx)
      return { ...f, [key]: arr.length > 0 ? arr : [""] }
    })
  }

  function moveListItem(key: "zutaten" | "schritte", idx: number, dir: -1 | 1) {
    setForm((f) => {
      const arr = [...f[key]]
      const target = idx + dir
      if (target < 0 || target >= arr.length) return f
      ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
      return { ...f, [key]: arr }
    })
  }

  async function handleFileUpload(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/brot/rezepte/upload", { method: "POST", body: fd })
    if (res.ok) {
      const { url } = await res.json()
      setField("imageUrl", url)
      setImgPreviewError(false)
    }
    setUploading(false)
  }

  async function handleSubmit() {
    if (!form.name.trim()) return
    setSaving(true)
    await onSave({
      ...form,
      zutaten: form.zutaten.filter((z) => z.trim()),
      schritte: form.schritte.filter((s) => s.trim()),
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-xl w-full max-w-lg max-h-[95dvh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-gray-900 text-lg">{initial ? "Rezept bearbeiten" : "Neues Rezept"}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center">×</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {/* Bild */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Bild</label>
            {form.imageUrl && !imgPreviewError ? (
              <div className="relative mb-2">
                <img
                  src={form.imageUrl}
                  alt=""
                  className="w-full h-40 object-cover rounded-xl"
                  onError={() => setImgPreviewError(true)}
                />
                <button
                  onClick={() => { setField("imageUrl", ""); setImgPreviewError(false) }}
                  className="absolute top-2 right-2 bg-black/40 hover:bg-black/60 text-white w-7 h-7 rounded-full text-sm flex items-center justify-center"
                >×</button>
              </div>
            ) : (
              <div className="h-20 bg-amber-50 rounded-xl flex items-center justify-center mb-2 text-3xl">
                {form.emoji || "🍞"}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={form.imageUrl}
                onChange={(e) => { setField("imageUrl", e.target.value); setImgPreviewError(false) }}
                placeholder="Bild-URL (optional)"
                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-sm text-amber-700 font-medium disabled:opacity-50 shrink-0"
              >
                {uploading ? "…" : "📷 Upload"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }}
              />
            </div>
          </div>

          {/* Basis */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 block mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="z.B. Roggenbrot"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Emoji</label>
              <input
                type="text"
                value={form.emoji}
                onChange={(e) => setField("emoji", e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 text-center text-xl"
                maxLength={2}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Beschreibung</label>
            <textarea
              value={form.beschreibung}
              onChange={(e) => setField("beschreibung", e.target.value)}
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              placeholder="Kurze Beschreibung des Brots…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Schwierigkeit</label>
              <select
                value={form.schwierigkeit}
                onChange={(e) => setField("schwierigkeit", e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option>Anfänger</option>
                <option>Mittel</option>
                <option>Fortgeschritten</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Mehltyp</label>
              <input
                type="text"
                value={form.mehltyp}
                onChange={(e) => setField("mehltyp", e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="z.B. Roggen"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Backzeit</label>
              <input
                type="text"
                value={form.backzeit}
                onChange={(e) => setField("backzeit", e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="60 Min."
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Gesamtzeit</label>
              <input
                type="text"
                value={form.gesamtzeit}
                onChange={(e) => setField("gesamtzeit", e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="18 Std."
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Ergebnis</label>
              <input
                type="text"
                value={form.ergebnis}
                onChange={(e) => setField("ergebnis", e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="1 Laib"
              />
            </div>
          </div>

          {/* Zutaten */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Zutaten</label>
              <button
                onClick={() => addListItem("zutaten")}
                className="text-xs text-amber-600 hover:text-amber-700 font-medium"
              >+ Zutat</button>
            </div>
            <div className="space-y-2">
              {form.zutaten.map((z, i) => (
                <div key={i} className="flex gap-1.5 items-center">
                  <span className="text-amber-400 shrink-0 text-sm">•</span>
                  <input
                    type="text"
                    value={z}
                    onChange={(e) => setListItem("zutaten", i, e.target.value)}
                    className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder={`Zutat ${i + 1}`}
                  />
                  <button
                    onClick={() => removeListItem("zutaten", i)}
                    className="text-gray-300 hover:text-red-400 text-lg leading-none shrink-0"
                  >×</button>
                </div>
              ))}
            </div>
          </div>

          {/* Schritte */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Arbeitsschritte</label>
              <button
                onClick={() => addListItem("schritte")}
                className="text-xs text-amber-600 hover:text-amber-700 font-medium"
              >+ Schritt</button>
            </div>
            <div className="space-y-2">
              {form.schritte.map((s, i) => (
                <div key={i} className="flex gap-1.5 items-start">
                  <div className="flex flex-col gap-0.5 shrink-0 mt-1">
                    <button
                      onClick={() => moveListItem("schritte", i, -1)}
                      disabled={i === 0}
                      className="text-gray-300 hover:text-gray-500 disabled:opacity-20 text-xs leading-none"
                    >▲</button>
                    <span className="bg-amber-400 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {i + 1}
                    </span>
                    <button
                      onClick={() => moveListItem("schritte", i, 1)}
                      disabled={i === form.schritte.length - 1}
                      className="text-gray-300 hover:text-gray-500 disabled:opacity-20 text-xs leading-none"
                    >▼</button>
                  </div>
                  <textarea
                    value={s}
                    onChange={(e) => setListItem("schritte", i, e.target.value)}
                    rows={2}
                    className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                    placeholder={`Schritt ${i + 1}…`}
                  />
                  <button
                    onClick={() => removeListItem("schritte", i)}
                    className="text-gray-300 hover:text-red-400 text-lg leading-none shrink-0 mt-1"
                  >×</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 pt-3 border-t border-gray-100 flex gap-2 shrink-0" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name.trim()}
            className="flex-1 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Speichern…" : initial ? "Speichern" : "Rezept erstellen"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Rezepte tab ───────────────────────────────────────────────────────────────

function RezepteTab() {
  const [recipes, setRecipes] = useState<DbRecipe[] | null>(null)
  const [selectedRecipe, setSelectedRecipe] = useState<DbRecipe | null>(null)
  const [editRecipe, setEditRecipe] = useState<DbRecipe | null | "new">(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function load() {
    const res = await fetch("/api/brot/rezepte")
    if (res.ok) setRecipes(await res.json())
  }

  useEffect(() => { load() }, [])

  async function handleSave(data: typeof EMPTY_FORM) {
    if (editRecipe === "new") {
      await fetch("/api/brot/rezepte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
    } else if (editRecipe) {
      await fetch(`/api/brot/rezepte/${editRecipe.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
    }
    await load()
    setEditRecipe(null)
  }

  async function handleDelete(id: string) {
    await fetch(`/api/brot/rezepte/${id}`, { method: "DELETE" })
    await load()
    setDeleteId(null)
    if (selectedRecipe?.id === id) setSelectedRecipe(null)
  }

  if (!recipes) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">Lade Rezepte…</div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 md:p-6 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
        <div>
          <h2 className="font-semibold text-gray-900">Brot-Rezepte</h2>
          <p className="text-xs text-gray-500 mt-0.5">{recipes.length} Rezepte</p>
        </div>
        <button
          onClick={() => setEditRecipe("new")}
          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          + Rezept
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl mb-4">📖</span>
            <p className="text-gray-500 text-sm">Noch keine Rezepte vorhanden.</p>
            <button
              onClick={() => setEditRecipe("new")}
              className="mt-4 bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium"
            >
              Erstes Rezept erstellen 🍞
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recipes.map((r) => (
              <RecipeCard
                key={r.id}
                recipe={r}
                onClick={() => setSelectedRecipe(r)}
                onEdit={(e) => { e.stopPropagation(); setEditRecipe(r) }}
                onDelete={(e) => { e.stopPropagation(); setDeleteId(r.id) }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedRecipe && (
        <RecipeModal recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
      )}

      {/* Add / Edit modal */}
      {editRecipe !== null && (
        <RecipeFormModal
          initial={editRecipe === "new" ? undefined : editRecipe}
          onSave={handleSave}
          onCancel={() => setEditRecipe(null)}
        />
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-xs text-center">
            <p className="text-2xl mb-3">🗑️</p>
            <p className="font-semibold text-gray-900 mb-1">Rezept löschen?</p>
            <p className="text-sm text-gray-500 mb-5">Diese Aktion kann nicht rückgängig gemacht werden.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600"
              >
                Abbrechen
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sauerteig batch helpers ───────────────────────────────────────────────────

function formatDueDate(date: Date | string) {
  const d = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const day = new Date(d)
  day.setHours(0, 0, 0, 0)

  let dayLabel: string
  if (day.getTime() === today.getTime()) dayLabel = "Heute"
  else if (day.getTime() === tomorrow.getTime()) dayLabel = "Morgen"
  else dayLabel = d.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" })

  const time = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
  return `${dayLabel}, ${time} Uhr`
}

function isOverdue(todo: SauerteigTodo) {
  return !todo.doneAt && new Date(todo.dueDate) < new Date()
}

function groupByDay(todos: SauerteigTodo[]) {
  const map = new Map<string, SauerteigTodo[]>()
  for (const t of todos) {
    const d = new Date(t.dueDate)
    d.setHours(0, 0, 0, 0)
    const key = d.toISOString()
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(t)
  }
  return Array.from(map.entries()).map(([key, items]) => ({ date: new Date(key), items }))
}

function dayLabel(date: Date) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  if (date.getTime() === today.getTime()) return "Heute"
  if (date.getTime() === tomorrow.getTime()) return "Morgen"
  return date.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })
}

// ── Sauerteig batch card ──────────────────────────────────────────────────────

function BatchCard({
  batch,
  onToggleTodo,
  onArchive,
}: {
  batch: BatchWithTodos
  onToggleTodo: (batchId: string, todoId: string, done: boolean) => void
  onArchive: (batchId: string) => void
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const days = groupByDay(batch.todos)
  const doneCount = batch.todos.filter((t) => t.doneAt).length
  const totalCount = batch.todos.length
  const progress = Math.round((doneCount / totalCount) * 100)
  const startLabel = new Date(batch.startedAt).toLocaleDateString("de-DE", {
    day: "numeric", month: "long", year: "numeric",
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">{TYPE_EMOJI[batch.type]}</span>
            <span className="font-semibold text-gray-900">{batch.type}sauerteig</span>
            <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
              {doneCount}/{totalCount} erledigt
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            Gestartet: {startLabel} · Ideal: {TYPE_TEMP[batch.type]}
          </div>
        </div>
        <button
          onClick={() => onArchive(batch.id)}
          className="text-xs text-gray-400 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
        >
          Archivieren
        </button>
      </div>

      <div className="h-1.5 bg-gray-100">
        <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex gap-4 text-xs text-gray-500">
        <span>Mehl: <strong className="text-gray-700">{TYPE_MEHL[batch.type]}</strong></span>
        <span>Menge: <strong className="text-gray-700">je 50g Mehl + 50ml Wasser</strong></span>
      </div>

      <div className="divide-y divide-gray-100">
        {days.map(({ date, items }) => {
          const allDone = items.every((t) => t.doneAt)
          const hasOverdue = items.some((t) => isOverdue(t))
          return (
            <div key={date.toISOString()} className={allDone ? "opacity-60" : ""}>
              <div className={`px-4 py-2 flex items-center gap-2 text-xs font-semibold
                ${hasOverdue ? "text-red-600 bg-red-50" : allDone ? "text-gray-400 bg-gray-50" : "text-gray-500 bg-gray-50"}`}>
                <span>{hasOverdue && !allDone ? "⚠ " : ""}{dayLabel(date)}</span>
                {allDone && <span className="text-green-500">✓</span>}
              </div>
              {items.map((todo) => {
                const done = !!todo.doneAt
                const overdue = isOverdue(todo)
                const isOpen = expanded[todo.id]
                return (
                  <div key={todo.id} className={`px-4 py-3 ${done ? "bg-white" : overdue ? "bg-red-50/40" : "bg-white"}`}>
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => onToggleTodo(batch.id, todo.id, !done)}
                        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                          ${done ? "bg-green-500 border-green-500 text-white" : overdue ? "border-red-400 hover:border-red-500" : "border-gray-300 hover:border-amber-500"}`}
                      >
                        {done && <span className="text-xs leading-none">✓</span>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className={`text-sm font-medium leading-snug
                            ${done ? "line-through text-gray-400" : overdue ? "text-red-700" : "text-gray-900"}`}>
                            {todo.title}
                          </span>
                          <span className={`text-xs shrink-0 ${done ? "text-gray-400" : overdue ? "text-red-500" : "text-gray-400"}`}>
                            {overdue && !done ? "⚠ " : ""}{formatDueDate(todo.dueDate)}
                          </span>
                        </div>
                        <button
                          onClick={() => setExpanded((p) => ({ ...p, [todo.id]: !p[todo.id] }))}
                          className="text-xs text-amber-600 hover:text-amber-700 mt-1"
                        >
                          {isOpen ? "▲ weniger" : "▼ Details"}
                        </button>
                        {isOpen && (
                          <p className="mt-2 text-xs text-gray-600 leading-relaxed bg-amber-50 rounded-xl px-3 py-2">
                            {todo.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Start modal ───────────────────────────────────────────────────────────────

function StartModal({ onClose, onStart }: { onClose: () => void; onStart: (type: string, date: string) => void }) {
  const [selectedType, setSelectedType] = useState<string>("Roggen")
  const today = new Date().toISOString().split("T")[0]
  const [startDate, setStartDate] = useState(today)
  const [saving, setSaving] = useState(false)

  const types = [
    { key: "Roggen", emoji: "🌾", desc: "Kräftig, robust, schnell aktiv — ideal für Anfänger", temp: "26–28°C" },
    { key: "Weizen", emoji: "🌿", desc: "Mild und vielseitig — für helles Brot", temp: "24–26°C" },
    { key: "Dinkel", emoji: "✨", desc: "Aromatisch, schnell — etwas kühler halten", temp: "22–24°C" },
  ]

  async function handleStart() {
    setSaving(true)
    await onStart(selectedType, startDate)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-lg">🍞 Sauerteig starten</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Mehlsorte wählen</p>
            <div className="space-y-2">
              {types.map((t) => (
                <button key={t.key} onClick={() => setSelectedType(t.key)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors
                    ${selectedType === t.key ? "border-amber-500 bg-amber-50" : "border-gray-200 hover:border-amber-300"}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{t.emoji}</span>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{t.key}</div>
                      <div className="text-xs text-gray-500">{t.desc} · {t.temp}</div>
                    </div>
                    {selectedType === t.key && <span className="ml-auto text-amber-500">✓</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Startdatum</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            <p className="text-xs text-gray-400 mt-1">Alle Todos werden ab 08:00 Uhr dieses Tages berechnet.</p>
          </div>
        </div>
        <div className="px-5 flex gap-2" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600">Abbrechen</button>
          <button onClick={handleStart} disabled={saving}
            className="flex-1 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-50">
            {saving ? "Erstelle…" : `${TYPE_EMOJI[selectedType]} Starten`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sauerteig tab ─────────────────────────────────────────────────────────────

function SauerteigTab({ initialBatches }: { initialBatches: BatchWithTodos[] }) {
  const [batches, setBatches] = useState<BatchWithTodos[]>(initialBatches)
  const [showModal, setShowModal] = useState(false)

  async function reload() {
    const res = await fetch("/api/brot/sauerteig")
    if (res.ok) setBatches(await res.json())
  }

  async function handleStart(type: string, startDate: string) {
    const res = await fetch("/api/brot/sauerteig", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, startedAt: new Date(startDate + "T08:00:00").toISOString() }),
    })
    if (res.ok) { await reload(); setShowModal(false) }
  }

  async function handleToggleTodo(batchId: string, todoId: string, done: boolean) {
    setBatches((prev) =>
      prev.map((b) => b.id !== batchId ? b : {
        ...b,
        todos: b.todos.map((t) => t.id !== todoId ? t : { ...t, doneAt: done ? new Date() : null }),
      })
    )
    await fetch(`/api/brot/sauerteig/${batchId}/todos/${todoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    })
    reload()
  }

  async function handleArchive(batchId: string) {
    await fetch(`/api/brot/sauerteig/${batchId}`, { method: "DELETE" })
    setBatches((prev) => prev.filter((b) => b.id !== batchId))
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 md:p-6 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
        <div>
          <h2 className="font-semibold text-gray-900">Sauerteig</h2>
          {batches.length > 0 && <p className="text-xs text-gray-500 mt-0.5">{batches.length} aktiver Ansatz</p>}
        </div>
        <button onClick={() => setShowModal(true)}
          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
          + Sauerteig starten
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {batches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl mb-4">🍞</span>
            <p className="text-gray-500 text-sm">Noch kein Sauerteig aktiv.</p>
            <p className="text-gray-400 text-xs mt-1">Starte deinen ersten Ansatz!</p>
            <button onClick={() => setShowModal(true)}
              className="mt-4 bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium">
              Sauerteig starten 🌾
            </button>
          </div>
        ) : (
          batches.map((batch) => (
            <BatchCard key={batch.id} batch={batch} onToggleTodo={handleToggleTodo} onArchive={handleArchive} />
          ))
        )}
      </div>
      {showModal && <StartModal onClose={() => setShowModal(false)} onStart={handleStart} />}
    </div>
  )
}

// ── Main BrotTab with sub-tabs ────────────────────────────────────────────────

export default function BrotTab({ initialBatches }: { initialBatches: BatchWithTodos[] }) {
  const [subTab, setSubTab] = useState<SubTab>("sauerteig")

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tab bar */}
      <div className="flex gap-1 px-4 pt-3 bg-white border-b border-gray-200 shrink-0">
        <button
          onClick={() => setSubTab("sauerteig")}
          className={`px-4 py-2 text-sm font-medium rounded-t-xl border-b-2 transition-colors
            ${subTab === "sauerteig" ? "border-amber-500 text-amber-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          🌾 Sauerteig
        </button>
        <button
          onClick={() => setSubTab("rezepte")}
          className={`px-4 py-2 text-sm font-medium rounded-t-xl border-b-2 transition-colors
            ${subTab === "rezepte" ? "border-amber-500 text-amber-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          📖 Rezepte
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {subTab === "sauerteig" ? (
          <SauerteigTab initialBatches={initialBatches} />
        ) : (
          <RezepteTab />
        )}
      </div>
    </div>
  )
}
