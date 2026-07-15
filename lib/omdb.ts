const OMDB_BASE = "https://www.omdbapi.com/"

export interface OmdbRating {
  imdbRating: number | null
  plot: string | null
}

function clean(value: string | undefined | null): string | null {
  return value && value !== "N/A" ? value : null
}

export async function getOmdbRating(imdbId: string): Promise<OmdbRating | null> {
  const key = process.env.OMDB_API_KEY
  if (!key) throw new Error("OMDB_API_KEY nicht konfiguriert")
  const url = new URL(OMDB_BASE)
  url.searchParams.set("apikey", key)
  url.searchParams.set("i", imdbId)
  url.searchParams.set("plot", "short")
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(6000) })
  if (!res.ok) throw new Error("OMDb request fehlgeschlagen")
  const data = await res.json()
  if (data.Response === "False") return null
  return {
    imdbRating: data.imdbRating && data.imdbRating !== "N/A" ? parseFloat(data.imdbRating) : null,
    plot: clean(data.Plot),
  }
}
