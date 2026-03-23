import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { broadcast } from "@/lib/sse"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

const PHOTOS_DIR = path.join(process.cwd(), "data", "photos")

export async function GET() {
  const photos = await prisma.photo.findMany({ orderBy: { createdAt: "asc" } })
  return NextResponse.json(photos)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  await mkdir(PHOTOS_DIR, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(PHOTOS_DIR, filename), buffer)

  const photo = await prisma.photo.create({
    data: { filename, originalName: file.name },
  })

  broadcast("photos")
  return NextResponse.json(photo, { status: 201 })
}
