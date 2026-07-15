import { NextRequest, NextResponse } from "next/server"
import { getOmdbDetail } from "@/lib/omdb"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const imdbId = searchParams.get("imdbId")?.trim()
  if (!imdbId) return new NextResponse("Bad Request", { status: 400 })

  try {
    const detail = await getOmdbDetail(imdbId)
    if (!detail) return new NextResponse("Not Found", { status: 404 })
    return NextResponse.json(detail)
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "OMDb Fehler" }, { status: 502 })
  }
}
