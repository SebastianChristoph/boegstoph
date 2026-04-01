import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import path from "path"

const BROT_DIR = path.join(process.cwd(), "data", "photos", "brot")

export async function GET(
  _req: NextRequest,
  { params }: { params: { filename: string } }
) {
  // Sanitize: only allow safe filenames (no path traversal)
  const safe = path.basename(params.filename)
  try {
    const buffer = await readFile(path.join(BROT_DIR, safe))
    const ext = safe.split(".").pop()?.toLowerCase() ?? "jpg"
    const mime = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : ext === "webp" ? "image/webp" : "image/jpeg"
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    return new NextResponse("Not found", { status: 404 })
  }
}
