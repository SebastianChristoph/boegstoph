import { NextRequest, NextResponse } from "next/server"
import { searchTmdbTitles } from "@/lib/tmdb"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim()
  if (!q) return NextResponse.json([])

  try {
    const results = await searchTmdbTitles(q)
    return NextResponse.json(results)
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Suche fehlgeschlagen" }, { status: 502 })
  }
}
