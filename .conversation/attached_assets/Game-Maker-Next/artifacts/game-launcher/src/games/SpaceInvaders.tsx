import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const W = 500, H = 400;

export default function SpaceInvaders() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [level, setLevel] = useState(1);
  const { addPlay } = useGameHistory();

  const startGame = useCallback(() => { setScore(0); setGameOver(false); setStarted(true); setLevel(1); }, []);

  useEffect(() => {
    if (!started || gameOver) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    let playerX = W / 2;
    let bullets: { x: number; y: number }[] = [];
    let enemies: { x: number; y: number; alive: boolean }[] = [];
    let enemyDir = 1;
    let enemySpeed = 0.5;
    let enemyDrop = 0;
    let localScore = 0;
    let animId: number;
    let keys: Record<string, boolean> = {};
    let shootCooldown = 0;
    let localLevel = 1;

    const initEnemies = () => {
      enemies = [];
      const cols = 8 + localLevel;
      const rows = 3 + Math.floor(localLevel / 2);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          enemies.push({ x: 30 + c * 45, y: 30 + r * 35, alive: true });
        }
      }
      enemySpeed = 0.3 + localLevel * 0.15;
    };
    initEnemies();

    const onKey = (e: KeyboardEvent, v: boolean) => {
      keys[e.key] = v;
      if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
    };
    document.addEventListener("keydown", e => onKey(e, true));
    document.addEventListener("keyup", e => onKey(e, false));

    const loop = () => {
      animId = requestAnimationFrame(loop);
      ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 0, W, H);

      if (keys["ArrowLeft"]) playerX -= 5;
      if (keys["ArrowRight"]) playerX += 5;
      playerX = Math.max(20, Math.min(W - 20, playerX));

      if (shootCooldown > 0) shootCooldown--;
      if (keys[" "] && shootCooldown === 0) {
        bullets.push({ x: playerX, y: H - 30 });
        shootCooldown = 15;
      }

      let edge = false;
      enemies.forEach(e => {
        if (!e.alive) return;
        e.x += enemyDir * enemySpeed;
        if (e.x < 10 || e.x > W - 10) edge = true;
      });
      if (edge) {
        enemyDir *= -1;
        enemyDrop += 10;
        enemies.forEach(e => { e.y += 10; });
      }
      if (enemyDrop > 0) {
        enemies.forEach(e => { e.y += enemyDrop * 0.01; });
        enemyDrop = 0;
      }

      bullets = bullets.filter(b => b.y > 0);
      bullets.forEach(b => { b.y -= 8; });

      bullets.forEach((b, bi) => {
        enemies.forEach((e, ei) => {
          if (!e.alive) return;
          if (Math.abs(b.x - e.x) < 20 && Math.abs(b.y - e.y) < 15) {
            e.alive = false;
            bullets.splice(bi, 1);
            localScore += 10;
            setScore(localScore);
          }
        });
      });

      if (enemies.every(e => !e.alive)) {
        localLevel++;
        setLevel(localLevel);
        initEnemies();
      }

      enemies.forEach(e => {
        if (!e.alive) return;
        if (e.y > H - 40) {
          cancelAnimationFrame(animId);
          setGameOver(true);
          addPlay("spaceinvaders", localScore);
        }
      });

      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.moveTo(playerX, H - 20);
      ctx.lineTo(playerX - 15, H - 5);
      ctx.lineTo(playerX + 15, H - 5);
      ctx.closePath();
      ctx.fill();

      bullets.forEach(b => {
        ctx.fillStyle = "#fde68a";
        ctx.fillRect(b.x - 2, b.y, 4, 10);
      });

      enemies.forEach(e => {
        if (!e.alive) return;
        ctx.fillStyle = "#a855f7";
        ctx.fillRect(e.x - 15, e.y - 10, 30, 20);
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(e.x - 5, e.y + 5, 4, 4);
        ctx.fillRect(e.x + 5, e.y + 5, 4, 4);
      });

      ctx.fillStyle = "#64748b"; ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "left"; ctx.fillText(`スコア: ${localScore}`, 10, 20);
      ctx.textAlign = "right"; ctx.fillText(`レベル ${localLevel}`, W - 10, 20);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      document.removeEventListener("keydown", e => onKey(e, true));
      document.removeEventListener("keyup", e => onKey(e, false));
    };
  }, [started, gameOver, addPlay]);

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="relative">
        <canvas ref={canvasRef} width={W} height={H} className="border-2 border-border rounded-xl shadow-lg" style={{ background: "#0f172a" }} />
        {!started && (
          <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center rounded-xl">
            <div className="text-5xl mb-3">👾</div>
            <h2 className="text-2xl font-black text-white mb-2">スペースインベーダー</h2>
            <p className="text-slate-400 text-sm mb-4">← → 移動 / スペース 射撃</p>
            <Button onClick={startGame} size="lg" className="rounded-full px-8">スタート！</Button>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center rounded-xl">
            <h2 className="text-3xl font-black text-white mb-2">ゲームオーバー</h2>
            <p className="text-slate-300 mb-4">スコア: {score} / レベル {level}</p>
            <Button onClick={startGame} size="lg" className="rounded-full px-8">もう一度</Button>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">← → 移動 / スペース 射撃</p>
    </div>
  );
}
