import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const W = 400, H = 500;
const LANES = [80, 160, 240, 320];

export default function Racing() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [speed, setSpeed] = useState(0);
  const { addPlay } = useGameHistory();

  const startGame = useCallback(() => {
    setScore(0); setStarted(true); setGameOver(false); setSpeed(0);
  }, []);

  useEffect(() => {
    if (!started || gameOver) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    let playerLane = 1;
    let playerX = LANES[playerLane];
    let playerY = 400;
    let obstacles: {x:number;y:number;w:number}[] = [];
    let localScore = 0;
    let localSpeed = 3;
    let roadOffset = 0;
    let animId: number;
    let keys: Record<string, boolean> = {};

    const onKey = (e: KeyboardEvent, v: boolean) => {
      keys[e.key] = v;
      if (["ArrowLeft", "ArrowRight", "ArrowUp"].includes(e.key)) e.preventDefault();
    };
    document.addEventListener("keydown", e => onKey(e, true));
    document.addEventListener("keyup", e => onKey(e, false));

    const loop = () => {
      animId = requestAnimationFrame(loop);
      ctx.fillStyle = "#334155"; ctx.fillRect(0, 0, W, H);

      roadOffset += localSpeed;
      if (roadOffset > 40) roadOffset = 0;
      ctx.fillStyle = "#fff";
      for (let y = -40; y < H; y += 40) {
        ctx.fillRect(197, y + roadOffset, 6, 20);
        ctx.fillRect(117, y + roadOffset, 6, 20);
        ctx.fillRect(277, y + roadOffset, 6, 20);
      }
      ctx.fillStyle = "#ef4444"; ctx.fillRect(0, 0, 5, H);
      ctx.fillRect(W - 5, 0, 5, H);

      if (keys["ArrowLeft"] && playerLane > 0) { playerLane--; playerX = LANES[playerLane]; keys["ArrowLeft"] = false; }
      if (keys["ArrowRight"] && playerLane < 3) { playerLane++; playerX = LANES[playerLane]; keys["ArrowRight"] = false; }
      if (keys["ArrowUp"]) localSpeed = Math.min(12, localSpeed + 0.1);
      else localSpeed = Math.max(3, localSpeed - 0.05);

      if (Math.random() < 0.02) {
        const lane = Math.floor(Math.random() * 4);
        obstacles.push({ x: LANES[lane], y: -50, w: 40 });
      }

      obstacles = obstacles.filter(o => o.y < H + 50);
      obstacles.forEach(o => {
        o.y += localSpeed;
        const dx = o.x - playerX, dy = o.y - playerY;
        if (Math.abs(dx) < 30 && Math.abs(dy) < 40) {
          cancelAnimationFrame(animId);
          setGameOver(true);
          addPlay("racing", localScore);
        }
        ctx.fillStyle = "#dc2626";
        ctx.fillRect(o.x - 20, o.y - 25, 40, 50);
        ctx.fillStyle = "#991b1b";
        ctx.fillRect(o.x - 18, o.y - 10, 36, 8);
        ctx.fillRect(o.x - 15, o.y + 5, 8, 12);
        ctx.fillRect(o.x + 7, o.y + 5, 8, 12);
      });

      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.moveTo(playerX, playerY - 30);
      ctx.lineTo(playerX - 18, playerY + 20);
      ctx.lineTo(playerX + 18, playerY + 20);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#1e40af";
      ctx.fillRect(playerX - 12, playerY + 5, 6, 10);
      ctx.fillRect(playerX + 6, playerY + 5, 6, 10);

      localScore += Math.floor(localSpeed / 3);
      setScore(localScore);
      setSpeed(Math.floor(localSpeed * 10));

      ctx.fillStyle = "#fff"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "left";
      ctx.fillText(`距離: ${localScore}m`, 10, 20);
      ctx.textAlign = "right"; ctx.fillText(`速度: ${Math.floor(localSpeed * 10)}km/h`, W - 10, 20);
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
      <div className="flex gap-6 text-foreground font-bold">
        <div>距離: {score}m</div>
        <div>速度: {speed}km/h</div>
      </div>
      <div className="relative">
        <canvas ref={canvasRef} width={W} height={H} className="border-2 border-border rounded-xl shadow-lg" style={{ background: "#334155" }} />
        {!started && (
          <div className="absolute inset-0 bg-slate-800/90 flex flex-col items-center justify-center rounded-xl">
            <div className="text-5xl mb-3">🏎️</div>
            <h2 className="text-2xl font-black text-white mb-2">レーシング</h2>
            <p className="text-slate-400 text-sm mb-4">← → レーン変更 / ↑ 加速</p>
            <Button onClick={startGame} size="lg" className="rounded-full px-8">スタート！</Button>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 bg-slate-800/90 flex flex-col items-center justify-center rounded-xl">
            <h2 className="text-3xl font-black text-white mb-2">クラッシュ！</h2>
            <p className="text-slate-300 mb-4">走行距離: {score}m</p>
            <Button onClick={startGame} size="lg" className="rounded-full px-8">もう一度</Button>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">← → レーン変更 / ↑ 加速</p>
    </div>
  );
}
