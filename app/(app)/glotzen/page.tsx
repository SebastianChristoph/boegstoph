"use client"

import { useCallback, useEffect, useState } from "react"

type Tab = "merkliste" | "ranking"

interface GlotzenTitle {
  id: string
  imdbId: string | null
  title: string
  year: string | null
  type: string
  posterUrl: string | null
  plot: string | null
  imdbRating: number | null
  status: string
  watchedAt: string | null
  ratingTina: number | null
  ratingSebastian: number | null
  createdAt: string
}

interface SearchResult {
  tmdbId: number
  title: string
  originalTitle: string | null
  year: string | null
  type: string
  poster: string | null
}

interface Detail extends SearchResult {
  imdbId: string | null
  plot: string | null
  imdbRating: number | null
  genre: string | null
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap">
      {type === "series" ? "📺 Serie" : "🎬 Film"}
    </span>
  )
}

function Poster({ url, imdbId, size = "w-12 h-16" }: { url: string | null; imdbId?: string | null; size?: string }) {
  const img = url
    ? <img src={url} alt="" className={`${size} object-cover rounded-lg bg-gray-100 shrink-0`} />
    : <div className={`${size} rounded-lg bg-gray-100 flex items-center justify-center text-xl shrink-0`}>🎬</div>

  if (!imdbId) return img
  return (
    <a
      href={`https://www.imdb.com/title/${imdbId}/`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title="Auf IMDb ansehen"
    >
      {img}
    </a>
  )
}

// ── Merkliste ────────────────────────────────────────────────────────────────

function MerklisteTab({ onWatched }: { onWatched: () => void }) {
  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [adding, setAdding] = useState(false)

  const [wishlist, setWishlist] = useState<GlotzenTitle[]>([])

  const loadWishlist = useCallback(async () => {
    const res = await fetch("/api/glotzen?status=wishlist")
    if (res.ok) setWishlist(await res.json())
  }, [])

  useEffect(() => { loadWishlist() }, [loadWishlist])

  async function search() {
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setSearchError(null)
    setDetail(null)
    try {
      const res = await fetch(`/api/glotzen/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (!res.ok) { setSearchError(data.error ?? "Suche fehlgeschlagen"); setResults([]) }
      else setResults(data)
    } catch {
      setSearchError("Suche fehlgeschlagen")
    } finally {
      setSearching(false)
    }
  }

  async function pick(tmdbId: number, type: string) {
    setDetailLoading(true)
    setDetail(null)
    try {
      const res = await fetch(`/api/glotzen/detail?tmdbId=${tmdbId}&type=${type}`)
      if (res.ok) setDetail(await res.json())
    } finally {
      setDetailLoading(false)
    }
  }

  async function addToWishlist() {
    if (!detail) return
    setAdding(true)
    try {
      const res = await fetch("/api/glotzen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imdbId: detail.imdbId,
          title: detail.title,
          year: detail.year,
          type: detail.type,
          posterUrl: detail.poster,
          plot: detail.plot,
          imdbRating: detail.imdbRating,
        }),
      })
      if (res.ok) {
        setDetail(null)
        setResults([])
        setQuery("")
        loadWishlist()
      }
    } finally {
      setAdding(false)
    }
  }

  async function markWatched(id: string) {
    await fetch(`/api/glotzen/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "watched" }),
    })
    setWishlist((p) => p.filter((w) => w.id !== id))
    onWatched()
  }

  async function remove(id: string) {
    await fetch(`/api/glotzen/${id}`, { method: "DELETE" })
    setWishlist((p) => p.filter((w) => w.id !== id))
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500 mb-3">Titel suchen, IMDb-Bewertung ansehen und zur Merkliste hinzufügen.</p>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Film oder Serie suchen…"
            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          <button
            onClick={search}
            disabled={!query.trim() || searching}
            className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40"
          >
            {searching ? "…" : "🔎 Suchen"}
          </button>
        </div>
        {searchError && <p className="text-xs text-red-500 mt-2">{searchError}</p>}
      </div>

      {results.length > 0 && !detail && (
        <ul className="space-y-2">
          {results.map((r) => (
            <li
              key={r.tmdbId}
              onClick={() => pick(r.tmdbId, r.type)}
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm cursor-pointer hover:bg-gray-50"
            >
              <Poster url={r.poster} size="w-10 h-14" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{r.title}</p>
                <p className="text-xs text-gray-400 truncate">
                  {r.year}{r.originalTitle && r.originalTitle !== r.title ? ` · ${r.originalTitle}` : ""}
                </p>
              </div>
              <TypeBadge type={r.type} />
            </li>
          ))}
        </ul>
      )}

      {detailLoading && <p className="text-sm text-gray-400">Lade Details…</p>}

      {detail && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="flex gap-3">
            <Poster url={detail.poster} imdbId={detail.imdbId} size="w-16 h-24" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900">{detail.title}</h3>
                <TypeBadge type={detail.type} />
              </div>
              <p className="text-xs text-gray-400 mb-1">
                {detail.year}
                {detail.originalTitle && detail.originalTitle !== detail.title ? ` · ${detail.originalTitle}` : ""}
                {detail.genre ? ` · ${detail.genre}` : ""}
              </p>
              <p className="text-sm font-medium text-amber-600">
                {detail.imdbRating !== null ? `⭐ ${detail.imdbRating.toFixed(1)} / 10 (IMDb)` : "Keine IMDb-Bewertung verfügbar"}
              </p>
              {detail.plot && <p className="text-xs text-gray-500 mt-2">{detail.plot}</p>}
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={addToWishlist}
              disabled={adding}
              className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40"
            >
              {adding ? "…" : "＋ Zur Merkliste hinzufügen"}
            </button>
            <button
              onClick={() => setDetail(null)}
              className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Merkliste ({wishlist.length})</h2>
        {wishlist.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <div className="text-4xl mb-2">🍿</div>
            <p className="text-sm">Noch nichts auf der Merkliste</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {wishlist.map((w) => (
              <li key={w.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
                <Poster url={w.posterUrl} imdbId={w.imdbId} size="w-10 h-14" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{w.title}</p>
                  <p className="text-xs text-gray-400">
                    {w.year}{w.imdbRating !== null ? ` · ⭐ ${w.imdbRating.toFixed(1)}` : ""}
                  </p>
                </div>
                <TypeBadge type={w.type} />
                <button
                  onClick={() => markWatched(w.id)}
                  className="text-xs bg-primary-50 text-primary-700 px-2 py-1.5 rounded-lg font-medium hover:bg-primary-100"
                  title="Als geguckt markieren"
                >
                  👁 Geguckt
                </button>
                <button
                  onClick={() => remove(w.id)}
                  className="text-gray-400 hover:text-red-500 text-xs px-1"
                  title="Löschen"
                >
                  🗑
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ── Ranking ──────────────────────────────────────────────────────────────────

function avgRating(w: GlotzenTitle): number | null {
  const vals = [w.ratingTina, w.ratingSebastian].filter((v): v is number => v !== null)
  if (vals.length === 0) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

function RankingTab({ reloadKey }: { reloadKey: number }) {
  const [watched, setWatched] = useState<GlotzenTitle[]>([])

  const load = useCallback(async () => {
    const res = await fetch("/api/glotzen?status=watched")
    if (res.ok) setWatched(await res.json())
  }, [])

  useEffect(() => { load() }, [load, reloadKey])

  async function rate(id: string, field: "ratingTina" | "ratingSebastian", value: string) {
    const num = value === "" ? null : Number(value)
    if (num !== null && (Number.isNaN(num) || num < 1 || num > 10)) return
    setWatched((p) => p.map((w) => (w.id === id ? { ...w, [field]: num } : w)))
    await fetch(`/api/glotzen/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: num }),
    })
  }

  async function remove(id: string) {
    await fetch(`/api/glotzen/${id}`, { method: "DELETE" })
    setWatched((p) => p.filter((w) => w.id !== id))
  }

  const sorted = [...watched].sort((a, b) => {
    const avgA = avgRating(a), avgB = avgRating(b)
    if (avgA === null && avgB === null) return 0
    if (avgA === null) return 1
    if (avgB === null) return -1
    return avgB - avgA
  })

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">Bereits geguckt — mit Tinas und Sebastians Bewertung sortiert.</p>
      {sorted.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <div className="text-4xl mb-2">🏆</div>
          <p className="text-sm">Noch nichts bewertet</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {sorted.map((w, i) => {
            const avg = avgRating(w)
            return (
              <li key={w.id} className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-400 w-5 shrink-0">{i + 1}.</span>
                  <Poster url={w.posterUrl} imdbId={w.imdbId} size="w-10 h-14" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-800 truncate">{w.title}</p>
                      <TypeBadge type={w.type} />
                    </div>
                    <p className="text-xs text-gray-400">
                      {w.year}{w.imdbRating !== null ? ` · IMDb ⭐ ${w.imdbRating.toFixed(1)}` : ""}
                    </p>
                  </div>
                  {avg !== null && (
                    <span className="text-sm font-bold text-primary-700 shrink-0">Ø {avg.toFixed(1)}</span>
                  )}
                  <button
                    onClick={() => remove(w.id)}
                    className="text-gray-400 hover:text-red-500 text-xs px-1 shrink-0"
                    title="Löschen"
                  >
                    🗑
                  </button>
                </div>
                <div className="flex gap-4 mt-2 pl-8">
                  <label className="flex items-center gap-1.5 text-xs text-gray-500">
                    Tina
                    <input
                      type="number" min={1} max={10}
                      value={w.ratingTina ?? ""}
                      onChange={(e) => rate(w.id, "ratingTina", e.target.value)}
                      className="w-14 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-500">
                    Sebastian
                    <input
                      type="number" min={1} max={10}
                      value={w.ratingSebastian ?? ""}
                      onChange={(e) => rate(w.id, "ratingSebastian", e.target.value)}
                      className="w-14 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  </label>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GlotzenPage() {
  const [tab, setTab] = useState<Tab>("merkliste")
  const [rankingReloadKey, setRankingReloadKey] = useState(0)

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Glotzen</h1>
        <p className="text-gray-500 mt-1">Filme & Serien, die wir sehen wollen</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("merkliste")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === "merkliste" ? "bg-primary-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          🍿 Merkliste
        </button>
        <button
          onClick={() => setTab("ranking")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            tab === "ranking" ? "bg-primary-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          🏆 Ranking
        </button>
      </div>

      {tab === "merkliste" ? (
        <MerklisteTab onWatched={() => setRankingReloadKey((k) => k + 1)} />
      ) : (
        <RankingTab reloadKey={rankingReloadKey} />
      )}
    </div>
  )
}
