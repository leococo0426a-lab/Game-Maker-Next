import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const W = 360, H = 480, R = 20, COLS = 9, ROWS_INIT = 5;
const COLORS = ["#ef4444","#3b82f6","#22c55e","#f59e0b","#a855f7","#ec4899"];

type Bubble = { x: number; y: number; color: string } | null;

function hexX(col: number, row: number) { return col * R * 2 + (row % 2) * R + R; }
function hexY(row: number) { return row * R * 1.73 + R; }

function createGrid(): (string|null)[][] {
  return Array.from({ length: ROWS_INIT }, (_, r) => Array.from({ length: COLS - (r%2) }, () => COLORS[Math.floor(Math.random() * COLORS.length)]));
}

export default function BubbleShooter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const { addPlay } = useGameHistory();

  const startGame = useCallback(() => { setScore(0); setGameOver(false); setWon(false); setStarted(true); }, []);

  useEffect(() => {
    if (!started || gameOver || won) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    let grid: (string|null)[][] = createGrid();
    let shooterX = W / 2;
    let shooterColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    let nextColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    let bullet: { x: number; y: number; vx: number; vy: number; color: string } | null = null;
    let localScore = 0;
    let animId: number;
    let aimX = W / 2, aimY = 0;

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      aimX = (e.clientX - rect.left) * (W / rect.width);
      aimY = (e.clientY - rect.top) * (H / rect.height);
    };

    const shoot = () => {
      if (bullet) return;
      const dx = aimX - shooterX, dy = aimY - (H - 40);
      const len = Math.sqrt(dx*dx + dy*dy);
      if (len < 1) return;
      bullet = { x: shooterX, y: H - 40, vx: (dx/len)*8, vy: (dy/len)*8, color: shooterColor };
      shooterColor = nextColor;
      nextColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("click", shoot);

    const drawBubble = (x: number, y: number, color: string, r = R - 2) => {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.beginPath(); ctx.arc(x - r*0.3, y - r*0.3, r*0.35, 0, Math.PI*2); ctx.fill();
    };

    const snap = (bx: number, by: number, color: string) => {
      let best = -1, bestDist = Infinity, bestR = 0, bestC = 0;
      for (let r = 0; r <= grid.length; r++) {
        const cols = COLS - (r % 2);
        for (let c = 0; c < cols; c++) {
          if (r < grid.length && grid[r][c]) continue;
          const gx = hexX(c, r), gy = hexY(r);
          const d = Math.sqrt((bx-gx)**2+(by-gy)**2);
          if (d < bestDist) { bestDist = d; bestR = r; bestC = c; best = r*100+c; }
        }
      }
      if (best < 0) return;
      while (grid.length <= bestR) grid.push(Array(COLS - (grid.length % 2)).fill(null));
      if (!grid[bestR]) grid[bestR] = Array(COLS - (bestR % 2)).fill(null);
      grid[bestR][bestC] = color;

      const visited = new Set<string>();
      const cluster: [number,number][] = [];
      const bfs = (r: number, c: number) => {
        const key = `${r},${c}`;
        if (visited.has(key)) return;
        if (r < 0 || r >= grid.length || c < 0 || !grid[r] || c >= grid[r].length) return;
        if (grid[r][c] !== color) return;
        visited.add(key); cluster.push([r,c]);
        const neighbors = r%2===0 ? [[-1,-1],[-1,0],[1,-1],[1,0],[0,-1],[0,1]] : [[-1,0],[-1,1],[1,0],[1,1],[0,-1],[0,1]];
        neighbors.forEach(([dr,dc]) => bfs(r+dr, c+dc));
      };
      bfs(bestR, bestC);
      if (cluster.length >= 3) {
        cluster.forEach(([r,c]) => { if(grid[r])grid[r][c]=null; });
        localScore += cluster.length * 10; setScore(localScore);
      }
      if (!grid.some(r => r.some(c => c !== null))) { setWon(true); addPlay("bubbleshooter", localScore); }
      if (grid.length > 10 || grid[grid.length-1]?.some(c=>c)) { setGameOver(true); addPlay("bubbleshooter", localScore); }
    };

    const loop = () => {
      animId = requestAnimationFrame(loop);
      ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 0, W, H);

      for (let r = 0; r < grid.length; r++) {
        const row = grid[r]; if (!row) continue;
        for (let c = 0; c < row.length; c++) {
          if (row[c]) drawBubble(hexX(c, r), hexY(r), row[c]!);
        }
      }

      if (bullet) {
        bullet.x += bullet.vx; bullet.y += bullet.vy;
        if (bullet.x < R) { bullet.x = R; bullet.vx *= -1; }
        if (bullet.x > W - R) { bullet.x = W - R; bullet.vx *= -1; }

        for (let r = 0; r < grid.length; r++) {
          const row = grid[r]; if (!row) continue;
          for (let c = 0; c < row.length; c++) {
            if (!row[c]) continue;
            const gx = hexX(c, r), gy = hexY(r);
            if (Math.sqrt((bullet.x-gx)**2+(bullet.y-gy)**2) < R*1.8) {
              snap(bullet.x, bullet.y, bullet.color); bullet = null; break;
            }
          }
          if (!bullet) break;
        }
        if (bullet && bullet.y < R) { snap(bullet.x, bullet.y, bullet.color); bullet = null; }
        if (bullet) drawBubble(bullet.x, bullet.y, bullet.color);
      }

      const dy = aimY - (H - 40), dx = aimX - shooterX;
      const len = Math.sqrt(dx*dx+dy*dy);
      if (len > 10) {
        ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.setLineDash([5,8]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(shooterX, H-40); ctx.lineTo(shooterX+dx/len*80, H-40+dy/len*80); ctx.stroke(); ctx.setLineDash([]);
      }

      drawBubble(shooterX - 30, H - 15, nextColor, R - 6);
      ctx.fillStyle = "#64748b"; ctx.font = "10px sans-serif"; ctx.fillText("次:", shooterX - 52, H - 10);
      drawBubble(shooterX, H - 40, shooterColor);
      ctx.fillStyle = "#94a3b8"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "right"; ctx.fillText(String(localScore), W-10, 20);
    };

    animId = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animId); canvas.removeEventListener("mousemove", onMouseMove); canvas.removeEventListener("click", shoot); };
  }, [started, gameOver, won, addPlay]);

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="relative">
        <canvas ref={canvasRef} width={W} height={H} className="border-2 border-border rounded-xl shadow-lg cursor-crosshair" style={{ background: "#0f172a" }} />
        {!started && (
          <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center rounded-xl">
            <div className="text-5xl mb-3">🫧</div>
            <h2 className="text-2xl font-black text-white mb-2">バブルシューター</h2>
            <p className="text-slate-400 text-sm mb-4">マウスで狙ってクリックして射撃！3つ以上同じ色でクリア</p>
            <Button onClick={startGame} size="lg" className="rounded-full px-8">スタート！</Button>
          </div>
        )}
        {(gameOver || won) && (
          <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center rounded-xl">
            <h2 className="text-3xl font-black text-white mb-2">{won ? "クリア！🎉" : "ゲームオーバー"}</h2>
            <p className="text-slate-300 text-xl mb-4">{score} pts</p>
            <Button onClick={startGame} size="lg" className="rounded-full px-8">もう一度</Button>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">マウスで狙い、クリックで発射。同じ色3つ以上でまとめて消そう！</p>
    </div>
  );
}
