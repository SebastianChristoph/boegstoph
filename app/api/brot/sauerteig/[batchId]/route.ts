import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { batchId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })

  await prisma.sauerteigBatch.update({
    where: { id: params.batchId },
    data: { status: "archived" },
  })
  return new NextResponse(null, { status: 204 })
}
