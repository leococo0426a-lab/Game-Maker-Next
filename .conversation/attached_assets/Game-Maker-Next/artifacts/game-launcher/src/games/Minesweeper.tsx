import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

type Difficulty = "easy" | "normal" | "hard";
const CONFIGS: Record<Difficulty, { rows: number; cols: number; mines: number }> = {
  easy:   { rows: 8,  cols: 10, mines: 10 },
  normal: { rows: 10, cols: 14, mines: 20 },
  hard:   { rows: 12, cols: 18, mines: 40 },
};

type Cell = { mine: boolean; revealed: boolean; flagged: boolean; count: number };

function createBoard(rows: number, cols: number, mines: number, safeIdx: number): Cell[][] {
  const cells: Cell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ mine: false, revealed: false, flagged: false, count: 0 }))
  );
  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    const idx = r * cols + c;
    if (!cells[r][c].mine && Math.abs(idx - safeIdx) > cols + 2) {
      cells[r][c].mine = true;
      placed++;
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (cells[r][c].mine) continue;
      let cnt = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && cells[nr][nc].mine) cnt++;
      }
      cells[r][c].count = cnt;
    }
  }
  return cells;
}

const COUNT_COLORS = ["","text-blue-600","text-green-600","text-red-600","text-indigo-800","text-red-800","text-cyan-600","text-black","text-gray-600"];

function flood(board: Cell[][], r: number, c: number, rows: number, cols: number) {
  if (r < 0 || r >= rows || c < 0 || c >= cols) return;
  if (board[r][c].revealed || board[r][c].flagged || board[r][c].mine) return;
  board[r][c].revealed = true;
  if (board[r][c].count === 0) {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) flood(board, r+dr, c+dc, rows, cols);
  }
}

export default function Minesweeper() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [board, setBoard] = useState<Cell[][] | null>(null);
  const [gameState, setGameState] = useState<"idle"|"playing"|"won"|"lost">("idle");
  const [flags, setFlags] = useState(0);
  const { addPlay } = useGameHistory();
  const cfg = CONFIGS[difficulty];

  const startGame = useCallback((diff: Difficulty = difficulty) => {
    setDifficulty(diff);
    setBoard(null);
    setGameState("idle");
    setFlags(0);
  }, [difficulty]);

  const handleClick = (r: number, c: number) => {
    if (gameState === "won" || gameState === "lost") return;
    let b: Cell[][];
    const idx = r * cfg.cols + c;
    if (!board) {
      b = createBoard(cfg.rows, cfg.cols, cfg.mines, idx);
      setGameState("playing");
    } else {
      b = board.map(row => row.map(cell => ({ ...cell })));
    }
    if (b[r][c].flagged || b[r][c].revealed) return;
    if (b[r][c].mine) {
      b.forEach(row => row.forEach(cell => { if (cell.mine) cell.revealed = true; }));
      setBoard(b); setGameState("lost"); addPlay("minesweeper");
      return;
    }
    flood(b, r, c, cfg.rows, cfg.cols);
    const allSafe = b.every(row => row.every(cell => cell.mine || cell.revealed));
    setBoard(b);
    if (allSafe) { setGameState("won"); addPlay("minesweeper", cfg.mines); }
  };

  const handleFlag = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (!board || gameState !== "playing") return;
    const b = board.map(row => row.map(cell => ({ ...cell })));
    if (b[r][c].revealed) return;
    b[r][c].flagged = !b[r][c].flagged;
    setFlags(f => b[r][c].flagged ? f + 1 : f - 1);
    setBoard(b);
  };

  const cellSize = difficulty === "hard" ? "w-7 h-7 text-xs" : difficulty === "normal" ? "w-8 h-8 text-sm" : "w-9 h-9 text-sm";

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex gap-2 items-center">
        {(["easy","normal","hard"] as Difficulty[]).map(d => (
          <Button key={d} size="sm" variant={difficulty === d ? "default" : "outline"}
            onClick={() => startGame(d)} className="rounded-full text-xs px-4">
            {d === "easy" ? "かんたん" : d === "normal" ? "ふつう" : "むずかしい"}
          </Button>
        ))}
        <div className="ml-4 text-sm font-bold text-foreground">🚩 {flags}/{cfg.mines}</div>
      </div>

      {gameState === "idle" && !board && (
        <div className="bg-muted/50 border-2 border-dashed border-border rounded-2xl p-8 text-center">
          <p className="text-4xl mb-3">💣</p>
          <p className="text-muted-foreground font-bold mb-4">マスをクリックしてスタート！<br/>右クリックで旗を立てられます</p>
          <Button onClick={() => handleClick(0, 0)} className="rounded-full px-8">スタート</Button>
        </div>
      )}

      {board && (
        <div className="overflow-auto">
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cfg.cols}, 1fr)`, gap: "2px" }}>
            {board.map((row, r) => row.map((cell, c) => (
              <button key={`${r}-${c}`}
                onClick={() => handleClick(r, c)}
                onContextMenu={e => handleFlag(e, r, c)}
                className={`
                  ${cellSize} flex items-center justify-center font-black rounded border transition-all
                  ${cell.revealed
                    ? cell.mine
                      ? "bg-red-100 border-red-300"
                      : "bg-white border-gray-200"
                    : cell.flagged
                    ? "bg-orange-100 border-orange-300 hover:bg-orange-200"
                    : "bg-muted hover:bg-secondary border-border hover:scale-105"}
                  ${gameState === "won" || gameState === "lost" ? "cursor-default" : "cursor-pointer"}
                `}>
                {cell.revealed && cell.mine && "💣"}
                {cell.revealed && !cell.mine && cell.count > 0 && (
                  <span className={COUNT_COLORS[cell.count]}>{cell.count}</span>
                )}
                {!cell.revealed && cell.flagged && "🚩"}
              </button>
            )))}
          </div>
        </div>
      )}

      {(gameState === "won" || gameState === "lost") && (
        <div className={`border-2 rounded-2xl p-5 text-center ${gameState === "won" ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
          <h3 className={`text-2xl font-black mb-3 ${gameState === "won" ? "text-green-700" : "text-red-700"}`}>
            {gameState === "won" ? "クリア！" : "ゲームオーバー"}
          </h3>
          <Button onClick={() => startGame()} className="rounded-full px-8">もう一度</Button>
        </div>
      )}
    </div>
  );
}
