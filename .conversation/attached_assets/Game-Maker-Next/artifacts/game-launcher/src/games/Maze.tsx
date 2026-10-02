import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const ROWS = 15, COLS = 19, CELL = 28;

type Cell2 = { top: boolean; right: boolean; bottom: boolean; left: boolean; visited: boolean };

function generateMaze(rows: number, cols: number): Cell2[][] {
  const grid: Cell2[][] = Array(rows).fill(null).map(() =>
    Array(cols).fill(null).map(() => ({ top: true, right: true, bottom: true, left: true, visited: false })));
  const stack: [number, number][] = [[0, 0]];
  grid[0][0].visited = true;
  const dirs = [[0,1,"right","left"],[-1,0,"top","bottom"],[0,-1,"left","right"],[1,0,"bottom","top"]] as const;
  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const unvisited = dirs.filter(([dr, dc]) => {
      const nr = r + dr, nc = c + dc;
      return nr >= 0 && nr < rows && nc >= 0 && nc < cols && !grid[nr][nc].visited;
    });
    if (!unvisited.length) { stack.pop(); continue; }
    const [dr, dc, wall, opposite] = unvisited[Math.floor(Math.random() * unvisited.length)];
    const nr = r + dr, nc = c + dc;
    (grid[r][c] as any)[wall] = false;
    (grid[nr][nc] as any)[opposite] = false;
    grid[nr][nc].visited = true;
    stack.push([nr, nc]);
  }
  return grid;
}

export default function Maze() {
  const [maze, setMaze] = useState(() => generateMaze(ROWS, COLS));
  const [pos, setPos] = useState({ r: 0, c: 0 });
  const [won, setWon] = useState(false);
  const [time, setTime] = useState(0);
  const startTime = useRef(Date.now());
  const { addPlay } = useGameHistory();

  useEffect(() => {
    if (won) return;
    const t = setInterval(() => setTime(Math.floor((Date.now() - startTime.current) / 1000)), 200);
    return () => clearInterval(t);
  }, [won]);

  const move = useCallback((dir: "top" | "right" | "bottom" | "left") => {
    if (won) return;
    setPos(prev => {
      const cell = maze[prev.r][prev.c];
      if (cell[dir]) return prev;
      const dr = dir === "top" ? -1 : dir === "bottom" ? 1 : 0;
      const dc = dir === "left" ? -1 : dir === "right" ? 1 : 0;
      const nr = prev.r + dr, nc = prev.c + dc;
      if (nr === ROWS - 1 && nc === COLS - 1) { setWon(true); addPlay("maze", time); }
      return { r: nr, c: nc };
    });
  }, [maze, won, time, addPlay]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const map: Record<string, "top"|"right"|"bottom"|"left"> = {
        ArrowUp: "top", ArrowDown: "bottom", ArrowLeft: "left", ArrowRight: "right",
        w: "top", s: "bottom", a: "left", d: "right"
      };
      if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [move]);

  const reset = () => { setMaze(generateMaze(ROWS, COLS)); setPos({ r: 0, c: 0 }); setWon(false); setTime(0); startTime.current = Date.now(); };

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="flex justify-between w-full max-w-lg px-2">
        <p className="text-sm font-bold text-muted-foreground">⏱️ {time}秒</p>
        <Button variant="outline" size="sm" onClick={reset} className="rounded-full h-7 px-4 text-xs">新しい迷路</Button>
      </div>
      <div className="relative" style={{ width: COLS * CELL, height: ROWS * CELL }}>
        <canvas style={{ position: "absolute", inset: 0 }} width={COLS * CELL} height={ROWS * CELL}
          ref={canvas => {
            if (!canvas) return;
            const ctx = canvas.getContext("2d")!;
            ctx.fillStyle = "#f8fafc"; ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);
            ctx.fillStyle = "#bbf7d0"; ctx.fillRect((COLS-1)*CELL, (ROWS-1)*CELL, CELL, CELL);
            ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 2;
            for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
              const cell = maze[r][c];
              const x = c * CELL, y = r * CELL;
              if (cell.top) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x+CELL, y); ctx.stroke(); }
              if (cell.right) { ctx.beginPath(); ctx.moveTo(x+CELL, y); ctx.lineTo(x+CELL, y+CELL); ctx.stroke(); }
              if (cell.bottom) { ctx.beginPath(); ctx.moveTo(x, y+CELL); ctx.lineTo(x+CELL, y+CELL); ctx.stroke(); }
              if (cell.left) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y+CELL); ctx.stroke(); }
            }
            ctx.fillStyle = "#3b82f6";
            ctx.beginPath(); ctx.arc(pos.c*CELL+CELL/2, pos.r*CELL+CELL/2, CELL/2-4, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "#22c55e"; ctx.font = "16px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("🏁", (COLS-0.5)*CELL, (ROWS-0.5)*CELL);
          }} />
        {won && (
          <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center rounded-xl">
            <p className="text-3xl font-black text-green-600 mb-2">クリア！🎉</p>
            <p className="text-muted-foreground mb-4">{time}秒</p>
            <Button onClick={reset} className="rounded-full px-8">もう一度</Button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1 w-28">
        <div /><button onClick={() => move("top")} className="bg-muted border rounded-lg h-8 flex items-center justify-center text-xs font-bold hover:bg-primary hover:text-white">↑</button><div />
        <button onClick={() => move("left")} className="bg-muted border rounded-lg h-8 flex items-center justify-center text-xs font-bold hover:bg-primary hover:text-white">←</button>
        <button onClick={() => move("bottom")} className="bg-muted border rounded-lg h-8 flex items-center justify-center text-xs font-bold hover:bg-primary hover:text-white">↓</button>
        <button onClick={() => move("right")} className="bg-muted border rounded-lg h-8 flex items-center justify-center text-xs font-bold hover:bg-primary hover:text-white">→</button>
      </div>
    </div>
  );
}
