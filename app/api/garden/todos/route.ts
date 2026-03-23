import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  const todos = await prisma.gardenTodo.findMany({
    include: { season: { include: { plant: true } } },
    orderBy: { dueDate: "asc" },
  })
  return NextResponse.json(todos)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  const { title, dueDate, seasonId } = await req.json()
  const todo = await prisma.gardenTodo.create({
    data: { title: title.trim(), dueDate: dueDate ? new Date(dueDate) : null, seasonId: seasonId || null },
    include: { season: { include: { plant: true } } },
  })
  return NextResponse.json(todo, { status: 201 })
}
