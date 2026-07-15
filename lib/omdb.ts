const OMDB_BASE = "https://www.omdbapi.com/"

export interface OmdbSearchResult {
  title: string
  year: string
  imdbId: string
  type: string // "movie" | "series"
  poster: string | null
}

export interface OmdbDetail extends OmdbSearchResult {
  plot: string | null
  imdbRating: number | null
  genre: string | null
}

function clean(value: string | undefined | null): string | null {
  return value && value !== "N/A" ? value : null
}

async function omdbFetch(params: Record<string, string>): Promise<any> {
  const key = process.env.OMDB_API_KEY
  if (!key) throw new Error("OMDB_API_KEY nicht konfiguriert")
  const url = new URL(OMDB_BASE)
  url.searchParams.set("apikey", key)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(6000) })
  if (!res.ok) throw new Error("OMDb request fehlgeschlagen")
  return res.json()
}

export async function searchOmdbTitles(query: string): Promise<OmdbSearchResult[]> {
  const data = await omdbFetch({ s: query })
  if (data.Response === "False" || !Array.isArray(data.Search)) return []
  return data.Search
    .filter((r: any) => r.Type === "movie" || r.Type === "series")
    .map((r: any) => ({
      title: r.Title,
      year: r.Year,
      imdbId: r.imdbID,
      type: r.Type,
      poster: clean(r.Poster),
    }))
}

export async function getOmdbDetail(imdbId: string): Promise<OmdbDetail | null> {
  const data = await omdbFetch({ i: imdbId, plot: "short" })
  if (data.Response === "False") return null
  return {
    title: data.Title,
    year: data.Year,
    imdbId: data.imdbID,
    type: data.Type === "series" ? "series" : "movie",
    poster: clean(data.Poster),
    plot: clean(data.Plot),
    imdbRating: data.imdbRating && data.imdbRating !== "N/A" ? parseFloat(data.imdbRating) : null,
    genre: clean(data.Genre),
  }
}
