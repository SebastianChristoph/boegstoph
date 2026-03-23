import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const NEIGHBOR_SELECT = { select: { id: true, name: true, variety: true } }

type NeighborRef = { id: string; name: string; variety: string | null }
function dedup(arr: NeighborRef[]): NeighborRef[] {
  const seen = new Set<string>()
  return arr.filter(n => { if (seen.has(n.id)) return false; seen.add(n.id); return true })
}

export async function GET() {
  const plants = await prisma.gardenPlant.findMany({
    orderBy: { name: "asc" },
    include: {
      goodNeighbors: NEIGHBOR_SELECT,
      goodNeighborOf: NEIGHBOR_SELECT,
      badNeighbors: NEIGHBOR_SELECT,
      badNeighborOf: NEIGHBOR_SELECT,
    },
  })
  // Merge both relation directions so each plant sees all relevant neighbors
  const result = plants.map(({ goodNeighborOf, badNeighborOf, ...p }) => ({
    ...p,
    goodNeighbors: dedup([...p.goodNeighbors, ...goodNeighborOf]),
    badNeighbors: dedup([...p.badNeighbors, ...badNeighborOf]),
  }))
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  const body = await req.json()
  const goodIds: string[] = body.goodNeighborIds ?? []
  const badIds: string[] = body.badNeighborIds ?? []
  const plant = await prisma.gardenPlant.create({
    data: {
      name: body.name.trim(),
      variety: body.variety?.trim() || null,
      sowingMethod: body.sowingMethod ?? "INDOOR",
      weeksIndoor: body.weeksIndoor ? parseInt(body.weeksIndoor) : null,
      weeksToPike: body.weeksToPike ? parseInt(body.weeksToPike) : null,
      daysToMaturity: body.daysToMaturity ? parseInt(body.daysToMaturity) : null,
      harvestDays: body.harvestDays ? parseInt(body.harvestDays) : null,
      openfarmSlug: body.openfarmSlug || null,
      openfarmData: body.openfarmData || null,
      thumbnailUrl: body.thumbnailUrl || null,
      notes: body.notes?.trim() || null,
      goodNeighbors: goodIds.length ? { connect: goodIds.map(id => ({ id })) } : undefined,
      badNeighbors: badIds.length ? { connect: badIds.map(id => ({ id })) } : undefined,
    },
    include: { goodNeighbors: NEIGHBOR_SELECT, badNeighbors: NEIGHBOR_SELECT },
  })
  return NextResponse.json(plant, { status: 201 })
}
