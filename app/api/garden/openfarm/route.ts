import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")
  if (!q) return NextResponse.json({ data: [] })
  try {
    const res = await fetch(`https://openfarm.cc/api/v1/crops?filter=${encodeURIComponent(q)}`, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; family-hub/1.0; +https://github.com)",
      },
    })
    if (!res.ok) {
      console.error("OpenFarm error:", res.status, await res.text().catch(() => ""))
      return NextResponse.json({ data: [] })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    console.error("OpenFarm fetch failed:", e)
    return NextResponse.json({ data: [] })
  }
}
