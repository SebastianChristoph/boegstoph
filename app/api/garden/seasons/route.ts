import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateTodosFromTimeline } from "@/lib/gartenTimeline"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const yearParam = req.nextUrl.searchParams.get("year")
  const minYearParam = req.nextUrl.searchParams.get("minYear")
  const slim = req.nextUrl.searchParams.get("slim") === "1"

  const where = minYearParam
    ? { year: { gte: parseInt(minYearParam) } }
    : { year: parseInt(yearParam ?? String(new Date().getFullYear())) }

  if (slim) {
    // Lightweight: only fields needed for crop rotation history
    const seasons = await prisma.gardenSeason.findMany({
      where,
      select: { id: true, plantId: true, bedId: true, year: true, plant: { select: { name: true } } },
      orderBy: { year: "asc" },
    })
    return NextResponse.json(seasons)
  }

  const seasons = await prisma.gardenSeason.findMany({
    where,
    include: {
      plant: true,
      bed: true,
      diary: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json(seasons)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  const body = await req.json()
  const { plantId, year, bedId } = body

  const season = await prisma.gardenSeason.create({
    data: {
      plantId,
      year: parseInt(year),
      bedId: bedId || null,
      method: body.method || null,
    },
  })

  const plant = await prisma.gardenPlant.findUnique({ where: { id: plantId } })
  if (plant) {
    const seasonForTimeline = {
      id: season.id,
      year: season.year,
      method: season.method,
      plant: {
        name: plant.name,
        variety: plant.variety,
        vorzuchtMonat: plant.vorzuchtMonat,
        aussaatMonat: plant.aussaatMonat,
      },
    }
    const todoData = generateTodosFromTimeline(seasonForTimeline)
    if (todoData.length > 0) {
      await prisma.gardenTodo.createMany({
        data: todoData.map(t => ({ title: t.title, dueDate: t.dueDate, type: t.type, seasonId: season.id })),
      })
    }
  }

  const full = await prisma.gardenSeason.findUnique({
    where: { id: season.id },
    include: { plant: true, bed: true, diary: true },
  })
  return NextResponse.json(full, { status: 201 })
}
