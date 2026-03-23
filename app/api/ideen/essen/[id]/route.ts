import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  const { text } = await req.json()
  const idea = await prisma.foodIdea.update({ where: { id: params.id }, data: { text: text.trim() } })
  return NextResponse.json(idea)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  await prisma.foodIdea.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
