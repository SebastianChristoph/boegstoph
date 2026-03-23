import { NextRequest, NextResponse } from "next/server"
import { searchPlants } from "@/lib/plantDatabase"

export const dynamic = "force-dynamic"

interface GrowstuffCrop {
  id: number
  name: string
  slug: string
  description: string
  sowing_method: string
  sun_requirements: string
  growing_degree_days: number | null
  median_days_to_first_harvest: number | null
  median_days_to_last_harvest: number | null
  perennial: boolean
  row_spacing: number | null
  spread: number | null
  height: number | null
}

async function fetchGrowstuff(query: string) {
  const slug = query.toLowerCase().trim().replace(/\s+/g, "-")
  try {
    const res = await fetch(`https://www.growstuff.org/crops/${encodeURIComponent(slug)}.json`, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const g: GrowstuffCrop = await res.json()
    if (!g?.name) return null
    return {
      id: String(g.id),
      attributes: {
        name: g.name,
        slug: g.slug,
        description: g.description || null,
        sun_requirements: g.sun_requirements || null,
        sowing_method: g.sowing_method || null,
        spread: g.spread,
        row_spacing: g.row_spacing,
        height: g.height,
        // multiply so PlantsTab's existing ÷15 formula gives back the correct days
        growing_degree_days: g.median_days_to_first_harvest
          ? g.median_days_to_first_harvest * 15
          : null,
        harvest_days: (g.median_days_to_last_harvest && g.median_days_to_first_harvest)
          ? g.median_days_to_last_harvest - g.median_days_to_first_harvest
          : null,
      },
    }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")
  if (!q) return NextResponse.json({ data: [] })

  // 1. Search local static DB first (German names, full growing data)
  const localResults = searchPlants(q)
  if (localResults.length > 0) {
    return NextResponse.json({ data: localResults })
  }

  // 2. Fallback: Growstuff slug lookup (English queries / uncommon plants)
  const growstuffResult = await fetchGrowstuff(q)
  return NextResponse.json({ data: growstuffResult ? [growstuffResult] : [] })
}
