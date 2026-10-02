import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

type Cell = 0 | 1 | 2;
type Board = Cell[][];
const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

function empty(): Board {
  const b: Board = Array(8).fill(null).map(() => Array(8).fill(0));
  b[3][3] = 2; b[4][4] = 2; b[3][4] = 1; b[4][3] = 1;
  return b;
}

function flip(board: Board, r: number, c: number, player: 1|2): Board | null {
  const opp = player === 1 ? 2 : 1;
  const toFlip: [number,number][] = [];
  for (const [dr, dc] of DIRS) {
    const line: [number,number][] = [];
    let nr = r+dr, nc = c+dc;
    while (nr>=0&&nr<8&&nc>=0&&nc<8&&board[nr][nc]===opp) { line.push([nr,nc]); nr+=dr; nc+=dc; }
    if (line.length && nr>=0&&nr<8&&nc>=0&&nc<8&&board[nr][nc]===player) toFlip.push(...line);
  }
  if (!toFlip.length) return null;
  const nb = board.map(row => [...row]) as Board;
  nb[r][c] = player;
  toFlip.forEach(([fr,fc]) => { nb[fr][fc] = player; });
  return nb;
}

function validMoves(board: Board, player: 1|2): [number,number][] {
  const moves: [number,number][] = [];
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) if (!board[r][c] && flip(board,r,c,player)) moves.push([r,c]);
  return moves;
}

function count(board: Board): [number,number] {
  let b=0, w=0;
  board.forEach(row => row.forEach(c => { if(c===1)b++; if(c===2)w++; }));
  return [b,w];
}

function aiMove(board: Board): Board {
  const moves = validMoves(board, 2);
  if (!moves.length) return board;
  let best = -Infinity, bestBoard = board;
  for (const [r,c] of moves) {
    const nb = flip(board, r, c, 2)!;
    const cnt = nb.flat().filter(x => x===2).length;
    if (cnt > best) { best = cnt; bestBoard = nb; }
  }
  return bestBoard;
}

export default function Reversi() {
  const [board, setBoard] = useState(empty);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [validHints, setValidHints] = useState<[number,number][]>([]);
  const { addPlay } = useGameHistory();

  const [black, white] = count(board);

  useEffect(() => {
    if (isPlayerTurn && !gameOver) setValidHints(validMoves(board, 1));
    else setValidHints([]);
  }, [board, isPlayerTurn, gameOver]);

  const handleClick = useCallback((r: number, c: number) => {
    if (!isPlayerTurn || gameOver) return;
    const nb = flip(board, r, c, 1);
    if (!nb) return;
    setBoard(nb);
    const aiHas = validMoves(nb, 2).length;
    const playerHas = validMoves(nb, 1).length;
    if (!aiHas && !playerHas) { setGameOver(true); addPlay("reversi", count(nb)[0]); return; }
    if (!aiHas) return;
    setIsPlayerTurn(false);
  }, [board, isPlayerTurn, gameOver, addPlay]);

  useEffect(() => {
    if (isPlayerTurn || gameOver) return;
    const t = setTimeout(() => {
      const nb = aiMove(board);
      setBoard(nb);
      const playerHas = validMoves(nb, 1).length;
      const aiHas2 = validMoves(nb, 2).length;
      if (!playerHas && !aiHas2) { setGameOver(true); addPlay("reversi", count(nb)[0]); return; }
      if (!playerHas) { setIsPlayerTurn(false); } else setIsPlayerTurn(true);
    }, 500);
    return () => clearTimeout(t);
  }, [isPlayerTurn, board, gameOver, addPlay]);

  const [b2, w2] = count(board);
  const winner = gameOver ? (b2 > w2 ? "あなたの勝ち！" : b2 < w2 ? "AIの勝ち..." : "引き分け！") : "";

  return (
    <div className="flex flex-col items-center space-y-4 max-w-sm mx-auto">
      <div className="flex justify-between w-full px-2">
        <div className="text-center"><div className="w-6 h-6 rounded-full bg-slate-800 mx-auto mb-1" /><p className="text-xl font-black">{black}</p></div>
        <p className="text-sm font-bold text-muted-foreground self-center">{gameOver ? winner : isPlayerTurn ? "あなたのターン（黒）" : "AIのターン..."}</p>
        <div className="text-center"><div className="w-6 h-6 rounded-full bg-white border-2 border-border mx-auto mb-1" /><p className="text-xl font-black">{white}</p></div>
      </div>
      <div className="bg-green-700 p-1.5 rounded-2xl">
        <div className="grid grid-cols-8 gap-0.5">
          {board.map((row, r) => row.map((cell, c) => {
            const hint = validHints.some(([hr,hc]) => hr===r && hc===c);
            return (
              <button key={`${r}-${c}`} onClick={() => handleClick(r,c)}
                className={`w-10 h-10 bg-green-600 rounded-sm flex items-center justify-center hover:bg-green-500 transition-colors ${hint ? "ring-1 ring-inset ring-white/40" : ""}`}>
                {cell === 1 && <div className="w-8 h-8 rounded-full bg-slate-900 shadow-md" />}
                {cell === 2 && <div className="w-8 h-8 rounded-full bg-white shadow-md" />}
                {!cell && hint && <div className="w-3 h-3 rounded-full bg-white/30" />}
              </button>
            );
          }))}
        </div>
      </div>
      {gameOver && <Button onClick={() => { setBoard(empty()); setIsPlayerTurn(true); setGameOver(false); }} className="rounded-full px-8">もう一度</Button>}
    </div>
  );
}
