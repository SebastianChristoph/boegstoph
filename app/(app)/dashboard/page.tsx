import { prisma } from "@/lib/prisma"
import Link from "next/link"
export default async function DashboardPage() {
  const [lists, tasks] = await Promise.all([
    prisma.shoppingList.findMany({ include: { items: true } }),
    prisma.task.findMany({ where: { completed: false } }),
  ])
  const uncheckedItems = lists.reduce((sum, l) => sum + l.items.filter((i) => !i.checked).length, 0)
  const overdueTasks = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date()).length
  const today = new Date()
  const hour = today.getHours()
  const greeting = hour < 12 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend"
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{greeting}! 👋</h1>
        <p className="text-gray-500 mt-1">{today.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Link href="/shopping" className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm active:scale-95 transition-transform">
          <div className="text-3xl mb-2">🛒</div>
          <div className="text-2xl font-bold text-gray-900">{uncheckedItems}</div>
          <div className="text-sm text-gray-500 mt-0.5">Artikel offen</div>
        </Link>
        <Link href="/tasks" className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm active:scale-95 transition-transform">
          <div className="text-3xl mb-2">✅</div>
          <div className="text-2xl font-bold text-gray-900">{tasks.length}</div>
          <div className="text-sm text-gray-500 mt-0.5">
            Offene Aufgaben
            {overdueTasks > 0 && <span className="ml-1 text-red-500">({overdueTasks} überfällig)</span>}
          </div>
        </Link>
      </div>
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Schnellzugriff</h2>
        <Link href="/shopping" className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
          <span className="text-2xl">🛒</span>
          <div><div className="font-medium text-gray-900">Einkaufslisten</div><div className="text-sm text-gray-500">{lists.length} Liste{lists.length !== 1 && "n"}</div></div>
          <span className="ml-auto text-gray-400">›</span>
        </Link>
        <Link href="/tasks" className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
          <span className="text-2xl">📋</span>
          <div><div className="font-medium text-gray-900">Aufgaben</div><div className="text-sm text-gray-500">Haushalt, Garten & mehr</div></div>
          <span className="ml-auto text-gray-400">›</span>
        </Link>
      </div>
    </div>
  )
}