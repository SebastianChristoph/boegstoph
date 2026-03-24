import Link from "next/link"
import CalendarWidget from "@/components/CalendarWidget"
import DashboardStats from "@/components/DashboardStats"
import Connect4Widget from "@/components/Connect4Widget"

export default function DashboardPage() {
  const today = new Date()
  const hour = today.getHours()
  const greeting = hour < 12 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend"

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{greeting}! 👋</h1>
        <p className="text-gray-500 mt-1">{today.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>

      {/* Stat cards — live via SSE */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <DashboardStats />
      </div>

      {/* Google Calendar — heute & morgen */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">📅</span>
          <h2 className="text-sm font-semibold text-gray-700">Termine</h2>
        </div>
        <CalendarWidget days={2} />
      </div>

      <Connect4Widget />

      <Link href="/home"
        className="flex items-center gap-4 bg-primary-600 hover:bg-primary-700 active:scale-95 transition-all text-white rounded-2xl p-5 mb-8 shadow-sm">
        <img src="/apple-touch-icon.png" alt="" className="w-10 h-10 rounded-xl shrink-0" />
        <div>
          <div className="font-semibold">Home-Ansicht</div>
          <div className="text-sm text-blue-100">Foto-Diashow für das Tablet</div>
        </div>
        <span className="ml-auto text-blue-200 text-xl">›</span>
      </Link>

    </div>
  )
}
