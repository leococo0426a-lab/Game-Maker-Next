import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const LEVELS = [
  { map: ["#####","#@$.#","#####"], moves: 0 },
  { map: ["#######","#.@ # #","# $   #","#   $.#","# #   #","#.#  .#","#######"], moves: 0 },
  { map: ["  #####","  # . #","  # $ #","### $##","#.  $ #","# # @ #","#   ###","#####  "], moves: 0 },
  { map: ["########","#   @  #","# $$   #","#  ##  #","## ## ##","# .  . #","#      #","########"], moves: 0 },
];

type Cell = " " | "#" | "@" | "$" | "." | "*" | "+" ;

function parseLevel(lvl: { map: string[] }) {
  const grid: Cell[][] = lvl.map.map(row => row.split("") as Cell[]);
  let px = 0, py = 0;
  for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid[r].length; c++) {
    if (grid[r][c] === "@" || grid[r][c] === "+") { px = r; py = c; }
  }
  return { grid, px, py };
}

function isSolved(grid: Cell[][]) { return !grid.flat().includes("$"); }

export default function Sokoban() {
  const [levelIdx, setLevelIdx] = useState(0);
  const [{ grid, px, py }, setState] = useState(() => parseLevel(LEVELS[0]));
  const [moves, setMoves] = useState(0);
  const [solved, setSolved] = useState(false);
  const { addPlay } = useGameHistory();

  const reset = useCallback(() => { setState(parseLevel(LEVELS[levelIdx])); setMoves(0); setSolved(false); }, [levelIdx]);

  const nextLevel = () => {
    const next = (levelIdx + 1) % LEVELS.length;
    setLevelIdx(next); setState(parseLevel(LEVELS[next])); setMoves(0); setSolved(false);
  };

  const move = useCallback((dr: number, dc: number) => {
    if (solved) return;
    const ng: Cell[][] = grid.map(r => [...r]);
    const nr = px + dr, nc = py + dc;
    if (nr < 0 || nr >= ng.length || nc < 0 || nc >= ng[0].length) return;
    const dest = ng[nr][nc];
    if (dest === "#") return;

    const isBox = dest === "$" || dest === "*";
    if (isBox) {
      const br = nr + dr, bc = nc + dc;
      if (br < 0 || br >= ng.length || bc < 0 || bc >= ng[0].length) return;
      const beyond = ng[br][bc];
      if (beyond === "#" || beyond === "$" || beyond === "*") return;
      ng[br][bc] = (beyond === "." ? "*" : "$");
    }

    const curCell = ng[px][py];
    ng[px][py] = (curCell === "+" ? "." : " ");
    ng[nr][nc] = (dest === "." || dest === "*" ? "+" : "@");
    if (isBox && ng[nr][nc] === "@") ng[nr][nc] = "@";
    if (isBox && (dest === "*")) ng[nr][nc] = "+";

    setState({ grid: ng, px: nr, py: nc });
    setMoves(m => m + 1);
    if (isSolved(ng)) { setSolved(true); addPlay("sokoban", moves + 1); }
  }, [grid, px, py, solved, moves, addPlay]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const map: Record<string, [number,number]> = { ArrowUp: [-1,0], ArrowDown: [1,0], ArrowLeft: [0,-1], ArrowRight: [0,1], w: [-1,0], s: [1,0], a: [0,-1], d: [0,1] };
      if (map[e.key]) { e.preventDefault(); move(...map[e.key]); }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [move]);

  const CELL_SIZE = 40;
  const CELL_RENDER: Partial<Record<Cell, string>> = { "#": "bg-slate-700", "@": "bg-blue-500", "$": "bg-amber-600", ".": "bg-green-300", "*": "bg-amber-400", "+": "bg-blue-500" };

  return (
    <div className="flex flex-col items-center space-y-4 max-w-sm mx-auto">
      <div className="flex justify-between w-full">
        <div className="text-sm font-bold text-muted-foreground">レベル {levelIdx + 1}/{LEVELS.length}</div>
        <div className="text-sm font-bold text-muted-foreground">手数: {moves}</div>
      </div>

      <div className="border-2 border-border rounded-xl overflow-hidden shadow-md bg-slate-100 p-2">
        {grid.map((row, r) => (
          <div key={r} className="flex">
            {row.map((cell, c) => (
              <div key={c} style={{ width: CELL_SIZE, height: CELL_SIZE }} className={`flex items-center justify-center ${CELL_RENDER[cell] || "bg-slate-100"}`}>
                {cell === "@" || cell === "+" ? "🧍" : cell === "$" ? "📦" : cell === "*" ? "✅" : cell === "." ? "🎯" : ""}
              </div>
            ))}
          </div>
        ))}
      </div>

      {solved ? (
        <div className="text-center space-y-2">
          <p className="text-2xl font-black text-green-600">クリア！🎉 {moves}手</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={reset} className="rounded-full">やり直し</Button>
            <Button onClick={nextLevel} className="rounded-full">次のレベル→</Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset} size="sm" className="rounded-full">リセット</Button>
          <div className="grid grid-cols-3 gap-1">
            <div /><button onClick={() => move(-1,0)} className="bg-muted border rounded-lg w-8 h-8 text-xs font-bold hover:bg-primary hover:text-white">↑</button><div />
            <button onClick={() => move(0,-1)} className="bg-muted border rounded-lg w-8 h-8 text-xs font-bold hover:bg-primary hover:text-white">←</button>
            <button onClick={() => move(1,0)} className="bg-muted border rounded-lg w-8 h-8 text-xs font-bold hover:bg-primary hover:text-white">↓</button>
            <button onClick={() => move(0,1)} className="bg-muted border rounded-lg w-8 h-8 text-xs font-bold hover:bg-primary hover:text-white">→</button>
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">📦を🎯に押し込もう！矢印キーまたはWASDで移動</p>
    </div>
  );
}
