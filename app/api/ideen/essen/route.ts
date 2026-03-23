import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  const ideas = await prisma.foodIdea.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(ideas)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  const { text } = await req.json()
  if (!text?.trim()) return new NextResponse("Bad Request", { status: 400 })
  const idea = await prisma.foodIdea.create({ data: { text: text.trim() } })
  return NextResponse.json(idea, { status: 201 })
}
