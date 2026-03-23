import { prisma } from "@/lib/prisma"
import ShoppingClient from "@/components/shopping/ShoppingClient"
export default async function ShoppingPage() {
  const lists = await prisma.shoppingList.findMany({
    include: { items: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  })
  return <ShoppingClient initialLists={lists} />
}