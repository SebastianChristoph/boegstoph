import { NextRequest, NextResponse } from "next/server"
import { getTmdbDetail } from "@/lib/tmdb"
import { getOmdbRating } from "@/lib/omdb"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tmdbId = Number(searchParams.get("tmdbId"))
  const type = searchParams.get("type") === "series" ? "series" : "movie"
  if (!tmdbId) return new NextResponse("Bad Request", { status: 400 })

  const tmdb = await getTmdbDetail(tmdbId, type)
  if (!tmdb) return new NextResponse("Not Found", { status: 404 })

  let imdbRating: number | null = null
  let plot = tmdb.overview
  if (tmdb.imdbId) {
    try {
      const rating = await getOmdbRating(tmdb.imdbId)
      if (rating) {
        imdbRating = rating.imdbRating
        if (rating.plot) plot = rating.plot
      }
    } catch {
      // OMDb nicht konfiguriert oder nicht erreichbar — TMDB-Daten reichen als Fallback
    }
  }

  return NextResponse.json({
    imdbId: tmdb.imdbId,
    tmdbId: tmdb.tmdbId,
    title: tmdb.title,
    originalTitle: tmdb.originalTitle,
    year: tmdb.year,
    type: tmdb.type,
    poster: tmdb.poster,
    genre: tmdb.genre,
    plot,
    imdbRating,
  })
}
