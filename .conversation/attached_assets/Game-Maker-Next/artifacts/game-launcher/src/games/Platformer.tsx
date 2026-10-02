import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const W = 600, H = 350;
const GRAVITY = 0.5;
const JUMP = -10;
const SPEED = 5;

const LEVELS = [
  { platforms: [{x:0,y:300,w:600,h:50},{x:150,y:230,w:100,h:15},{x:350,y:180,w:100,h:15},{x:500,y:130,w:100,h:15}], goal: 550, spikes: [{x:200,y:280},{x:300,y:280}] },
  { platforms: [{x:0,y:300,w:200,h:50},{x:250,y:250,w:100,h:15},{x:400,y:200,w:100,h:15},{x:100,y:150,w:80,h:15},{x:500,y:150,w:100,h:15}], goal: 520, spikes: [{x:220,y:280},{x:450,y:280}] },
  { platforms: [{x:0,y:300,w:150,h:50},{x:200,y:250,w:80,h:15},{x:350,y:200,w:80,h:15},{x:500,y:150,w:100,h:15},{x:100,y:100,w:80,h:15}], goal: 520, spikes: [{x:160,y:280},{x:300,y:280},{x:420,y:280}] },
];

export default function Platformer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [level, setLevel] = useState(0);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const { addPlay } = useGameHistory();

  const startGame = useCallback(() => {
    setLevel(0); setStarted(true); setGameOver(false); setWon(false);
  }, []);

  useEffect(() => {
    if (!started || gameOver || won) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const l = LEVELS[level];

    let player = { x: 30, y: 250, vx: 0, vy: 0, onGround: false };
    let keys: Record<string, boolean> = {};
    let animId: number;
    let camX = 0;

    const onKey = (e: KeyboardEvent, v: boolean) => {
      keys[e.key] = v;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", " "].includes(e.key)) e.preventDefault();
    };
    document.addEventListener("keydown", e => onKey(e, true));
    document.addEventListener("keyup", e => onKey(e, false));

    const loop = () => {
      animId = requestAnimationFrame(loop);
      ctx.fillStyle = "#87ceeb"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#228b22"; ctx.fillRect(0, 280, W, 70);

      l.platforms.forEach(p => {
        ctx.fillStyle = "#78350f"; ctx.fillRect(p.x - camX, p.y, p.w, p.h);
        ctx.fillStyle = "#a0522d"; ctx.fillRect(p.x - camX, p.y, p.w, 5);
      });

      l.spikes.forEach(s => {
        ctx.fillStyle = "#dc2626";
        ctx.beginPath(); ctx.moveTo(s.x - camX, 300); ctx.lineTo(s.x + 15 - camX, 270); ctx.lineTo(s.x + 30 - camX, 300); ctx.closePath(); ctx.fill();
      });

      ctx.fillStyle = "#fbbf24"; ctx.fillRect(l.goal - camX, 230, 30, 40);
      ctx.fillStyle = "#f59e0b"; ctx.fillRect(l.goal - camX, 230, 5, 40);
      ctx.fillStyle = "#fbbf24"; ctx.font = "bold 16px sans-serif"; ctx.fillText("★", l.goal + 5 - camX, 250);

      player.vx = 0;
      if (keys["ArrowLeft"]) player.vx = -SPEED;
      if (keys["ArrowRight"]) player.vx = SPEED;
      if ((keys["ArrowUp"] || keys[" "]) && player.onGround) { player.vy = JUMP; player.onGround = false; }

      player.vy += GRAVITY;
      player.x += player.vx; player.y += player.vy;
      player.onGround = false;

      l.platforms.forEach(p => {
        if (player.x + 15 > p.x && player.x - 15 < p.x + p.w && player.y + 15 > p.y && player.y + 15 < p.y + p.h + 10 && player.vy > 0) {
          player.y = p.y - 15; player.vy = 0; player.onGround = true;
        }
      });

      if (player.y > H) { setGameOver(true); addPlay("platformer", level); }
      l.spikes.forEach(s => { if (Math.abs(player.x - s.x) < 20 && player.y > 260) { setGameOver(true); addPlay("platformer", level); } });
      if (player.x > l.goal && player.y < 260) {
        if (level >= 2) { setWon(true); addPlay("platformer", 3); }
        else { setLevel(level + 1); player = { x: 30, y: 250, vx: 0, vy: 0, onGround: false }; camX = 0; }
      }

      camX = Math.max(0, player.x - W / 2);
      ctx.fillStyle = "#3b82f6";
      ctx.beginPath(); ctx.arc(player.x - camX, player.y, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(player.x - camX - 4, player.y - 4, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1e40af"; ctx.beginPath(); ctx.arc(player.x - camX + 4, player.y - 4, 4, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = "#fff"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "left";
      ctx.fillText(`ステージ ${level + 1}/3`, 10, 20);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      document.removeEventListener("keydown", e => onKey(e, true));
      document.removeEventListener("keyup", e => onKey(e, false));
    };
  }, [started, gameOver, won, level, addPlay]);

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="relative">
        <canvas ref={canvasRef} width={W} height={H} className="border-2 border-border rounded-xl shadow-lg" style={{ background: "#87ceeb" }} />
        {!started && (
          <div className="absolute inset-0 bg-sky-900/90 flex flex-col items-center justify-center rounded-xl">
            <div className="text-5xl mb-3">🎮</div>
            <h2 className="text-2xl font-black text-white mb-2">プラットフォーマー</h2>
            <p className="text-sky-200 text-sm mb-4">← → 移動 / ↑ ジャンプ / ★ ゴール</p>
            <Button onClick={startGame} size="lg" className="rounded-full px-8">スタート！</Button>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 bg-sky-900/90 flex flex-col items-center justify-center rounded-xl">
            <h2 className="text-3xl font-black text-white mb-2">ゲームオーバー</h2>
            <p className="text-sky-200 mb-4">ステージ {level + 1} で失敗</p>
            <Button onClick={startGame} size="lg" className="rounded-full px-8">もう一度</Button>
          </div>
        )}
        {won && (
          <div className="absolute inset-0 bg-sky-900/90 flex flex-col items-center justify-center rounded-xl">
            <h2 className="text-3xl font-black text-white mb-2">クリア！</h2>
            <p className="text-sky-200 mb-4">全ステージクリア！</p>
            <Button onClick={startGame} size="lg" className="rounded-full px-8">もう一度</Button>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">← → 移動 / ↑ ジャンプ / ★ ゴール</p>
    </div>
  );
}
