import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const W = 600, H = 200, GROUND = 160;

export default function Runner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem("runner_hi") || "0"));
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const { addPlay } = useGameHistory();

  const startGame = useCallback(() => { setScore(0); setGameOver(false); setStarted(true); }, []);

  useEffect(() => {
    if (!started || gameOver) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    let playerY = GROUND - 40, velY = 0, jumping = false, doubleJumped = false;
    let obstacles: { x: number; w: number; h: number }[] = [];
    let clouds: { x: number; y: number }[] = [{ x: 100, y: 30 }, { x: 350, y: 50 }];
    let localScore = 0;
    let frame = 0, speed = 4;
    let nextObs = 90;
    let animId: number;
    let running = true;

    const jump = () => {
      if (!jumping) { velY = -12; jumping = true; }
      else if (!doubleJumped) { velY = -10; doubleJumped = true; }
    };

    const onKey = (e: KeyboardEvent) => { if (e.key === "ArrowUp" || e.key === " " || e.key === "w") { e.preventDefault(); jump(); } };
    const onTouch = () => jump();
    document.addEventListener("keydown", onKey);
    canvas.addEventListener("click", onTouch);

    const loop = () => {
      if (!running) return;
      animId = requestAnimationFrame(loop);
      frame++;
      ctx.fillStyle = "#f1f5f9"; ctx.fillRect(0, 0, W, H);
      clouds.forEach(c => { c.x -= 0.5; if (c.x < -80) c.x = W + 80; ctx.fillStyle="#e2e8f0"; ctx.beginPath(); ctx.arc(c.x,c.y,20,0,Math.PI*2); ctx.arc(c.x+20,c.y-5,15,0,Math.PI*2); ctx.arc(c.x+40,c.y,18,0,Math.PI*2); ctx.fill(); });
      ctx.fillStyle = "#475569"; ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = "#334155";
      for (let x = (frame * speed) % 60; x < W; x += 60) { ctx.fillRect(x, GROUND + 2, 30, 4); }

      velY += 0.7; playerY += velY;
      if (playerY >= GROUND - 40) { playerY = GROUND - 40; velY = 0; jumping = false; doubleJumped = false; }

      const legAnim = Math.floor(frame / 5) % 2;
      const px = 80;
      ctx.fillStyle = "#7c3aed";
      ctx.fillRect(px, playerY, 30, 30);
      ctx.fillStyle = "#5b21b6";
      if (!jumping) {
        ctx.fillRect(px + 5, playerY + 30, 8, legAnim ? 10 : 5);
        ctx.fillRect(px + 17, playerY + 30, 8, legAnim ? 5 : 10);
      }
      ctx.fillStyle = "#fde68a"; ctx.beginPath(); ctx.arc(px+15, playerY-6, 8, 0, Math.PI*2); ctx.fill();

      nextObs--;
      if (nextObs <= 0) {
        const h = 20 + Math.floor(Math.random() * 30);
        obstacles.push({ x: W, w: 15, h });
        nextObs = 60 + Math.floor(Math.random() * 60);
      }

      obstacles = obstacles.filter(o => o.x + o.w > 0);
      obstacles.forEach(o => {
        o.x -= speed;
        ctx.fillStyle = "#16a34a";
        ctx.fillRect(o.x, GROUND - o.h, o.w, o.h);
        ctx.fillStyle = "#15803d";
        ctx.fillRect(o.x - 3, GROUND - o.h - 5, o.w + 6, 10);

        if (px + 25 > o.x + 2 && px + 5 < o.x + o.w - 2 && playerY + 30 > GROUND - o.h + 2) {
          running = false;
          cancelAnimationFrame(animId);
          const hs = Math.max(localScore, parseInt(localStorage.getItem("runner_hi") || "0"));
          localStorage.setItem("runner_hi", String(hs));
          setHighScore(hs);
          addPlay("runner", localScore);
          setGameOver(true);
        }
      });

      localScore++;
      speed = 4 + Math.floor(localScore / 500) * 0.5;
      if (frame % 5 === 0) setScore(Math.floor(localScore / 5));
      ctx.fillStyle = "#334155"; ctx.font = "bold 16px sans-serif"; ctx.textAlign = "right";
      ctx.fillText(String(Math.floor(localScore / 5)), W - 10, 25);
    };

    animId = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(animId); document.removeEventListener("keydown", onKey); canvas.removeEventListener("click", onTouch); };
  }, [started, gameOver, addPlay]);

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex gap-8 text-foreground font-bold">
        <div>スコア: {score}</div>
        <div className="text-muted-foreground">最高: {highScore}</div>
      </div>
      <div className="relative">
        <canvas ref={canvasRef} width={W} height={H} className="border-2 border-border rounded-xl shadow-md" />
        {!started && (
          <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center rounded-xl">
            <div className="text-5xl mb-3">🏃</div>
            <h2 className="text-2xl font-black text-foreground mb-2">エンドレスランナー</h2>
            <p className="text-muted-foreground text-sm mb-4">↑/スペース/クリックでジャンプ（2段ジャンプ可）</p>
            <Button onClick={startGame} size="lg" className="rounded-full px-8">スタート！</Button>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center rounded-xl">
            <h2 className="text-2xl font-black text-destructive mb-1">ゲームオーバー</h2>
            <p className="text-lg font-bold text-foreground mb-4">スコア: {score}</p>
            <Button onClick={startGame} size="lg" className="rounded-full px-8">もう一度</Button>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">↑ キー / スペース / クリックでジャンプ（2段ジャンプ可！）</p>
    </div>
  );
}
