import type { Metadata, Viewport } from "next"
import "./globals.css"
import Providers from "@/components/Providers"
export const metadata: Metadata = {
  title: "Familien Hub",
  description: "Der digitale Hub für unsere Familie",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Familien Hub" },
}
export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body><Providers>{children}</Providers></body>
    </html>
  )
}
