"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
const links = [
  { href: "/dashboard", label: "Start", icon: "🏠" },
  { href: "/shopping", label: "Einkaufslisten", icon: "🛒" },
  { href: "/tasks", label: "Aufgaben", icon: "✅" },
  { href: "/garten", label: "Garten", icon: "🌱" },
  { href: "/ideen", label: "Ideen", icon: "💡" },
  { href: "/einstellungen", label: "Einstellungen", icon: "⚙️" },
]
export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="hidden md:flex flex-col w-60 bg-white border-r border-gray-200 shrink-0">
      <div className="p-6 border-b border-gray-100">
        <div className="text-2xl mb-1">🏠</div>
        <h1 className="font-bold text-lg text-gray-900">Die Bögstophs</h1>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map((l) => {
          const active = pathname.startsWith(l.href)
          return (
            <Link key={l.href} href={l.href}
              className={"flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors " + (active ? "bg-primary-600 text-white font-semibold" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900")}>
              <span className="text-lg">{l.icon}</span>{l.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t border-gray-100">
        <button onClick={() => { localStorage.removeItem("fh_saved_pw"); signOut({ callbackUrl: "/login" }) }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900 w-full">
          <span className="text-lg">🚪</span>Ausloggen
        </button>
      </div>
    </aside>
  )
}