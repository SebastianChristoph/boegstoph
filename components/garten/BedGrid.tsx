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
  onCellClick?: (index: number) => void
  highlightedCell?: number | null
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
  onCellClick,
  highlightedCell,
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
        const isHighlighted = highlightedCell === i

        const handleClick = () => {
          if (editable) { onToggle?.(i); return }
          if (isActive) onCellClick?.(i)
        }

        return (
          <div
            key={i}
            onClick={handleClick}
            title={data?.label}
            style={{
              width: 22,
              height: 22,
              borderRadius: 3,
              backgroundColor: isActive ? (data?.bg ?? "#a0785a") : "#e5e7eb",
              cursor: (editable || (isActive && onCellClick)) ? "pointer" : "default",
              overflow: "hidden",
              flexShrink: 0,
              opacity: isActive ? 1 : 0.4,
              boxShadow: isHighlighted ? "0 0 0 2px #4a88c2" : undefined,
              zIndex: isHighlighted ? 1 : undefined,
              position: "relative",
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
