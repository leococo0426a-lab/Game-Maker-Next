import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const SIZE = 9;

function getLiberties(board: ("b" | "w" | null)[][], r: number, c: number, color: "b" | "w", visited: Set<string>): number {
  const key = `${r},${c}`;
  if (visited.has(key) || r < 0 || r >= SIZE || c < 0 || c >= SIZE) return 0;
  if (board[r][c] === null) return 1;
  if (board[r][c] !== color) return 0;
  visited.add(key);
  return getLiberties(board, r - 1, c, color, visited) + getLiberties(board, r + 1, c, color, visited) + getLiberties(board, r, c - 1, color, visited) + getLiberties(board, r, c + 1, color, visited);
}

function removeDead(board: ("b" | "w" | null)[][], color: "b" | "w"): ("b" | "w" | null)[][] {
  const nb = board.map(row => [...row]);
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (nb[r][c] === color) {
      const libs = getLiberties(nb, r, c, color, new Set());
      if (libs === 0) nb[r][c] = null;
    }
  }
  return nb;
}

function countTerritory(board: ("b" | "w" | null)[][]): [number, number] {
  let b = 0, w = 0;
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (board[r][c] === "b") b++;
    if (board[r][c] === "w") w++;
  }
  return [b, w];
}

export default function Go() {
  const [board, setBoard] = useState<("打" | "白" | null)[][]>(Array(SIZE).fill(null).map(() => Array(SIZE).fill(null)));
  const [turn, setTurn] = useState<"打" | "白">("打");
  const [lastMove, setLastMove] = useState<{r:number;c:number} | null>(null);
  const [passCount, setPassCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const { addPlay } = useGameHistory();

  const reset = () => {
    setBoard(Array(SIZE).fill(null).map(() => Array(SIZE).fill(null)));
    setTurn("打"); setLastMove(null); setPassCount(0); setGameOver(false);
  };

  const handleClick = (r: number, c: number) => {
    if (gameOver || board[r][c]) return;
    const nb = board.map(row => [...row]);
    const color = turn === "打" ? "b" : "w";
    const opp = turn === "打" ? "w" : "b";
    nb[r][c] = color;
    const afterCapture = removeDead(nb, opp as "b" | "w");
    const libs = getLiberties(afterCapture, r, c, color, new Set());
    if (libs === 0) return;
    setBoard(afterCapture);
    setLastMove({ r, c });
    setPassCount(0);
    setTurn(t => t === "打" ? "白" : "打");
  };

  const pass = () => {
    if (gameOver) return;
    const newPass = passCount + 1;
    setPassCount(newPass);
    if (newPass >= 2) {
      setGameOver(true);
      const [b, w] = countTerritory(board);
      addPlay("go", b > w ? b : w);
    }
    setTurn(t => t === "打" ? "白" : "打");
  };

  const [bScore, wScore] = countTerritory(board);

  return (
    <div className="flex flex-col items-center space-y-4 max-w-sm mx-auto">
      <div className="flex justify-between w-full px-2">
        <div className="text-center"><div className="w-6 h-6 rounded-full bg-slate-900 mx-auto mb-1"/><p className="font-black">{bScore}</p></div>
        <div className="text-center">
          <p className="text-sm font-bold text-muted-foreground">{gameOver ? "終了" : `${turn}の番`}</p>
          {gameOver && <p className={`font-black ${bScore > wScore ? "text-green-600" : wScore > bScore ? "text-red-600" : ""}`}>{bScore > wScore ? "打の勝ち" : wScore > bScore ? "白の勝ち" : "引き分け"}</p>}
        </div>
        <div className="text-center"><div className="w-6 h-6 rounded-full bg-white border-2 border-border mx-auto mb-1"/><p className="font-black">{wScore}</p></div>
      </div>
      <div className="bg-amber-100 p-3 rounded-xl border-4 border-amber-800">
        <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}>
          {board.map((row, r) => row.map((cell, c) => {
            const isLast = lastMove?.r === r && lastMove?.c === c;
            return (
              <button key={`${r}-${c}`} onClick={() => handleClick(r, c)}
                className={`w-7 h-7 relative flex items-center justify-center ${isLast ? "ring-1 ring-red-500" : ""}`}
                style={{ background: (r + c) % 2 === 0 ? "#d4a574" : "#c49a6c" }}>
                {cell === "b" && <div className="w-5 h-5 rounded-full bg-slate-900" />}
                {cell === "w" && <div className="w-5 h-5 rounded-full bg-white border border-slate-300" />}
              </button>
            );
          }))}
        </div>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={pass} className="rounded-full">パス</Button>
        <Button variant="outline" onClick={reset} className="rounded-full">リセット</Button>
      </div>
      <p className="text-xs text-muted-foreground">打と白が交互に石を置く。気をつけて引き分けよう！</p>
    </div>
  );
}
