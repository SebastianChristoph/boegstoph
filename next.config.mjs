import withPWAInit from "@ducanh2912/next-pwa"

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
})

const nextConfig = {
  output: "standalone",
}

export default withPWA(nextConfig)
