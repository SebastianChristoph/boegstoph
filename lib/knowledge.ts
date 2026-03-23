export const CATEGORIES = [
  { id: "obst-gemuese", label: "Obst & Gemüse", icon: "🍎" },
  { id: "lebensmittel", label: "Lebensmittel", icon: "🥫" },
  { id: "kuehlung", label: "Kühlung", icon: "🧊" },
  { id: "haushalt", label: "Haushalt", icon: "🧹" },
  { id: "hygiene", label: "Hygiene", icon: "🧴" },
  { id: "non-food", label: "Non-Food", icon: "📦" },
  { id: "sonstiges", label: "Sonstiges", icon: "🗂️" },
] as const

export type CategoryId = (typeof CATEGORIES)[number]["id"]
export const DEFAULT_CATEGORY: CategoryId = "lebensmittel"

/** Strips leading quantity prefixes so "2x Mango", "1 Mango", "Mango" all map to "mango" */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/^\d+\s*[x×]\s*/i, "")   // "2x ", "3× "
    .replace(/^\d+\s+/, "")            // "1 ", "2 "
    .replace(/\s+/g, " ")
    .trim()
}
