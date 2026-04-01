import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const rezepte = await prisma.brotRezept.findMany({
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json(rezepte)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const body = await req.json()
  const rezept = await prisma.brotRezept.create({
    data: {
      name: body.name,
      emoji: body.emoji || "🍞",
      beschreibung: body.beschreibung,
      schwierigkeit: body.schwierigkeit,
      backzeit: body.backzeit,
      gesamtzeit: body.gesamtzeit,
      ergebnis: body.ergebnis,
      mehltyp: body.mehltyp,
      imageUrl: body.imageUrl ?? null,
      zutaten: JSON.stringify(body.zutaten ?? []),
      schritte: JSON.stringify(body.schritte ?? []),
    },
  })
  return NextResponse.json(rezept, { status: 201 })
}
