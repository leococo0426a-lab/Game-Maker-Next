import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

type Player = "X" | "O" | null;
type Difficulty = "easy" | "medium" | "hard";
type Mode = "ai" | "online";

const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function checkWinner(board: Player[]): Player {
  for (const [a,b,c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}

function getWinLine(board: Player[]): number[] | null {
  for (const line of LINES) {
    const [a,b,c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return line;
  }
  return null;
}

function minimax(board: Player[], isMax: boolean, depth: number): number {
  const w = checkWinner(board);
  if (w === "O") return 10 - depth;
  if (w === "X") return depth - 10;
  if (!board.includes(null)) return 0;
  const moves = board.map((v,i) => v === null ? i : null).filter(v => v !== null) as number[];
  if (isMax) {
    let best = -Infinity;
    for (const m of moves) { board[m] = "O"; best = Math.max(best, minimax(board, false, depth+1)); board[m] = null; }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) { board[m] = "X"; best = Math.min(best, minimax(board, true, depth+1)); board[m] = null; }
    return best;
  }
}

function getAIMove(board: Player[], difficulty: Difficulty): number {
  const moves = board.map((v,i) => v === null ? i : null).filter(v => v !== null) as number[];
  if (moves.length === 0) return -1;

  if (difficulty === "easy") {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  if (difficulty === "medium") {
    for (const m of moves) {
      const b = [...board]; b[m] = "O";
      if (checkWinner(b) === "O") return m;
    }
    for (const m of moves) {
      const b = [...board]; b[m] = "X";
      if (checkWinner(b) === "X") return m;
    }
    if (Math.random() < 0.3) return moves[Math.floor(Math.random() * moves.length)];
    if (board[4] === null) return 4;
    return moves[Math.floor(Math.random() * moves.length)];
  }

  let best = -Infinity, bestMove = moves[0];
  for (const m of moves) {
    const b = [...board]; b[m] = "O";
    const score = minimax(b, false, 0);
    if (score > best) { best = score; bestMove = m; }
  }
  return bestMove;
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = { easy: "かんたん", medium: "ふつう", hard: "むずかしい" };
const DIFFICULTY_COLORS: Record<Difficulty, string> = { easy: "text-green-600", medium: "text-yellow-600", hard: "text-red-600" };

export default function TicTacToe({ mode = "ai" }: { mode?: Mode }) {
  const [board, setBoard] = useState<Player[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState<Player>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [draws, setDraws] = useState(0);
  const { addPlay } = useGameHistory();
  const winLine = winner ? getWinLine(board) : null;

  const handleClick = (i: number) => {
    if (board[i] || winner || !isXNext) return;
    const nb = [...board]; nb[i] = "X";
    setBoard(nb);
    const w = checkWinner(nb);
    if (w) { setWinner(w); setWins(x => x + 1); addPlay("tictactoe"); }
    else if (!nb.includes(null)) { setIsDraw(true); setDraws(x => x + 1); }
    else setIsXNext(false);
  };

  useEffect(() => {
    if (isXNext || winner || isDraw) return;
    const timer = setTimeout(() => {
      const move = getAIMove(board, difficulty);
      if (move === -1) return;
      const nb = [...board]; nb[move] = "O";
      setBoard(nb);
      const w = checkWinner(nb);
      if (w) { setWinner(w); setLosses(x => x + 1); addPlay("tictactoe"); }
      else if (!nb.includes(null)) { setIsDraw(true); setDraws(x => x + 1); }
      else setIsXNext(true);
    }, 400);
    return () => clearTimeout(timer);
  }, [isXNext, board, winner, isDraw, difficulty, addPlay]);

  const reset = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinner(null);
    setIsDraw(false);
  };

  return (
    <div className="flex flex-col items-center space-y-6 max-w-sm mx-auto p-4">
      <div className="text-center">
        <h2 className="text-2xl font-black text-foreground">三目並べ</h2>
        <p className={`text-sm font-bold mt-1 ${DIFFICULTY_COLORS[difficulty]}`}>難易度: {DIFFICULTY_LABELS[difficulty]}</p>
      </div>

      <div className="flex gap-2">
        {(["easy","medium","hard"] as Difficulty[]).map(d => (
          <Button key={d} size="sm" variant={difficulty === d ? "default" : "outline"}
            onClick={() => { setDifficulty(d); reset(); }}
            className="rounded-full text-xs px-4">
            {DIFFICULTY_LABELS[d]}
          </Button>
        ))}
      </div>

      <div className="flex gap-6 text-center">
        {[["あなた", wins, "text-primary"], ["引き分け", draws, "text-muted-foreground"], ["AI", losses, "text-destructive"]].map(([label, count, color]) => (
          <div key={label as string}>
            <p className={`text-xs font-bold uppercase ${color}`}>{label}</p>
            <p className="text-2xl font-black text-foreground">{count}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 w-64 h-64">
        {board.map((cell, i) => (
          <button
            key={i}
            data-testid={`cell-tictactoe-${i}`}
            onClick={() => handleClick(i)}
            disabled={!!cell || !!winner || !isXNext}
            className={`
              flex items-center justify-center text-4xl font-black rounded-xl transition-all duration-150
              ${winLine?.includes(i) ? "bg-primary/20 border-2 border-primary scale-105" : "bg-muted hover:bg-secondary border-2 border-border"}
              ${!cell && !winner && isXNext ? "hover:scale-105 cursor-pointer" : "cursor-default"}
              ${cell === "X" ? "text-primary" : "text-destructive"}
            `}
          >
            {cell}
          </button>
        ))}
      </div>

      <div className="h-20 flex flex-col items-center justify-center w-full gap-3">
        {winner ? (
          <>
            <h3 className={`text-xl font-black ${winner === "X" ? "text-primary" : "text-destructive"}`}>
              {winner === "X" ? "あなたの勝ち！" : "AIの勝ち..."}
            </h3>
            <Button onClick={reset} className="rounded-full px-8">もう一度</Button>
          </>
        ) : isDraw ? (
          <>
            <h3 className="text-xl font-black text-muted-foreground">引き分け！</h3>
            <Button onClick={reset} className="rounded-full px-8">もう一度</Button>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            {isXNext ? "あなたのターン (X)" : `AIが考え中... (${DIFFICULTY_LABELS[difficulty]})`}
          </p>
        )}
      </div>
    </div>
  );
}
