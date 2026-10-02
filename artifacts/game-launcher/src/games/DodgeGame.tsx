import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const W = 400, H = 400;

export default function DodgeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const { addPlay } = useGameHistory();

  const startGame = useCallback(() => {
    setScore(0); setStarted(true); setGameOver(false);
  }, []);

  useEffect(() => {
    if (!started || gameOver) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    let player = { x: 200, y: 350, r: 10 };
    let bullets: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
    let localScore = 0;
    let animId: number;
    let frame = 0;
    let keys: Record<string, boolean> = {};

    const onKey = (e: KeyboardEvent, v: boolean) => {
      keys[e.key] = v;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) e.preventDefault();
    };
    document.addEventListener("keydown", e => onKey(e, true));
    document.addEventListener("keyup", e => onKey(e, false));

    const loop = () => {
      animId = requestAnimationFrame(loop);
      frame++;
      ctx.fillStyle = "#1e1b4b"; ctx.fillRect(0, 0, W, H);

      if (keys["ArrowLeft"]) player.x -= 5;
      if (keys["ArrowRight"]) player.x += 5;
      if (keys["ArrowUp"]) player.y -= 5;
      if (keys["ArrowDown"]) player.y += 5;
      player.x = Math.max(player.r, Math.min(W - player.r, player.x));
      player.y = Math.max(player.r, Math.min(H - player.r, player.y));

      const spawnRate = Math.max(0.01, 0.05 + localScore * 0.0005);
      if (Math.random() < spawnRate) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 3;
        bullets.push({ x: Math.random() * W, y: -10, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 4 + Math.random() * 6 });
      }

      bullets = bullets.filter(b => b.x > -50 && b.x < W + 50 && b.y > -50 && b.y < H + 50);
      bullets.forEach(b => {
        b.x += b.vx; b.y += b.vy;
        const d = Math.sqrt((b.x - player.x) ** 2 + (b.y - player.y) ** 2);
        if (d < b.r + player.r) {
          cancelAnimationFrame(animId);
          setGameOver(true);
          addPlay("dodge", localScore);
        }
        ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      });

      ctx.fillStyle = "#22c55e"; ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#4ade80"; ctx.beginPath(); ctx.arc(player.x - 3, player.y - 3, 3, 0, Math.PI * 2); ctx.fill();

      localScore++;
      if (frame % 10 === 0) setScore(localScore);

      ctx.fillStyle = "#fff"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "left";
      ctx.fillText(`サバイバル: ${Math.floor(localScore / 60)}s`, 10, 20);
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
      <div className="text-2xl font-black text-foreground">サバイバル: {Math.floor(score / 60)}s</div>
      <div className="relative">
        <canvas ref={canvasRef} width={W} height={H} className="border-2 border-border rounded-xl shadow-lg" style={{ background: "#1e1b4b" }} />
        {!started && (
          <div className="absolute inset-0 bg-indigo-950/90 flex flex-col items-center justify-center rounded-xl">
            <div className="text-5xl mb-3">💫</div>
            <h2 className="text-2xl font-black text-white mb-2">ドッジゲーム</h2>
            <p className="text-indigo-200 text-sm mb-4">←↑↓→ 移動 / 弾をかわせ！</p>
            <Button onClick={startGame} size="lg" className="rounded-full px-8">スタート！</Button>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 bg-indigo-950/90 flex flex-col items-center justify-center rounded-xl">
            <h2 className="text-3xl font-black text-white mb-2">ゲームオーバー</h2>
            <p className="text-indigo-200 mb-4">サバイバル: {Math.floor(score / 60)}s</p>
            <Button onClick={startGame} size="lg" className="rounded-full px-8">もう一度</Button>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">←↑↓→ 移動 / 弾をかわせ！</p>
    </div>
  );
}
