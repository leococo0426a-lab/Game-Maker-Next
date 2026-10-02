import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const ROWS = 6, COLS = 7;
type Cell = 0 | 1 | 2;
type Board = Cell[][];

function emptyBoard(): Board { return Array(ROWS).fill(null).map(() => Array(COLS).fill(0)); }

function dropPiece(board: Board, col: number, player: 1 | 2): Board | null {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (!board[r][col]) {
      const nb = board.map(row => [...row]) as Board;
      nb[r][col] = player;
      return nb;
    }
  }
  return null;
}

function checkWin(board: Board, player: Cell): [boolean, [number, number][] | null] {
  const directions = [[0,1],[1,0],[1,1],[1,-1]];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (board[r][c] !== player) continue;
    for (const [dr, dc] of directions) {
      const cells: [number, number][] = [[r, c]];
      for (let i = 1; i < 4; i++) {
        const nr = r + dr * i, nc = c + dc * i;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr][nc] !== player) break;
        cells.push([nr, nc]);
      }
      if (cells.length === 4) return [true, cells];
    }
  }
  return [false, null];
}

function scoreWindow(w: Cell[], player: Cell): number {
  const opp = player === 1 ? 2 : 1;
  const mine = w.filter(c => c === player).length;
  const empty = w.filter(c => c === 0).length;
  const theirs = w.filter(c => c === opp).length;
  if (mine === 4) return 100;
  if (mine === 3 && empty === 1) return 5;
  if (mine === 2 && empty === 2) return 2;
  if (theirs === 3 && empty === 1) return -4;
  return 0;
}

function scoreBoard(board: Board, player: Cell): number {
  let score = 0;
  const center = board.map(r => r[3]).filter(c => c === player).length;
  score += center * 3;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c <= COLS - 4; c++) score += scoreWindow(board[r].slice(c, c+4) as Cell[], player);
  for (let c = 0; c < COLS; c++) for (let r = 0; r <= ROWS - 4; r++) score += scoreWindow([board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]] as Cell[], player);
  for (let r = 0; r <= ROWS-4; r++) for (let c = 0; c <= COLS-4; c++) score += scoreWindow([board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]] as Cell[], player);
  for (let r = 3; r < ROWS; r++) for (let c = 0; c <= COLS-4; c++) score += scoreWindow([board[r][c], board[r-1][c+1], board[r-2][c+2], board[r-3][c+3]] as Cell[], player);
  return score;
}

function validCols(board: Board) { return Array.from({length: COLS}, (_,i) => i).filter(c => board[0][c] === 0); }

function minimax(board: Board, depth: number, alpha: number, beta: number, maximizing: boolean): number {
  const [w1] = checkWin(board, 1); const [w2] = checkWin(board, 2);
  if (w2) return 100000 + depth;
  if (w1) return -(100000 + depth);
  const cols = validCols(board);
  if (!cols.length || depth === 0) return scoreBoard(board, 2);
  if (maximizing) {
    let val = -Infinity;
    for (const c of cols) {
      const nb = dropPiece(board, c, 2)!;
      val = Math.max(val, minimax(nb, depth-1, alpha, beta, false));
      alpha = Math.max(alpha, val);
      if (alpha >= beta) break;
    }
    return val;
  } else {
    let val = Infinity;
    for (const c of cols) {
      const nb = dropPiece(board, c, 1)!;
      val = Math.min(val, minimax(nb, depth-1, alpha, beta, true));
      beta = Math.min(beta, val);
      if (alpha >= beta) break;
    }
    return val;
  }
}

function getBestMove(board: Board): number {
  const cols = validCols(board);
  let best = -Infinity, bestCol = cols[0];
  for (const c of cols) {
    const nb = dropPiece(board, c, 2)!;
    const val = minimax(nb, 4, -Infinity, Infinity, false);
    if (val > best) { best = val; bestCol = c; }
  }
  return bestCol;
}

export default function ConnectFour() {
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [winner, setWinner] = useState<Cell>(0);
  const [winLine, setWinLine] = useState<[number,number][] | null>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const { addPlay } = useGameHistory();

  const reset = () => { setBoard(emptyBoard()); setIsPlayerTurn(true); setWinner(0); setWinLine(null); setIsDraw(false); };

  const handleDrop = useCallback((col: number) => {
    if (!isPlayerTurn || winner || isDraw) return;
    const nb = dropPiece(board, col, 1); if (!nb) return;
    const [w, line] = checkWin(nb, 1);
    setBoard(nb);
    if (w) { setWinner(1); setWinLine(line); setWins(s => s + 1); addPlay("connectfour"); return; }
    if (!validCols(nb).length) { setIsDraw(true); addPlay("connectfour"); return; }
    setIsPlayerTurn(false);
  }, [board, isPlayerTurn, winner, isDraw, addPlay]);

  useEffect(() => {
    if (isPlayerTurn || winner || isDraw) return;
    const t = setTimeout(() => {
      const col = getBestMove(board);
      const nb = dropPiece(board, col, 2)!;
      const [w, line] = checkWin(nb, 2);
      setBoard(nb);
      if (w) { setWinner(2); setWinLine(line); setLosses(s => s + 1); addPlay("connectfour"); return; }
      if (!validCols(nb).length) { setIsDraw(true); addPlay("connectfour"); return; }
      setIsPlayerTurn(true);
    }, 400);
    return () => clearTimeout(t);
  }, [board, isPlayerTurn, winner, isDraw, addPlay]);

  return (
    <div className="flex flex-col items-center space-y-4 max-w-sm mx-auto">
      <div className="flex gap-6 text-center">
        <div><p className="text-xs font-bold text-red-500 uppercase">あなた</p><p className="text-2xl font-black text-foreground">{wins}</p></div>
        <div><p className="text-xs font-bold text-muted-foreground uppercase">AI</p><p className="text-2xl font-black text-foreground">{losses}</p></div>
      </div>
      <div className="bg-blue-600 p-2 rounded-2xl shadow-xl">
        <div className="flex gap-1 mb-1">
          {Array(COLS).fill(null).map((_,c) => (
            <button key={c} className="w-10 h-5 flex items-center justify-center" onClick={() => handleDrop(c)} onMouseEnter={() => setHoverCol(c)} onMouseLeave={() => setHoverCol(null)}>
              {hoverCol === c && isPlayerTurn && !winner && !isDraw && <div className="w-4 h-4 rounded-full bg-red-400" />}
            </button>
          ))}
        </div>
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
          {Array(ROWS).fill(null).map((_,r) =>
            Array(COLS).fill(null).map((_,c) => {
              const cell = board[r][c];
              const isWin = winLine?.some(([wr,wc]) => wr === r && wc === c);
              return (
                <div key={`${r}-${c}`} className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center cursor-pointer" onClick={() => handleDrop(c)}>
                  {cell !== 0 && (
                    <div className={`w-9 h-9 rounded-full transition-all ${cell === 1 ? "bg-red-500" : "bg-yellow-400"} ${isWin ? "ring-2 ring-white scale-110" : ""}`} />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      <div className="h-12 flex items-center justify-center">
        {winner ? (
          <div className="flex items-center gap-3">
            <p className={`font-black text-lg ${winner === 1 ? "text-green-600" : "text-red-600"}`}>{winner === 1 ? "あなたの勝ち！" : "AIの勝ち..."}</p>
            <Button onClick={reset} size="sm" className="rounded-full">もう一度</Button>
          </div>
        ) : isDraw ? (
          <div className="flex items-center gap-3"><p className="font-black text-muted-foreground">引き分け！</p><Button onClick={reset} size="sm" className="rounded-full">もう一度</Button></div>
        ) : (
          <p className="text-sm text-muted-foreground">{isPlayerTurn ? "あなたのターン（赤）" : "AIが考え中..."}</p>
        )}
      </div>
    </div>
  );
}
