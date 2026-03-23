"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
const links = [
  { href: "/dashboard", label: "Start", icon: "🏠" },
  { href: "/shopping", label: "Einkaufslisten", icon: "🛒" },
  { href: "/tasks", label: "Aufgaben", icon: "✅" },
  { href: "/fotos", label: "Fotos", icon: "📷" },
]
export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="hidden md:flex flex-col w-60 bg-gray-900 text-white shrink-0">
      <div className="p-6 border-b border-gray-800">
        <div className="text-2xl mb-1">🏠</div>
        <h1 className="font-bold text-lg">Familien Hub</h1>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map((l) => {
          const active = pathname.startsWith(l.href)
          return (
            <Link key={l.href} href={l.href}
              className={"flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors " + (active ? "bg-primary-600 text-white font-semibold" : "text-gray-400 hover:bg-gray-800 hover:text-white")}>
              <span className="text-lg">{l.icon}</span>{l.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t border-gray-800">
        <button onClick={() => { localStorage.removeItem("fh_saved_pw"); signOut({ callbackUrl: "/login" }) }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-gray-800 hover:text-white w-full">
          <span className="text-lg">🚪</span>Ausloggen
        </button>
      </div>
    </aside>
  )
}