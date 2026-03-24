import type { Metadata, Viewport } from "next"
import "./globals.css"
import Providers from "@/components/Providers"

export const metadata: Metadata = {
  title: "Familien Hub",
  description: "Der digitale Hub für unsere Familie",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Familien Hub" },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
    other: [
      { rel: "android-chrome", url: "/android-chrome-192x192.png", sizes: "192x192" },
      { rel: "android-chrome", url: "/android-chrome-512x512.png", sizes: "512x512" },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: "#4a88c2",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body><Providers>{children}</Providers></body>
    </html>
  )
}
