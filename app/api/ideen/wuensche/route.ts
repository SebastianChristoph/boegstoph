import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const PERSONS = ["Tina", "Sebastian", "Fritz", "Ede"]

export async function GET() {
  const wishes = await prisma.birthdayWish.findMany({ orderBy: { createdAt: "asc" } })
  return NextResponse.json(wishes)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  const { person, wish } = await req.json()
  if (!PERSONS.includes(person) || !wish?.trim()) return new NextResponse("Bad Request", { status: 400 })
  const entry = await prisma.birthdayWish.create({ data: { person, wish: wish.trim() } })
  return NextResponse.json(entry, { status: 201 })
}
