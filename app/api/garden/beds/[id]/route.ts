import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name.trim()
  if (body.size !== undefined) data.size = body.size?.trim() || null
  if (body.gridCols !== undefined) data.gridCols = body.gridCols
  if (body.gridRows !== undefined) data.gridRows = body.gridRows
  if (body.gridCells !== undefined) data.gridCells = body.gridCells
  if (body.cellSize !== undefined) data.cellSize = body.cellSize
  if (body.cellAssignments !== undefined) data.cellAssignments = body.cellAssignments
  const bed = await prisma.gardenBed.update({ where: { id: params.id }, data })
  return NextResponse.json(bed)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  await prisma.gardenBed.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
