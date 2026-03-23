export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const entries = await prisma.itemKnowledge.findMany({
    orderBy: { useCount: "desc" },
    take: 300,
  })
  return NextResponse.json(entries)
}
