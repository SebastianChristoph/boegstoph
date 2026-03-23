import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import path from "path"

const PHOTOS_DIR = path.join(process.cwd(), "data", "photos")

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
}

export async function GET(_req: Request, { params }: { params: { filename: string } }) {
  const filename = path.basename(params.filename) // prevent path traversal
  const ext = filename.split(".").pop()?.toLowerCase() ?? ""
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream"

  try {
    const data = await readFile(path.join(PHOTOS_DIR, filename))
    return new Response(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}
