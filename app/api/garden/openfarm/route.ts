import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")
  const debug = req.nextUrl.searchParams.get("debug") === "1"
  if (!q) return NextResponse.json({ data: [] })

  const url = `https://openfarm.cc/api/v1/crops?filter=${encodeURIComponent(q)}`
  console.log("[OpenFarm] fetching:", url)

  try {
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; family-hub/1.0)",
      },
      signal: AbortSignal.timeout(8000),
    })

    console.log("[OpenFarm] status:", res.status, "content-type:", res.headers.get("content-type"))

    const body = await res.text()
    console.log("[OpenFarm] body (first 300):", body.slice(0, 300))

    if (!res.ok) {
      if (debug) return NextResponse.json({ _debug: { status: res.status, body: body.slice(0, 500) }, data: [] })
      return NextResponse.json({ data: [] })
    }

    let data: unknown
    try {
      data = JSON.parse(body)
    } catch (parseErr) {
      console.error("[OpenFarm] JSON parse error:", parseErr, "body:", body.slice(0, 300))
      if (debug) return NextResponse.json({ _debug: { parseError: String(parseErr), body: body.slice(0, 500) }, data: [] })
      return NextResponse.json({ data: [] })
    }

    if (debug) return NextResponse.json({ _debug: { status: res.status, ok: true }, ...(data as object) })
    return NextResponse.json(data)
  } catch (e) {
    console.error("[OpenFarm] fetch failed:", e)
    if (debug) return NextResponse.json({ _debug: { error: String(e) }, data: [] })
    return NextResponse.json({ data: [] })
  }
}
