import { NextRequest, NextResponse } from "next/server"
import { searchOmdbTitles } from "@/lib/omdb"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim()
  if (!q) return NextResponse.json([])

  try {
    const results = await searchOmdbTitles(q)
    return NextResponse.json(results)
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "OMDb Fehler" }, { status: 502 })
  }
}
