"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
const links = [
  { href: "/dashboard", label: "Start", icon: "🏠" },
  { href: "/shopping", label: "Einkauf", icon: "🛒" },
  { href: "/tasks", label: "Aufgaben", icon: "✅" },
  { href: "/einstellungen", label: "Einstellungen", icon: "⚙️" },
]
export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-50">
      <div className="flex">
        {links.map((l) => {
          const active = pathname.startsWith(l.href)
          return (
            <Link key={l.href} href={l.href}
              className={"flex-1 flex flex-col items-center gap-0.5 py-3 text-xs transition-colors " + (active ? "text-primary-600" : "text-gray-500")}>
              <span className="text-xl">{l.icon}</span>
              <span className={active ? "font-semibold" : ""}>{l.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}