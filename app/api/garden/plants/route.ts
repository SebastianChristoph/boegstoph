import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

type NeighborRef = { id: string; name: string; variety: string | null }
function dedup(arr: NeighborRef[]): NeighborRef[] {
  const seen = new Set<string>()
  return arr.filter(n => { if (seen.has(n.id)) return false; seen.add(n.id); return true })
}

async function buildPlantList() {
  const [plants, rules] = await Promise.all([
    prisma.gardenPlant.findMany({ orderBy: { name: "asc" } }),
    prisma.gardenNeighborRule.findMany(),
  ])
  const nameToPlant = new Map(plants.map(p => [p.name, p]))

  return plants.map(plant => {
    const good: NeighborRef[] = []
    const bad: NeighborRef[] = []
    const ownGoodIds: string[] = []
    const ownBadIds: string[] = []
    for (const rule of rules) {
      const isOwn = rule.nameA === plant.name
      const otherName = isOwn ? rule.nameB : rule.nameB === plant.name ? rule.nameA : null
      if (!otherName) continue
      const other = nameToPlant.get(otherName)
      if (!other) continue
      const ref = { id: other.id, name: other.name, variety: other.variety }
      if (rule.type === "good") {
        good.push(ref)
        if (isOwn) ownGoodIds.push(other.id)
      } else {
        bad.push(ref)
        if (isOwn) ownBadIds.push(other.id)
      }
    }
    return {
      ...plant,
      goodNeighbors: dedup(good),
      badNeighbors: dedup(bad),
      ownGoodNeighborIds: ownGoodIds,
      ownBadNeighborIds: ownBadIds,
    }
  })
}

export async function GET() {
  return NextResponse.json(await buildPlantList())
}

async function syncRules(plantName: string, goodNeighborIds: string[], badNeighborIds: string[]) {
  const [goodPlants, badPlants] = await Promise.all([
    prisma.gardenPlant.findMany({ where: { id: { in: goodNeighborIds } }, select: { name: true } }),
    prisma.gardenPlant.findMany({ where: { id: { in: badNeighborIds } }, select: { name: true } }),
  ])
  const goodNames = goodPlants.map(p => p.name)
  const badNames = badPlants.map(p => p.name)

  // Replace all rules where this plant is the source (nameA)
  await prisma.gardenNeighborRule.deleteMany({ where: { nameA: plantName } })
  const newRules = [
    ...goodNames.map(n => ({ nameA: plantName, nameB: n, type: "good" })),
    ...badNames.map(n => ({ nameA: plantName, nameB: n, type: "bad" })),
  ]
  if (newRules.length) await prisma.gardenNeighborRule.createMany({ data: newRules, skipDuplicates: true })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  const body = await req.json()
  const plant = await prisma.gardenPlant.create({
    data: {
      name: body.name.trim(),
      variety: body.variety?.trim() || null,
      vorzuchtMonat: body.vorzuchtMonat ? parseInt(body.vorzuchtMonat) : null,
      aussaatMonat: body.aussaatMonat ? parseInt(body.aussaatMonat) : null,
      sunRequirements: body.sunRequirements || null,
      waterRequirements: body.waterRequirements || null,
      rowSpacing: body.rowSpacing ? parseInt(body.rowSpacing) : null,
      openfarmSlug: body.openfarmSlug || null,
      openfarmData: body.openfarmData || null,
      thumbnailUrl: body.thumbnailUrl || null,
      notes: body.notes?.trim() || null,
    },
  })
  await syncRules(plant.name, body.goodNeighborIds ?? [], body.badNeighborIds ?? [])
  return NextResponse.json(plant, { status: 201 })
}
