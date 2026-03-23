import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  const body = await req.json()
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
    },
  })
  return NextResponse.json(plant)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  await prisma.gardenPlant.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
