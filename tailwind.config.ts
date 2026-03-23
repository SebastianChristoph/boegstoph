import type { Config } from "tailwindcss"
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: { colors: { primary: { DEFAULT: "#4a88c2", 50: "#eff6ff", 100: "#dbeafe", 600: "#4a88c2", 700: "#3a72a8" } } } },
  plugins: [],
}
export default config
