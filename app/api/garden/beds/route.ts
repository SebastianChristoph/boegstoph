import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  const beds = await prisma.gardenBed.findMany({ orderBy: { name: "asc" } })
  return NextResponse.json(beds)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  const body = await req.json()
  const bed = await prisma.gardenBed.create({
    data: {
      name: body.name.trim(),
      size: body.size?.trim() || null,
      gridCols: body.gridCols ?? 10,
      gridRows: body.gridRows ?? 8,
      gridCells: body.gridCells ?? null,
      cellSize: body.cellSize ?? 20,
    },
  })
  return NextResponse.json(bed, { status: 201 })
}
