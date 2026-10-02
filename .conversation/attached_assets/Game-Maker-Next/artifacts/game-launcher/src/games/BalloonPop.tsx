import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

interface Balloon {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  color: string;
  stringColor: string;
  wobble: number;
  wobbleSpeed: number;
  wobbleOffset: number;
  points: number;
}

const BALLOON_COLORS = [
  { main: "#ef4444", light: "#fca5a5", dark: "#b91c1c", string: "#dc2626", points: 10 },
  { main: "#3b82f6", light: "#93c5fd", dark: "#1d4ed8", string: "#2563eb", points: 10 },
  { main: "#22c55e", light: "#86efac", dark: "#15803d", string: "#16a34a", points: 10 },
  { main: "#eab308", light: "#fde047", dark: "#a16207", string: "#ca8a04", points: 15 },
  { main: "#a855f7", light: "#d8b4fe", dark: "#7e22ce", string: "#9333ea", points: 15 },
  { main: "#f97316", light: "#fdba74", dark: "#c2410c", string: "#ea580c", points: 20 },
  { main: "#ec4899", light: "#fbcfe8", dark: "#be185d", string: "#db2777", points: 25 },
  { main: "#14b8a6", light: "#5eead4", dark: "#0f766e", string: "#0d9488", points: 30 },
];

const W = 640;
const H = 480;

export default function BalloonPop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"ready" | "playing" | "result">("ready");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => parseInt(localStorage.getItem("balloon_best") || "0"));
  const [popped, setPopped] = useState(0);
  const [missed, setMissed] = useState(0);
  const balloonsRef = useRef<Balloon[]>([]);
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }>>([]);
  const nextId = useRef(0);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const spawnTimer = useRef(0);
  const { addPlay } = useGameHistory();

  const spawnBalloon = useCallback(() => {
    const color = BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
    const size = 25 + Math.random() * 25;
    const balloon: Balloon = {
      id: nextId.current++,
      x: 40 + Math.random() * (W - 80),
      y: H + size,
      size,
      speed: 0.5 + Math.random() * 1.5,
      color: color.main,
      stringColor: color.string,
      wobble: 20 + Math.random() * 30,
      wobbleSpeed: 0.02 + Math.random() * 0.03,
      wobbleOffset: Math.random() * Math.PI * 2,
      points: color.points,
    };
    balloonsRef.current.push(balloon);
  }, []);

  const popBalloon = (b: Balloon) => {
    // Particles
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      particlesRef.current.push({
        x: b.x,
        y: b.y - b.size,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        life: 1,
        color: b.color,
        size: 3 + Math.random() * 3,
      });
    }
    setScore(s => s + b.points);
    setPopped(p => p + 1);
  };

  const startGame = () => {
    setScore(0);
    setPopped(0);
    setMissed(0);
    balloonsRef.current = [];
    particlesRef.current = [];
    timeRef.current = 0;
    spawnTimer.current = 0;
    setPhase("playing");
  };

  useEffect(() => {
    if (phase !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const loop = () => {
      ctx.clearRect(0, 0, W, H);

      // Sky background
      const gradient = ctx.createLinearGradient(0, 0, 0, H);
      gradient.addColorStop(0, "#e0f2fe");
      gradient.addColorStop(0.5, "#bae6fd");
      gradient.addColorStop(1, "#f0f9ff");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);

      // Clouds
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.ellipse(100, 60, 60, 25, 0, 0, Math.PI * 2);
      ctx.ellipse(140, 55, 50, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(450, 90, 70, 28, 0, 0, Math.PI * 2);
      ctx.ellipse(500, 85, 55, 22, 0, 0, Math.PI * 2);
      ctx.fill();

      timeRef.current += 1;
      spawnTimer.current += 1;

      // Spawn balloons
      const spawnRate = Math.max(30, 90 - Math.floor(timeRef.current / 300) * 10);
      if (spawnTimer.current >= spawnRate) {
        spawnTimer.current = 0;
        spawnBalloon();
        // Sometimes spawn extra
        if (Math.random() < 0.3) spawnBalloon();
      }

      // Update & draw balloons
      balloonsRef.current = balloonsRef.current.filter(b => {
        b.y -= b.speed;
        const wobbleX = b.x + Math.sin(timeRef.current * b.wobbleSpeed + b.wobbleOffset) * b.wobble * 0.3;

        if (b.y < -b.size * 2) {
          setMissed(m => m + 1);
          return false;
        }

        // Draw string
        ctx.strokeStyle = b.stringColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(wobbleX, b.y);
        ctx.quadraticCurveTo(wobbleX + 5, b.y + b.size * 0.8, wobbleX, b.y + b.size * 1.2);
        ctx.stroke();

        // Draw balloon
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.ellipse(wobbleX, b.y - b.size, b.size * 0.8, b.size, 0, 0, Math.PI * 2);
        ctx.fill();

        // Shine
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.beginPath();
        ctx.ellipse(wobbleX - b.size * 0.25, b.y - b.size * 1.2, b.size * 0.25, b.size * 0.4, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Knot
        ctx.fillStyle = b.stringColor;
        ctx.beginPath();
        ctx.moveTo(wobbleX, b.y);
        ctx.lineTo(wobbleX - 4, b.y + 6);
        ctx.lineTo(wobbleX + 4, b.y + 6);
        ctx.fill();

        return true;
      });

      // Update & draw particles
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= 0.02;
        if (p.life <= 0) return false;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        return true;
      });

      // Score display
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`得点: ${score}`, 15, 30);
      ctx.font = "14px sans-serif";
      ctx.fillText(`割った: ${popped} / 逃した: ${missed}`, 15, 52);

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [phase, score, popped, missed, spawnBalloon]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    let hit = false;
    balloonsRef.current = balloonsRef.current.filter(b => {
      const wobbleX = b.x + Math.sin(timeRef.current * b.wobbleSpeed + b.wobbleOffset) * b.wobble * 0.3;
      const dx = clickX - wobbleX;
      const dy = clickY - (b.y - b.size);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < b.size * 0.9) {
        popBalloon(b);
        hit = true;
        return false;
      }
      return true;
    });

    if (!hit) {
      // Click effect (miss)
      ctx: CanvasRenderingContext2D | null;
    }
  };

  useEffect(() => {
    if (missed >= 10) {
      setPhase("result");
      if (score > bestScore) {
        setBestScore(score);
        localStorage.setItem("balloon_best", String(score));
      }
      addPlay({ gameId: "balloonpop", score });
    }
  }, [missed, score, bestScore, addPlay]);

  if (phase === "ready") {
    return (
      <div className="text-center">
        <div className="text-6xl mb-4">🎈</div>
        <h2 className="text-2xl font-black mb-2">風船割りゲーム</h2>
        <p className="text-muted-foreground mb-1 max-w-sm mx-auto">浮かび上がる風船をクリックで割ろう10個逃したらゲームオーバー！</p>
        <p className="text-sm text-muted-foreground mb-6">彩色風船は高得点★</p>
        {bestScore > 0 && <p className="text-sm font-bold text-amber-600 mb-4">最高得点: {bestScore}</p>}
        <Button onClick={startGame} className="rounded-full px-8 text-lg font-bold">スタート</Button>
      </div>
    );
  }

  if (phase === "result") {
    return (
      <div className="text-center">
        <div className="text-6xl mb-4">🎈</div>
        <h2 className="text-2xl font-black mb-2">ゲームオーバー！</h2>
        <div className="text-5xl font-black text-pink-500 mb-2">{score}</div>
        <p className="text-muted-foreground mb-1">割った風船: {popped}</p>
        <p className="text-muted-foreground mb-4">逃した風船: {missed}/10</p>
        {score >= bestScore && score > 0 && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl px-4 py-2 mb-4 inline-block">
            <p className="text-amber-700 font-bold">🏆 新記録！</p>
          </div>
        )}
        <p className="text-sm text-muted-foreground mb-6">最高得点: {bestScore}</p>
        <Button onClick={startGame} className="rounded-full px-8 font-bold">もう一度遊ぶ</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onClick={handleCanvasClick}
        className="rounded-xl border-2 border-border shadow-lg cursor-crosshair max-w-full"
        style={{ maxHeight: "60vh" }}
      />
      <p className="text-xs text-muted-foreground mt-2">風船をクリックで割ろう！10個逃したら終了</p>
    </div>
  );
}
