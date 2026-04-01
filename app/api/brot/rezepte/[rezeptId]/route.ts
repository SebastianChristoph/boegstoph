import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { unlink } from "fs/promises"
import path from "path"

export async function PUT(
  req: NextRequest,
  { params }: { params: { rezeptId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const body = await req.json()
  const rezept = await prisma.brotRezept.update({
    where: { id: params.rezeptId },
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
  return NextResponse.json(rezept)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { rezeptId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  const rezept = await prisma.brotRezept.findUnique({ where: { id: params.rezeptId } })
  if (!rezept) return new NextResponse("Not found", { status: 404 })

  // Delete local upload if applicable
  if (rezept.imageUrl?.startsWith("/api/brot/rezepte/file/")) {
    const filename = rezept.imageUrl.split("/").pop()!
    const filePath = path.join(process.cwd(), "data", "photos", "brot", filename)
    await unlink(filePath).catch(() => { /* ignore if already gone */ })
  }

  await prisma.brotRezept.delete({ where: { id: params.rezeptId } })
  return new NextResponse(null, { status: 204 })
}
