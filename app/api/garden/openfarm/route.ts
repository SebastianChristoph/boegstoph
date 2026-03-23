import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")
  if (!q) return NextResponse.json({ data: [] })
  try {
    const res = await fetch(`https://openfarm.cc/api/v1/crops?filter=${encodeURIComponent(q)}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ data: [] })
  }
}
