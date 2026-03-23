"use client"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
export default function LoginPage() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(false)
    const result = await signIn("credentials", { password, redirect: false })
    if (result?.ok) { router.push("/dashboard") } else { setError(true); setLoading(false) }
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🏠</div>
          <h1 className="text-2xl font-bold text-gray-900">Familien Hub</h1>
          <p className="text-gray-500 mt-1">Gib das Familienpasswort ein</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary-600"
            placeholder="Passwort" autoFocus />
          {error && <p className="text-red-600 text-sm">Falsches Passwort.</p>}
          <button type="submit" disabled={loading || !password}
            className="w-full bg-primary-600 text-white py-3 rounded-xl font-medium disabled:opacity-50">
            {loading ? "..." : "Einloggen"}
          </button>
        </form>
      </div>
    </div>
  )
}