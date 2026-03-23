import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  const { seasonId, note, success } = await req.json()
  const entry = await prisma.gardenDiary.create({
    data: { seasonId, note: note.trim(), success: success ?? null },
  })
  return NextResponse.json(entry, { status: 201 })
}
