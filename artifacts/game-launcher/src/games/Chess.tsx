import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

type Color = "w" | "b";
type PieceType = "K" | "Q" | "R" | "B" | "N" | "P";
type Piece = { type: PieceType; color: Color } | null;
type Board = Piece[][];
type Pos = [number, number];

const UNICODE: Record<Color, Record<PieceType, string>> = {
  w: { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙" },
  b: { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" },
};

function initBoard(): Board {
  const b: Board = Array(8).fill(null).map(() => Array(8).fill(null));
  const order: PieceType[] = ["R","N","B","Q","K","B","N","R"];
  order.forEach((t, c) => { b[0][c] = { type: t, color: "b" }; b[7][c] = { type: t, color: "w" }; });
  for (let c = 0; c < 8; c++) { b[1][c] = { type: "P", color: "b" }; b[6][c] = { type: "P", color: "w" }; }
  return b;
}

function inBounds(r: number, c: number) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

function getRawMoves(board: Board, r: number, c: number): Pos[] {
  const piece = board[r][c]; if (!piece) return [];
  const moves: Pos[] = [];
  const { type, color } = piece;
  const opp = color === "w" ? "b" : "w";
  const add = (nr: number, nc: number) => {
    if (!inBounds(nr, nc)) return false;
    if (board[nr][nc]?.color === color) return false;
    moves.push([nr, nc]);
    return !board[nr][nc];
  };
  const slide = (dr: number, dc: number) => { let nr=r+dr, nc=c+dc; while (add(nr, nc) && !board[nr][nc]) { nr+=dr; nc+=dc; } };
  if (type === "R") { [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr,dc]) => slide(dr,dc)); }
  else if (type === "B") { [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc]) => slide(dr,dc)); }
  else if (type === "Q") { [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc]) => slide(dr,dc)); }
  else if (type === "N") { [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc]) => add(r+dr,c+dc)); }
  else if (type === "K") { [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc]) => add(r+dr,c+dc)); }
  else if (type === "P") {
    const dir = color === "w" ? -1 : 1;
    const startRow = color === "w" ? 6 : 1;
    if (inBounds(r+dir, c) && !board[r+dir][c]) { moves.push([r+dir, c]); if (r===startRow && !board[r+2*dir]?.[c]) moves.push([r+2*dir, c]); }
    for (const dc of [-1,1]) { if (inBounds(r+dir, c+dc) && board[r+dir][c+dc]?.color === opp) moves.push([r+dir, c+dc]); }
  }
  return moves;
}

function isInCheck(board: Board, color: Color): boolean {
  let kr = -1, kc = -1;
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) if (board[r][c]?.type==="K"&&board[r][c]?.color===color) { kr=r; kc=c; }
  if (kr<0) return false;
  const opp = color === "w" ? "b" : "w";
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) if (board[r][c]?.color===opp) { if (getRawMoves(board,r,c).some(([mr,mc])=>mr===kr&&mc===kc)) return true; }
  return false;
}

function moveBoard(board: Board, from: Pos, to: Pos): Board {
  const nb = board.map(r => [...r]);
  const piece = nb[from[0]][from[1]];
  nb[to[0]][to[1]] = piece;
  nb[from[0]][from[1]] = null;
  if (piece?.type === "P" && (to[0] === 0 || to[0] === 7)) nb[to[0]][to[1]] = { type: "Q", color: piece.color };
  return nb;
}

function getLegalMoves(board: Board, r: number, c: number): Pos[] {
  const piece = board[r][c]; if (!piece) return [];
  return getRawMoves(board, r, c).filter(([nr, nc]) => {
    const nb = moveBoard(board, [r,c], [nr,nc]);
    return !isInCheck(nb, piece.color);
  });
}

function aiMove(board: Board): [Pos, Pos] | null {
  const moves: [Pos, Pos, number][] = [];
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    if (board[r][c]?.color !== "b") continue;
    getLegalMoves(board, r, c).forEach(([nr,nc]) => {
      const nb = moveBoard(board, [r,c], [nr,nc]);
      const captured = board[nr][nc];
      const captureVal: Partial<Record<PieceType, number>> = { P:1, N:3, B:3, R:5, Q:9, K:100 };
      const val = captured ? (captureVal[captured.type] || 0) : 0;
      const inCheck = isInCheck(nb, "w") ? 1 : 0;
      moves.push([[r,c],[nr,nc], val + inCheck + Math.random()*0.3]);
    });
  }
  if (!moves.length) return null;
  moves.sort((a,b) => b[2]-a[2]);
  const top = moves.slice(0, Math.min(3, moves.length));
  const pick = top[Math.floor(Math.random() * top.length)];
  return [pick[0], pick[1]];
}

export default function Chess() {
  const [board, setBoard] = useState(initBoard);
  const [selected, setSelected] = useState<Pos | null>(null);
  const [legalMoves, setLegalMoves] = useState<Pos[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [status, setStatus] = useState("あなたのターン（白）");
  const [gameOver, setGameOver] = useState(false);
  const [promotionPending, setPromotionPending] = useState(false);
  const { addPlay } = useGameHistory();

  const handleClick = useCallback((r: number, c: number) => {
    if (!isPlayerTurn || gameOver || promotionPending) return;
    const piece = board[r][c];
    if (selected) {
      const move = legalMoves.find(([mr, mc]) => mr === r && mc === c);
      if (move) {
        const nb = moveBoard(board, selected, [r, c]);
        setBoard(nb);
        setSelected(null); setLegalMoves([]);
        const blackMoves: [Pos,Pos][] = [];
        for (let ri=0;ri<8;ri++) for (let ci=0;ci<8;ci++) if (nb[ri][ci]?.color==="b") getLegalMoves(nb,ri,ci).forEach(m=>blackMoves.push([[ri,ci],m]));
        if (!blackMoves.length) {
          const inChk = isInCheck(nb, "b");
          setStatus(inChk ? "チェックメイト！あなたの勝ち！" : "ステールメイト・引き分け");
          setGameOver(true); addPlay("chess"); return;
        }
        const wInCheck = isInCheck(nb, "w");
        if (wInCheck) setStatus("チェック！");
        setIsPlayerTurn(false);
        setStatus(s => isInCheck(nb,"b") ? "AIにチェック！" : "AIのターン...");
        setTimeout(() => {
          const best = aiMove(nb);
          if (!best) { setStatus("あなたの勝ち！"); setGameOver(true); addPlay("chess"); return; }
          const nb2 = moveBoard(nb, best[0], best[1]);
          setBoard(nb2);
          const wMoves: [Pos,Pos][] = [];
          for (let ri=0;ri<8;ri++) for (let ci=0;ci<8;ci++) if (nb2[ri][ci]?.color==="w") getLegalMoves(nb2,ri,ci).forEach(m=>wMoves.push([[ri,ci],m]));
          if (!wMoves.length) {
            setStatus(isInCheck(nb2,"w") ? "チェックメイト！AIの勝ち..." : "ステールメイト・引き分け");
            setGameOver(true); addPlay("chess"); return;
          }
          setIsPlayerTurn(true);
          setStatus(isInCheck(nb2,"w") ? "チェック！ あなたのターン" : "あなたのターン（白）");
        }, 600);
        return;
      }
      if (piece?.color === "w") { setSelected([r,c]); setLegalMoves(getLegalMoves(board, r, c)); return; }
      setSelected(null); setLegalMoves([]);
    } else {
      if (piece?.color !== "w") return;
      setSelected([r,c]); setLegalMoves(getLegalMoves(board, r, c));
    }
  }, [board, selected, legalMoves, isPlayerTurn, gameOver, promotionPending, addPlay]);

  const reset = () => { setBoard(initBoard()); setSelected(null); setLegalMoves([]); setIsPlayerTurn(true); setStatus("あなたのターン（白）"); setGameOver(false); };

  return (
    <div className="flex flex-col items-center space-y-4 max-w-sm mx-auto">
      <p className={`font-black text-base ${status.includes("勝ち") ? "text-green-600" : status.includes("チェック") ? "text-orange-600" : "text-foreground"}`}>{status}</p>
      <div className="border-2 border-border rounded-xl overflow-hidden shadow-xl">
        {board.map((row, r) => (
          <div key={r} className="flex">
            {row.map((piece, c) => {
              const light = (r + c) % 2 === 0;
              const isSel = selected && selected[0] === r && selected[1] === c;
              const isLegal = legalMoves.some(([mr,mc]) => mr===r&&mc===c);
              return (
                <button key={c} onClick={() => handleClick(r, c)}
                  className={`w-11 h-11 flex items-center justify-center text-2xl transition-colors relative
                    ${light ? "bg-amber-100" : "bg-amber-700"}
                    ${isSel ? "ring-2 ring-blue-500 ring-inset" : ""}
                    ${isLegal && board[r][c] ? "ring-2 ring-red-400 ring-inset" : ""}`}>
                  {isLegal && !board[r][c] && <div className="w-4 h-4 rounded-full bg-black/20" />}
                  {piece && <span className={`select-none leading-none ${piece.color === "w" ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" : "text-gray-900"}`}>{UNICODE[piece.color][piece.type]}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex gap-3 items-center">
        {gameOver && <Button onClick={reset} className="rounded-full px-8">もう一度</Button>}
        <Button variant="outline" size="sm" onClick={reset} className="rounded-full">リセット</Button>
      </div>
      <p className="text-xs text-muted-foreground">あなたは白。コマをクリックして選択し、移動先をクリック。</p>
    </div>
  );
}
