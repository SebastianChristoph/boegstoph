import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { broadcast } from "@/lib/sse"
import { unlink } from "fs/promises"
import path from "path"

const PHOTOS_DIR = path.join(process.cwd(), "data", "photos")

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const photo = await prisma.photo.findUnique({ where: { id: params.id } })
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.photo.delete({ where: { id: params.id } })

  try {
    await unlink(path.join(PHOTOS_DIR, photo.filename))
  } catch {
    // file already gone, ignore
  }

  broadcast("photos")
  return new NextResponse(null, { status: 204 })
}
