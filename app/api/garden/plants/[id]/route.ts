import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function syncRules(plantName: string, goodNeighborIds: string[], badNeighborIds: string[]) {
  const [goodPlants, badPlants] = await Promise.all([
    prisma.gardenPlant.findMany({ where: { id: { in: goodNeighborIds } }, select: { name: true } }),
    prisma.gardenPlant.findMany({ where: { id: { in: badNeighborIds } }, select: { name: true } }),
  ])
  await prisma.gardenNeighborRule.deleteMany({ where: { nameA: plantName } })
  const newRules = [
    ...goodPlants.map(p => ({ nameA: plantName, nameB: p.name, type: "good" })),
    ...badPlants.map(p => ({ nameA: plantName, nameB: p.name, type: "bad" })),
  ]
  if (newRules.length) await prisma.gardenNeighborRule.createMany({ data: newRules, skipDuplicates: true })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  const body = await req.json()

  const existing = await prisma.gardenPlant.findUnique({ where: { id: params.id }, select: { name: true } })
  const oldName = existing?.name

  const plant = await prisma.gardenPlant.update({
    where: { id: params.id },
    data: {
      name: body.name?.trim(),
      variety: body.variety?.trim() || null,
      sowingMethod: body.sowingMethod,
      weeksIndoor: body.weeksIndoor != null ? parseInt(body.weeksIndoor) : null,
      weeksToPike: body.weeksToPike != null ? parseInt(body.weeksToPike) : null,
      daysToMaturity: body.daysToMaturity != null ? parseInt(body.daysToMaturity) : null,
      harvestDays: body.harvestDays != null ? parseInt(body.harvestDays) : null,
      openfarmSlug: body.openfarmSlug,
      openfarmData: body.openfarmData,
      thumbnailUrl: body.thumbnailUrl ?? null,
      notes: body.notes?.trim() || null,
    },
  })

  const newName = plant.name
  // If renamed, update all rules referencing the old name
  if (oldName && oldName !== newName) {
    await prisma.gardenNeighborRule.updateMany({ where: { nameA: oldName }, data: { nameA: newName } })
    await prisma.gardenNeighborRule.updateMany({ where: { nameB: oldName }, data: { nameB: newName } })
  }
  await syncRules(newName, body.goodNeighborIds ?? [], body.badNeighborIds ?? [])

  return NextResponse.json(plant)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  // Rules intentionally NOT deleted — they survive so relationships auto-reconnect on re-creation
  await prisma.gardenPlant.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
