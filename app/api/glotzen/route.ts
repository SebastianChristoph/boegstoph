import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const titles = await prisma.glotzenTitle.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(titles)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const { imdbId, title, year, type, posterUrl, plot, imdbRating } = await req.json()
  if (!title?.trim()) return new NextResponse("Bad Request", { status: 400 })

  if (imdbId) {
    const existing = await prisma.glotzenTitle.findUnique({ where: { imdbId } })
    if (existing) return NextResponse.json(existing)
  }

  const created = await prisma.glotzenTitle.create({
    data: {
      imdbId: imdbId || null,
      title: title.trim(),
      year: year || null,
      type: type === "series" ? "series" : "movie",
      posterUrl: posterUrl || null,
      plot: plot || null,
      imdbRating: typeof imdbRating === "number" ? imdbRating : null,
    },
  })
  return NextResponse.json(created, { status: 201 })
}
