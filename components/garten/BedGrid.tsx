"use client"

export interface BedCellData {
  bg: string
  thumbnailUrl?: string | null
  label?: string
}

interface BedGridProps {
  cols: number
  rows: number
  activeCells: number[]
  cellData?: Map<number, BedCellData>
  editable?: boolean
  onToggle?: (index: number) => void
}

export function plantBg(index: number): string {
  const hue = (index * 137) % 360
  return `hsl(${hue}, 55%, 72%)`
}

export default function BedGrid({
  cols,
  rows,
  activeCells,
  cellData = new Map(),
  editable = false,
  onToggle,
}: BedGridProps) {
  const activeSet = new Set(activeCells)

  return (
    <div
      style={{
        display: "inline-grid",
        gridTemplateColumns: `repeat(${cols}, 22px)`,
        gap: "2px",
      }}
    >
      {Array.from({ length: cols * rows }, (_, i) => {
        const isActive = activeSet.has(i)
        const data = cellData.get(i)
        return (
          <div
            key={i}
            onClick={() => editable && onToggle?.(i)}
            title={data?.label}
            style={{
              width: 22,
              height: 22,
              borderRadius: 3,
              backgroundColor: isActive ? (data?.bg ?? "#d1fae5") : "#e5e7eb",
              cursor: editable ? "pointer" : "default",
              overflow: "hidden",
              flexShrink: 0,
              opacity: isActive ? 1 : 0.4,
            }}
          >
            {data?.thumbnailUrl && isActive && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.thumbnailUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
