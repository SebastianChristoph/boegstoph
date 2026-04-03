import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  const notes = await prisma.gardenNote.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(notes)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  const { title, body } = await req.json()
  if (!title?.trim()) return new NextResponse("title required", { status: 400 })
  const note = await prisma.gardenNote.create({ data: { title: title.trim(), body: body?.trim() ?? "", year: new Date().getFullYear() } })
  return NextResponse.json(note, { status: 201 })
}
