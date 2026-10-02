import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const CELL = 30;
const COLS = 15, ROWS = 11;

function generateMap() {
  const walls: boolean[][] = Array(ROWS).fill(null).map(() => Array(COLS).fill(false));
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1 || (r % 2 === 0 && c % 2 === 0)) walls[r][c] = true;
  }
  const bricks: boolean[][] = Array(ROWS).fill(null).map(() => Array(COLS).fill(false));
  for (let r = 1; r < ROWS - 1; r++) for (let c = 1; c < COLS - 1; c++) {
    if (!walls[r][c] && Math.random() < 0.6 && !(r < 3 && c < 3)) bricks[r][c] = true;
  }
  return { walls, bricks };
}

export default function Bomberman() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const { addPlay } = useGameHistory();

  const startGame = useCallback(() => {
    setScore(0); setStarted(true); setGameOver(false); setWon(false);
  }, []);

  useEffect(() => {
    if (!started || gameOver || won) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const { walls, bricks } = generateMap();

    let player = { x: 1, y: 1 };
    let enemies = [{ x: 13, y: 9 }, { x: 13, y: 1 }, { x: 1, y: 9 }];
    let bombs: { x: number; y: number; timer: number }[] = [];
    let explosions: { x: number; y: number; timer: number }[] = [];
    let localScore = 0;
    let animId: number;
    let keys: Record<string, boolean> = {};
    let moveTimer = 0;

    const onKey = (e: KeyboardEvent, v: boolean) => {
      keys[e.key] = v;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) e.preventDefault();
    };
    document.addEventListener("keydown", e => onKey(e, true));
    document.addEventListener("keyup", e => onKey(e, false));

    const draw = () => {
      ctx.fillStyle = "#7c3aed"; ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        if (walls[r][c]) { ctx.fillStyle = "#374151"; ctx.fillRect(c * CELL, r * CELL, CELL, CELL); ctx.fillStyle = "#6b7280"; ctx.fillRect(c * CELL + 2, r * CELL + 2, CELL - 4, CELL - 4); }
        else if (bricks[r][c]) { ctx.fillStyle = "#b45309"; ctx.fillRect(c * CELL, r * CELL, CELL, CELL); ctx.fillStyle = "#d97706"; ctx.fillRect(c * CELL + 2, r * CELL + 2, CELL - 4, CELL - 4); }
        else { ctx.fillStyle = "#a78bfa"; ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2); }
      }
      bombs.forEach(b => {
        ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(b.x * CELL + CELL/2, b.y * CELL + CELL/2, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(b.x * CELL + CELL/2, b.y * CELL + CELL/2, 5, 0, Math.PI * 2); ctx.fill();
      });
      explosions.forEach(e => {
        ctx.fillStyle = "#ef4444"; ctx.fillRect(e.x * CELL, e.y * CELL, CELL, CELL);
        ctx.fillStyle = "#fbbf24"; ctx.fillRect(e.x * CELL + 5, e.y * CELL + 5, CELL - 10, CELL - 10);
      });
      ctx.fillStyle = "#3b82f6"; ctx.beginPath(); ctx.arc(player.x * CELL + CELL/2, player.y * CELL + CELL/2, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(player.x * CELL + CELL/2 - 3, player.y * CELL + CELL/2 - 3, 3, 0, Math.PI * 2); ctx.fill();
      enemies.forEach(e => {
        ctx.fillStyle = "#dc2626"; ctx.beginPath(); ctx.arc(e.x * CELL + CELL/2, e.y * CELL + CELL/2, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(e.x * CELL + CELL/2 - 3, e.y * CELL + CELL/2 - 3, 3, 0, Math.PI * 2); ctx.fill();
      });
      ctx.fillStyle = "#fff"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "left";
      ctx.fillText(`スコア: ${localScore}`, 10, 20); ctx.fillText(`敵: ${enemies.length}`, 10, 40);
    };

    const loop = () => {
      animId = requestAnimationFrame(loop);
      moveTimer++;

      if (moveTimer % 10 === 0) {
        if (keys["ArrowLeft"] && !walls[player.y][player.x - 1] && !bricks[player.y][player.x - 1]) player.x--;
        if (keys["ArrowRight"] && !walls[player.y][player.x + 1] && !bricks[player.y][player.x + 1]) player.x++;
        if (keys["ArrowUp"] && !walls[player.y - 1][player.x] && !bricks[player.y - 1][player.x]) player.y--;
        if (keys["ArrowDown"] && !walls[player.y + 1][player.x] && !bricks[player.y + 1][player.x]) player.y++;
      }

      if (keys[" "]) {
        if (!bombs.some(b => b.x === player.x && b.y === player.y)) {
          bombs.push({ x: player.x, y: player.y, timer: 120 });
        }
        keys[" "] = false;
      }

      bombs = bombs.filter(b => {
        b.timer--;
        if (b.timer <= 0) {
          const dirs = [[0,0],[0,1],[0,-1],[1,0],[-1,0]];
          dirs.forEach(([dx, dy]) => {
            const bx = b.x + dx, by = b.y + dy;
            if (bx >= 0 && bx < COLS && by >= 0 && by < ROWS) {
              explosions.push({ x: bx, y: by, timer: 30 });
              if (bricks[by][bx]) { bricks[by][bx] = false; localScore += 10; }
              if (player.x === bx && player.y === by) { setGameOver(true); addPlay("bomberman", localScore); }
              enemies = enemies.filter(e => !(e.x === bx && e.y === by));
            }
          });
          return false;
        }
        return true;
      });

      explosions = explosions.filter(e => { e.timer--; return e.timer > 0; });

      if (moveTimer % 30 === 0) {
        enemies.forEach(e => {
          const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
          const valid = dirs.filter(([dx, dy]) => !walls[e.y + dy][e.x + dx] && !bricks[e.y + dy][e.x + dx]);
          if (valid.length > 0) {
            const [dx, dy] = valid[Math.floor(Math.random() * valid.length)];
            e.x += dx; e.y += dy;
          }
          if (e.x === player.x && e.y === player.y) { setGameOver(true); addPlay("bomberman", localScore); }
        });
      }

      if (enemies.length === 0) { setWon(true); addPlay("bomberman", localScore + 100); }
      setScore(localScore);
      draw();
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      document.removeEventListener("keydown", e => onKey(e, true));
      document.removeEventListener("keyup", e => onKey(e, false));
    };
  }, [started, gameOver, won, addPlay]);

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="text-2xl font-black text-foreground">スコア: {score}</div>
      <div className="relative">
        <canvas ref={canvasRef} width={COLS * CELL} height={ROWS * CELL} className="border-2 border-border rounded-xl shadow-lg" style={{ background: "#7c3aed" }} />
        {!started && (
          <div className="absolute inset-0 bg-purple-900/90 flex flex-col items-center justify-center rounded-xl">
            <div className="text-5xl mb-3">💥</div>
            <h2 className="text-2xl font-black text-white mb-2">ボンバーマン</h2>
            <p className="text-purple-200 text-sm mb-1">←↑↓→ 移動</p>
            <p className="text-purple-200 text-sm mb-4">スペース 爆弾設置</p>
            <Button onClick={startGame} size="lg" className="rounded-full px-8">スタート！</Button>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 bg-purple-900/90 flex flex-col items-center justify-center rounded-xl">
            <h2 className="text-3xl font-black text-white mb-2">ゲームオーバー</h2>
            <p className="text-purple-200 mb-4">スコア: {score}</p>
            <Button onClick={startGame} size="lg" className="rounded-full px-8">もう一度</Button>
          </div>
        )}
        {won && (
          <div className="absolute inset-0 bg-purple-900/90 flex flex-col items-center justify-center rounded-xl">
            <h2 className="text-3xl font-black text-white mb-2">クリア！</h2>
            <p className="text-purple-200 mb-4">スコア: {score}</p>
            <Button onClick={startGame} size="lg" className="rounded-full px-8">もう一度</Button>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">←↑↓→ 移動 / スペース 爆弾</p>
    </div>
  );
}
