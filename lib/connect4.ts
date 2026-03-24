export const COLS = 7
export const ROWS = 6

export type Player = "Sebastian" | "Tina"
export type Cell = "" | Player
export type Board = Cell[]

export function emptyBoard(): Board {
  return Array(COLS * ROWS).fill("")
}

export function cellAt(board: Board, row: number, col: number): Cell {
  return board[row * COLS + col]
}

export function dropPiece(board: Board, col: number, player: Player): Board | null {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (cellAt(board, r, col) === "") {
      const next = [...board]
      next[r * COLS + col] = player
      return next
    }
  }
  return null // column full
}

export function checkWinner(board: Board): Player | "draw" | null {
  const dirs: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]]
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = cellAt(board, r, c)
      if (!cell) continue
      for (const [dr, dc] of dirs) {
        let count = 1
        for (let i = 1; i < 4; i++) {
          const nr = r + dr * i, nc = c + dc * i
          if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || cellAt(board, nr, nc) !== cell) break
          count++
        }
        if (count === 4) return cell as Player
      }
    }
  }
  return board.every(c => c !== "") ? "draw" : null
}

export function randomPlayer(): Player {
  return Math.random() < 0.5 ? "Sebastian" : "Tina"
}

export function otherPlayer(p: Player): Player {
  return p === "Sebastian" ? "Tina" : "Sebastian"
}
