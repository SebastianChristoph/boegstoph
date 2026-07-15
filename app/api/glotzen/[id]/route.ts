import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function clampRating(value: unknown): number | null | undefined {
  if (value === null) return null
  if (typeof value !== "number" || Number.isNaN(value)) return undefined
  return Math.min(10, Math.max(1, Math.round(value)))
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const body = await req.json()
  const data: Record<string, unknown> = {}

  if (body.status === "watched" || body.status === "wishlist") {
    data.status = body.status
    if (body.status === "watched") {
      const existing = await prisma.glotzenTitle.findUnique({ where: { id: params.id } })
      if (existing && !existing.watchedAt) data.watchedAt = new Date()
    } else {
      data.watchedAt = null
    }
  }

  if ("ratingTina" in body) {
    const r = clampRating(body.ratingTina)
    if (r !== undefined) data.ratingTina = r
  }
  if ("ratingSebastian" in body) {
    const r = clampRating(body.ratingSebastian)
    if (r !== undefined) data.ratingSebastian = r
  }

  const updated = await prisma.glotzenTitle.update({ where: { id: params.id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  await prisma.glotzenTitle.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
