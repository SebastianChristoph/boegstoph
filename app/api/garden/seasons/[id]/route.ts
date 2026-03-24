import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  const body = await req.json()
  const season = await prisma.gardenSeason.update({
    where: { id: params.id },
    data: {
      bedId: body.bedId !== undefined ? body.bedId || null : undefined,
    },
    include: { plant: true, bed: true, diary: true },
  })
  return NextResponse.json(season)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  await prisma.gardenSeason.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
