import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const W = 600, H = 400;
type Vec = { x: number; y: number };
type Asteroid = { pos: Vec; vel: Vec; r: number; pts: number[] };
type Bullet = { pos: Vec; vel: Vec; life: number };
type Ship = { pos: Vec; vel: Vec; angle: number; invincible: number };

function randomPts(r: number, n = 10): number[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const jr = r * (0.7 + Math.random() * 0.4);
    return jr;
  }).flatMap((jr, i) => {
    const a = (i / n) * Math.PI * 2;
    return [Math.cos(a) * jr, Math.sin(a) * jr];
  });
}

function drawAsteroid(ctx: CanvasRenderingContext2D, a: Asteroid) {
  ctx.save(); ctx.translate(a.pos.x, a.pos.y);
  ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < a.pts.length; i += 2) {
    if (i === 0) ctx.moveTo(a.pts[i], a.pts[i+1]);
    else ctx.lineTo(a.pts[i], a.pts[i+1]);
  }
  ctx.closePath(); ctx.stroke(); ctx.restore();
}

function wrap(v: Vec) { v.x = ((v.x % W) + W) % W; v.y = ((v.y % H) + H) % H; }

export default function Asteroids() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const { addPlay } = useGameHistory();

  const startGame = useCallback(() => { setScore(0); setLives(3); setGameOver(false); setStarted(true); }, []);

  useEffect(() => {
    if (!started || gameOver) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let ship: Ship = { pos: { x: W/2, y: H/2 }, vel: { x: 0, y: 0 }, angle: -Math.PI/2, invincible: 180 };
    let asteroids: Asteroid[] = Array.from({ length: 4 }, () => ({
      pos: { x: Math.random() < 0.5 ? Math.random() * 100 : W - Math.random() * 100, y: Math.random() * H },
      vel: { x: (Math.random()-0.5)*2, y: (Math.random()-0.5)*2 },
      r: 40, pts: randomPts(40)
    }));
    let bullets: Bullet[] = [];
    let localScore = 0, localLives = 3;
    let keys: Record<string, boolean> = {};
    let animId: number;

    const onKey = (e: KeyboardEvent, v: boolean) => { keys[e.key] = v; if (["ArrowUp","ArrowLeft","ArrowRight","ArrowDown"," "].includes(e.key)) e.preventDefault(); };
    document.addEventListener("keydown", e => onKey(e, true));
    document.addEventListener("keyup", e => onKey(e, false));

    const spawnAsteroids = (level: number) => {
      asteroids = Array.from({ length: 4 + level * 2 }, () => ({
        pos: { x: Math.random() < 0.5 ? 0 : W, y: Math.random() * H },
        vel: { x: (Math.random()-0.5)*(2+level*0.5), y: (Math.random()-0.5)*(2+level*0.5) },
        r: 40, pts: randomPts(40)
      }));
    };
    let level = 0;

    const loop = () => {
      animId = requestAnimationFrame(loop);
      ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 0, W, H);
      if (keys["ArrowLeft"]) ship.angle -= 0.07;
      if (keys["ArrowRight"]) ship.angle += 0.07;
      if (keys["ArrowUp"]) { ship.vel.x += Math.cos(ship.angle)*0.3; ship.vel.y += Math.sin(ship.angle)*0.3; }
      ship.vel.x *= 0.99; ship.vel.y *= 0.99;
      ship.pos.x += ship.vel.x; ship.pos.y += ship.vel.y;
      wrap(ship.pos);
      if (ship.invincible > 0) ship.invincible--;

      bullets = bullets.filter(b => b.life > 0);
      bullets.forEach(b => { b.pos.x += b.vel.x; b.pos.y += b.vel.y; wrap(b.pos); b.life--; });

      asteroids.forEach(a => { a.pos.x += a.vel.x; a.pos.y += a.vel.y; wrap(a.pos); });

      if (keys[" "]) {
        keys[" "] = false;
        if (bullets.length < 5) bullets.push({ pos: { x: ship.pos.x, y: ship.pos.y }, vel: { x: Math.cos(ship.angle)*8, y: Math.sin(ship.angle)*8 }, life: 60 });
      }

      const newAsteroids: Asteroid[] = [];
      bullets = bullets.filter(b => {
        for (let i = asteroids.length-1; i >= 0; i--) {
          const a = asteroids[i];
          const d = Math.hypot(b.pos.x-a.pos.x, b.pos.y-a.pos.y);
          if (d < a.r) {
            asteroids.splice(i, 1);
            localScore += a.r > 30 ? 20 : a.r > 15 ? 50 : 100;
            setScore(localScore);
            if (a.r > 15) {
              for (let j = 0; j < 2; j++) newAsteroids.push({
                pos: { x: a.pos.x, y: a.pos.y },
                vel: { x: (Math.random()-0.5)*3, y: (Math.random()-0.5)*3 },
                r: a.r/2, pts: randomPts(a.r/2)
              });
            }
            return false;
          }
        }
        return true;
      });
      asteroids.push(...newAsteroids);
      if (!asteroids.length) { level++; spawnAsteroids(level); }

      if (ship.invincible === 0) {
        for (const a of asteroids) {
          if (Math.hypot(ship.pos.x-a.pos.x, ship.pos.y-a.pos.y) < a.r - 5) {
            localLives--;
            setLives(localLives);
            if (localLives <= 0) { cancelAnimationFrame(animId); setGameOver(true); addPlay("asteroids", localScore); return; }
            ship.pos = { x: W/2, y: H/2 }; ship.vel = { x: 0, y: 0 }; ship.invincible = 180;
          }
        }
      }

      asteroids.forEach(a => drawAsteroid(ctx, a));
      bullets.forEach(b => { ctx.fillStyle="#fde68a"; ctx.beginPath(); ctx.arc(b.pos.x,b.pos.y,2,0,Math.PI*2); ctx.fill(); });

      if (ship.invincible % 10 < 5 || ship.invincible === 0) {
        ctx.save(); ctx.translate(ship.pos.x, ship.pos.y); ctx.rotate(ship.angle);
        ctx.strokeStyle = "#7c3aed"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(15,0); ctx.lineTo(-10,8); ctx.lineTo(-6,0); ctx.lineTo(-10,-8); ctx.closePath(); ctx.stroke();
        if (keys["ArrowUp"]) { ctx.strokeStyle="#f97316"; ctx.beginPath(); ctx.moveTo(-6,0); ctx.lineTo(-15,0); ctx.stroke(); }
        ctx.restore();
      }

      ctx.fillStyle="#64748b"; ctx.font="14px sans-serif"; ctx.textAlign="left"; ctx.fillText(`❤️ ${localLives}`, 10, 20);
      ctx.textAlign="right"; ctx.fillText(`${localScore}`, W-10, 20);
    };

    animId = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animId); document.removeEventListener("keydown", e => onKey(e, true)); document.removeEventListener("keyup", e => onKey(e, false)); };
  }, [started, gameOver, addPlay]);

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <canvas ref={canvasRef} width={W} height={H} className="border-2 border-border rounded-xl shadow-lg" style={{ background: "#0f172a" }} />
        {!started && (
          <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center rounded-xl text-center">
            <div className="text-5xl mb-3">🚀</div>
            <h2 className="text-3xl font-black text-white mb-2">アステロイド</h2>
            <p className="text-slate-400 text-sm mb-6">← → 回転 | ↑ 加速 | スペース 射撃</p>
            <Button onClick={startGame} size="lg" className="rounded-full px-10">スタート！</Button>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center rounded-xl">
            <h2 className="text-3xl font-black text-white mb-2">ゲームオーバー</h2>
            <p className="text-xl text-slate-300 mb-6">{score} pts</p>
            <Button onClick={startGame} size="lg" className="rounded-full px-10">もう一度</Button>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">← → 回転 / ↑ 加速 / スペース 射撃</p>
    </div>
  );
}
