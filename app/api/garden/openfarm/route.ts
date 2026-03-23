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

async function fetchGrowstuffPhoto(slug: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.growstuff.org/crops/${encodeURIComponent(slug)}/photos.json`,
      { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(4000) }
    )
    if (!res.ok) return null
    const photos = await res.json()
    return photos?.query?.[0]?.thumbnail_url ?? null
  } catch {
    return null
  }
}

async function fetchGrowstuff(query: string) {
  const slug = query.toLowerCase().trim().replace(/\s+/g, "-")
  const base = `https://www.growstuff.org/crops/${encodeURIComponent(slug)}`
  try {
    const [cropRes, photosRes] = await Promise.all([
      fetch(`${base}.json`, { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(5000) }),
      fetch(`${base}/photos.json`, { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(5000) }),
    ])
    if (!cropRes.ok) return null
    const g: GrowstuffCrop = await cropRes.json()
    if (!g?.name) return null

    let thumbnail_url: string | null = null
    if (photosRes.ok) {
      const photos = await photosRes.json()
      thumbnail_url = photos?.query?.[0]?.thumbnail_url ?? null
    }

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
        thumbnail_url,
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
    // Enrich local results with Growstuff photos in parallel
    const withPhotos = await Promise.all(
      localResults.map(async plant => {
        const thumbnail_url = await fetchGrowstuffPhoto(plant.attributes.slug)
        return thumbnail_url
          ? { ...plant, attributes: { ...plant.attributes, thumbnail_url } }
          : plant
      })
    )
    return NextResponse.json({ data: withPhotos })
  }

  // 2. Fallback: Growstuff slug lookup (English queries / uncommon plants)
  const growstuffResult = await fetchGrowstuff(q)
  return NextResponse.json({ data: growstuffResult ? [growstuffResult] : [] })
}
