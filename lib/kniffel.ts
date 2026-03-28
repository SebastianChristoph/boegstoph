export type Player = "Sebastian" | "Tina"

export const UPPER_CATEGORIES = ["einser", "zweier", "dreier", "vierer", "fuenfer", "sechser"] as const
export const LOWER_CATEGORIES = ["dreierpasch", "viererpasch", "fullhouse", "kleineStrasse", "grosseStrasse", "kniffel", "chance"] as const
export const CATEGORIES = [...UPPER_CATEGORIES, ...LOWER_CATEGORIES] as const
export type Category = typeof CATEGORIES[number]

export type ScoreCard = Record<Category, number | null>

export const CATEGORY_LABELS: Record<Category, string> = {
  einser: "Einser",
  zweier: "Zweier",
  dreier: "Dreier",
  vierer: "Vierer",
  fuenfer: "Fünfer",
  sechser: "Sechser",
  dreierpasch: "Dreierpasch",
  viererpasch: "Viererpasch",
  fullhouse: "Full House",
  kleineStrasse: "Kl. Straße",
  grosseStrasse: "Gr. Straße",
  kniffel: "Kniffel",
  chance: "Chance",
}

export function emptyScoreCard(): ScoreCard {
  return Object.fromEntries(CATEGORIES.map(c => [c, null])) as ScoreCard
}

export function rollDice(dice: number[], held: boolean[]): number[] {
  return dice.map((d, i) => held[i] ? d : Math.floor(Math.random() * 6) + 1)
}

export function calcScore(dice: number[], category: Category): number {
  const counts: number[] = Array(7).fill(0)
  dice.forEach(d => counts[d]++)
  const sum = dice.reduce((a, b) => a + b, 0)

  switch (category) {
    case "einser": return counts[1] * 1
    case "zweier": return counts[2] * 2
    case "dreier": return counts[3] * 3
    case "vierer": return counts[4] * 4
    case "fuenfer": return counts[5] * 5
    case "sechser": return counts[6] * 6
    case "dreierpasch": return counts.some(c => c >= 3) ? sum : 0
    case "viererpasch": return counts.some(c => c >= 4) ? sum : 0
    case "fullhouse":
      return counts.some(c => c === 3) && counts.some(c => c === 2) ? 25 : 0
    case "kleineStrasse": {
      const unique = Array.from(new Set(dice)).sort((a, b) => a - b)
      return [[1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]].some(s => s.every(n => unique.includes(n))) ? 30 : 0
    }
    case "grosseStrasse": {
      const sorted = Array.from(new Set(dice)).sort((a, b) => a - b).join("")
      return sorted === "12345" || sorted === "23456" ? 40 : 0
    }
    case "kniffel": return counts.some(c => c === 5) ? 50 : 0
    case "chance": return sum
  }
}

export function calcUpperTotal(sc: ScoreCard): number {
  return UPPER_CATEGORIES.reduce((s, c) => s + (sc[c] ?? 0), 0)
}

export function calcTotal(sc: ScoreCard): number {
  const upper = calcUpperTotal(sc)
  const bonus = upper >= 63 ? 35 : 0
  return upper + bonus + LOWER_CATEGORIES.reduce((s, c) => s + (sc[c] ?? 0), 0)
}

export function isCardFull(sc: ScoreCard): boolean {
  return CATEGORIES.every(c => sc[c] !== null)
}

export function otherPlayer(p: Player): Player {
  return p === "Sebastian" ? "Tina" : "Sebastian"
}

export function randomPlayer(): Player {
  return Math.random() < 0.5 ? "Sebastian" : "Tina"
}
