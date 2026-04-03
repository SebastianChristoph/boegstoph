import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  const year = parseInt(req.nextUrl.searchParams.get("year") ?? String(new Date().getFullYear()))
  const entries = await prisma.gardenHarvest.findMany({
    where: { year },
    orderBy: { harvestDate: "desc" },
  })
  return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  const body = await req.json()
  const year = new Date(body.harvestDate ?? Date.now()).getFullYear()
  const entry = await prisma.gardenHarvest.create({
    data: {
      year,
      plantName: body.plantName.trim(),
      quantity: parseFloat(body.quantity),
      unit: body.unit,
      harvestDate: body.harvestDate ? new Date(body.harvestDate) : new Date(),
      notes: body.notes?.trim() || null,
    },
  })
  return NextResponse.json(entry, { status: 201 })
}
