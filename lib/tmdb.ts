const TMDB_BASE = "https://api.themoviedb.org/3"
const TMDB_IMG = "https://image.tmdb.org/t/p/w300"

export interface TmdbSearchResult {
  tmdbId: number
  type: "movie" | "series"
  title: string
  originalTitle: string | null
  year: string | null
  poster: string | null
}

export interface TmdbDetail extends TmdbSearchResult {
  overview: string | null
  imdbId: string | null
  genre: string | null
}

function posterUrl(path: string | null | undefined): string | null {
  return path ? `${TMDB_IMG}${path}` : null
}

function yearOf(dateStr: string | null | undefined): string | null {
  return dateStr ? dateStr.slice(0, 4) || null : null
}

async function tmdbFetch(path: string, params: Record<string, string> = {}): Promise<any> {
  const key = process.env.TMDB_API_KEY
  if (!key) throw new Error("TMDB_API_KEY nicht konfiguriert")
  const url = new URL(`${TMDB_BASE}${path}`)
  url.searchParams.set("api_key", key)
  url.searchParams.set("language", "de-DE")
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(6000) })
  if (!res.ok) throw new Error("TMDB request fehlgeschlagen")
  return res.json()
}

export async function searchTmdbTitles(query: string): Promise<TmdbSearchResult[]> {
  const data = await tmdbFetch("/search/multi", { query, include_adult: "false" })
  const results = Array.isArray(data.results) ? data.results : []
  return results
    .filter((r: any) => r.media_type === "movie" || r.media_type === "tv")
    .map((r: any) => ({
      tmdbId: r.id,
      type: r.media_type === "tv" ? "series" : "movie",
      title: r.title || r.name,
      originalTitle: r.original_title || r.original_name || null,
      year: yearOf(r.release_date || r.first_air_date),
      poster: posterUrl(r.poster_path),
    }))
    .slice(0, 10)
}

export async function getTmdbDetail(tmdbId: number, type: "movie" | "series"): Promise<TmdbDetail | null> {
  const endpoint = type === "series" ? "/tv" : "/movie"
  try {
    const data = await tmdbFetch(`${endpoint}/${tmdbId}`, { append_to_response: "external_ids" })
    const genres = Array.isArray(data.genres) ? data.genres.map((g: any) => g.name).join(", ") : ""
    return {
      tmdbId: data.id,
      type,
      title: data.title || data.name,
      originalTitle: data.original_title || data.original_name || null,
      year: yearOf(data.release_date || data.first_air_date),
      poster: posterUrl(data.poster_path),
      overview: data.overview || null,
      imdbId: data.external_ids?.imdb_id || null,
      genre: genres || null,
    }
  } catch {
    return null
  }
}
