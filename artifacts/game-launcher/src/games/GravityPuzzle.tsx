import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const LEVELS = [
  { blocks: [[2,2],[3,2],[4,2],[2,3],[4,3],[2,4],[3,4],[4,4]], target: [3,3] },
  { blocks: [[1,1],[2,1],[3,1],[1,2],[3,2],[1,3],[2,3],[3,3]], target: [2,2] },
  { blocks: [[0,0],[1,0],[2,0],[0,1],[2,1],[0,2],[1,2],[2,2]], target: [1,1] },
];

export default function GravityPuzzle() {
  const [levelIdx, setLevelIdx] = useState(0);
  const [blocks, setBlocks] = useState(LEVELS[0].blocks.map(b => [...b]));
  const [player, setPlayer] = useState([2, 2]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const { addPlay } = useGameHistory();

  const level = LEVELS[levelIdx];

  const reset = useCallback(() => {
    setBlocks(level.blocks.map(b => [...b]));
    setPlayer([2, 2]); setMoves(0); setWon(false); setGameOver(false);
  }, [level]);

  const move = (dx: number, dy: number) => {
    if (won || gameOver) return;
    const nx = player[0] + dx, ny = player[1] + dy;
    if (nx < 0 || nx > 5 || ny < 0 || ny > 5) return;
    const hitBlock = blocks.findIndex(b => b[0] === nx && b[1] === ny);
    let newBlocks = blocks.map(b => [...b]);
    if (hitBlock >= 0) {
      const bnx = nx + dx, bny = ny + dy;
      if (bnx < 0 || bnx > 5 || bny < 0 || bny > 5) return;
      if (newBlocks.some((b, i) => i !== hitBlock && b[0] === bnx && b[1] === bny)) return;
      newBlocks[hitBlock] = [bnx, bny];
    }
    setPlayer([nx, ny]);
    setBlocks(newBlocks);
    setMoves(m => m + 1);
    if (nx === level.target[0] && ny === level.target[1]) {
      if (levelIdx >= 2) { setWon(true); addPlay("gravity", moves + 1); }
      else { setLevelIdx(l => l + 1); setBlocks(LEVELS[levelIdx + 1].blocks.map(b => [...b])); setPlayer([2, 2]); setMoves(0); }
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 max-w-sm mx-auto">
      <div className="flex justify-between w-full px-2">
        <div className="text-center"><p className="text-xs text-muted-foreground font-bold">レベル</p><p className="text-2xl font-black">{levelIdx + 1}/3</p></div>
        <div className="text-center"><p className="text-xs text-muted-foreground font-bold">手数</p><p className="text-2xl font-black">{moves}</p></div>
      </div>
      <div className="grid gap-1 bg-slate-800 p-2 rounded-xl" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
        {[...Array(6)].map((_, r) => [...Array(6)].map((_, c) => {
          const isPlayer = player[0] === c && player[1] === r;
          const isBlock = blocks.some(b => b[0] === c && b[1] === r);
          const isTarget = level.target[0] === c && level.target[1] === r;
          return (
            <div key={`${r}-${c}`} className={`w-10 h-10 rounded-md flex items-center justify-center text-lg ${isPlayer ? "bg-blue-500" : isBlock ? "bg-amber-700" : isTarget ? "bg-green-500/50 ring-2 ring-green-400" : "bg-slate-700"}`}>
              {isPlayer ? "🧙" : isBlock ? "🧱" : isTarget ? "★" : ""}
            </div>
          );
        }))}
      </div>
      <div className="grid grid-cols-3 gap-1 w-32">
        <div />
        <Button onClick={() => move(0, -1)} className="rounded-lg h-10 w-10 p-0">↑</Button>
        <div />
        <Button onClick={() => move(-1, 0)} className="rounded-lg h-10 w-10 p-0">←</Button>
        <Button onClick={() => move(0, 1)} className="rounded-lg h-10 w-10 p-0">↓</Button>
        <Button onClick={() => move(1, 0)} className="rounded-lg h-10 w-10 p-0">→</Button>
      </div>
      {won && <p className="text-xl font-black text-green-600">クリア！🎉</p>}
      <Button variant="outline" onClick={reset} className="rounded-full">リセット</Button>
      <p className="text-xs text-muted-foreground">矢印でプレイヤーを動かして、ブロックを掌で★目的地に持っていこう</p>
    </div>
  );
}
