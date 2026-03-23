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
  const { name, size } = await req.json()
  const bed = await prisma.gardenBed.create({ data: { name: name.trim(), size: size?.trim() || null } })
  return NextResponse.json(bed, { status: 201 })
}
