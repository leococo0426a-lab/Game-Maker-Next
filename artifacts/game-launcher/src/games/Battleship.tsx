import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const SHIPS = [{ name: "空母", size: 5 }, { name: "戦艦", size: 4 }, { name: "巡洋艦", size: 3 }, { name: "潜水艦", size: 3 }, { name: "駆逐艦", size: 2 }];
type Cell = { ship: boolean; hit: boolean };
type Board = Cell[][];

function empty(): Board { return Array(10).fill(null).map(() => Array(10).fill(null).map(() => ({ ship: false, hit: false }))); }

function placeShipsRandom(board: Board): Board {
  const b = board.map(r => r.map(c => ({ ...c })));
  for (const ship of SHIPS) {
    let placed = false;
    while (!placed) {
      const horiz = Math.random() < 0.5;
      const r = Math.floor(Math.random() * (horiz ? 10 : 11 - ship.size));
      const c = Math.floor(Math.random() * (horiz ? 11 - ship.size : 10));
      let ok = true;
      for (let i = 0; i < ship.size; i++) {
        const nr = horiz ? r : r + i, nc = horiz ? c + i : c;
        if (b[nr][nc].ship) { ok = false; break; }
      }
      if (ok) {
        for (let i = 0; i < ship.size; i++) { const nr = horiz ? r : r + i, nc = horiz ? c + i : c; b[nr][nc].ship = true; }
        placed = true;
      }
    }
  }
  return b;
}

function isDefeated(board: Board) { return board.every(r => r.every(c => !c.ship || c.hit)); }

function aiShot(board: Board): [number, number] {
  const hits = board.flatMap((r, ri) => r.map((c, ci) => c.hit && c.ship ? [ri, ci] : null).filter(Boolean)) as [number,number][];
  if (hits.length) {
    for (const [hr, hc] of hits) {
      for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nr = hr+dr, nc = hc+dc;
        if (nr>=0&&nr<10&&nc>=0&&nc<10&&!board[nr][nc].hit) return [nr, nc];
      }
    }
  }
  let r, c;
  do { r = Math.floor(Math.random()*10); c = Math.floor(Math.random()*10); } while (board[r][c].hit);
  return [r, c];
}

type GamePhase = "setup" | "playing" | "won" | "lost";

export default function Battleship() {
  const [playerBoard, setPlayerBoard] = useState(() => placeShipsRandom(empty()));
  const [aiBoard, setAiBoard] = useState(() => placeShipsRandom(empty()));
  const [phase, setPhase] = useState<GamePhase>("setup");
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [message, setMessage] = useState("準備OK？");
  const { addPlay } = useGameHistory();

  const start = () => { setPhase("playing"); setMessage("敵の海域を攻撃しよう！"); };
  const randomize = () => { setPlayerBoard(placeShipsRandom(empty())); setAiBoard(placeShipsRandom(empty())); };

  const shoot = useCallback((r: number, c: number) => {
    if (!isPlayerTurn || phase !== "playing" || aiBoard[r][c].hit) return;
    const nb = aiBoard.map(row => row.map(cell => ({ ...cell })));
    nb[r][c].hit = true;
    setAiBoard(nb);
    if (isDefeated(nb)) { setPhase("won"); addPlay("battleship"); setMessage("勝利！"); return; }
    setMessage(nb[r][c].ship ? "命中！💥" : "外れ...");
    setIsPlayerTurn(false);
    setTimeout(() => {
      const [ar, ac] = aiShot(playerBoard);
      const pb = playerBoard.map(row => row.map(cell => ({ ...cell })));
      pb[ar][ac].hit = true;
      setPlayerBoard(pb);
      if (isDefeated(pb)) { setPhase("lost"); addPlay("battleship"); setMessage("敗北..."); return; }
      setMessage(pb[ar][ac].ship ? "AIが命中！😱" : "AIが外れた！");
      setIsPlayerTurn(true);
    }, 800);
  }, [isPlayerTurn, phase, aiBoard, playerBoard, addPlay]);

  const reset = () => { setPlayerBoard(placeShipsRandom(empty())); setAiBoard(placeShipsRandom(empty())); setPhase("setup"); setIsPlayerTurn(true); setMessage("準備OK？"); };

  const renderBoard = (board: Board, isAi: boolean, onClick?: (r: number, c: number) => void) => (
    <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(10, 1fr)" }}>
      {board.map((row, r) => row.map((cell, c) => {
        let bg = "bg-blue-100 hover:bg-blue-200";
        if (cell.hit && cell.ship) bg = "bg-red-500";
        else if (cell.hit) bg = "bg-slate-300";
        else if (!isAi && cell.ship) bg = "bg-slate-600";
        return (
          <button key={`${r}-${c}`} onClick={() => onClick?.(r, c)}
            className={`w-6 h-6 rounded-sm border border-blue-200 transition-colors text-xs flex items-center justify-center ${bg} ${isAi && !cell.hit && phase === "playing" && isPlayerTurn ? "cursor-crosshair" : ""}`}>
            {cell.hit && cell.ship && "💥"}
            {cell.hit && !cell.ship && "•"}
          </button>
        );
      }))}
    </div>
  );

  return (
    <div className="flex flex-col items-center space-y-4 max-w-2xl mx-auto p-4">
      <div className="text-center">
        <p className={`font-black text-lg ${message.includes("勝") ? "text-green-600" : message.includes("敗") ? "text-red-600" : "text-foreground"}`}>{message}</p>
      </div>
      <div className="flex gap-8 flex-wrap justify-center">
        <div className="space-y-2">
          <p className="text-xs font-black text-muted-foreground uppercase text-center">自陣</p>
          {renderBoard(playerBoard, false)}
        </div>
        {phase !== "setup" && (
          <div className="space-y-2">
            <p className="text-xs font-black text-muted-foreground uppercase text-center">敵陣 {isPlayerTurn && phase === "playing" ? "←攻撃！" : ""}</p>
            {renderBoard(aiBoard, true, shoot)}
          </div>
        )}
      </div>
      {phase === "setup" && (
        <div className="flex gap-3">
          <Button variant="outline" onClick={randomize} className="rounded-full">配置変更</Button>
          <Button onClick={start} className="rounded-full px-8">戦闘開始！</Button>
        </div>
      )}
      {(phase === "won" || phase === "lost") && (
        <Button onClick={reset} className="rounded-full px-8">もう一度</Button>
      )}
    </div>
  );
}
