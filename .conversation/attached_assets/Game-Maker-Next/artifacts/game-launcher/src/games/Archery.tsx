import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const W = 500, H = 350;

export default function Archery() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [arrowCount, setArrowCount] = useState(10);
  const [wind, setWind] = useState(0);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [aimX, setAimX] = useState(250);
  const [aimY, setAimY] = useState(175);
  const [power, setPower] = useState(50);
  const [phase, setPhase] = useState<"aim" | "shoot" | "result">("aim");
  const [lastScore, setLastScore] = useState(0);
  const { addPlay } = useGameHistory();

  const startGame = useCallback(() => {
    setScore(0); setArrowCount(10); setWind((Math.random() - 0.5) * 20);
    setStarted(true); setGameOver(false); setPhase("aim"); setLastScore(0);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#87ceeb"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#228b22"; ctx.fillRect(0, 280, W, 70);

    const cx = 400, cy = 180;
    const rings = [60, 48, 36, 24, 12];
    const colors = ["#fff", "#000", "#3b82f6", "#ef4444", "#facc15"];
    rings.forEach((r, i) => {
      ctx.fillStyle = colors[i];
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#333"; ctx.lineWidth = 1; ctx.stroke();
    });

    ctx.fillStyle = "#a0522d";
    ctx.fillRect(60, 200, 10, 80);
    ctx.fillStyle = "#8b4513";
    ctx.fillRect(50, 200, 30, 10);

    if (phase === "aim") {
      ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(70, 240); ctx.lineTo(aimX, aimY); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(aimX, aimY, 4, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = "#333"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`スコア: ${score}`, 10, 20); ctx.fillText(`矢: ${arrowCount}`, 10, 40);
    ctx.fillText(`風: ${wind > 0 ? "右" : "左"} ${Math.abs(wind).toFixed(1)}`, 10, 60);
  }, [aimX, aimY, score, arrowCount, wind, phase]);

  useEffect(() => { draw(); }, [draw]);

  const shoot = () => {
    if (phase !== "aim" || arrowCount <= 0) return;
    setPhase("shoot");
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    let ax = 70, ay = 240;
    const dx = aimX - 70, dy = aimY - 240;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const speed = power / 5;
    const vx = (dx / dist) * speed + wind * 0.1;
    const vy = (dy / dist) * speed - 2;

    const animate = () => {
      ax += vx; ay += vy;
      draw();
      ctx.fillStyle = "#333"; ctx.beginPath(); ctx.arc(ax, ay, 3, 0, Math.PI * 2); ctx.fill();

      if (ax > 500 || ay > 350 || ay < 0) {
        const cx = 400, cy = 180;
        const d = Math.sqrt((ax - cx) ** 2 + (ay - cy) ** 2);
        let pts = 0;
        if (d < 12) pts = 10;
        else if (d < 24) pts = 8;
        else if (d < 36) pts = 6;
        else if (d < 48) pts = 4;
        else if (d < 60) pts = 2;
        setLastScore(pts);
        setScore(s => s + pts);
        const newArrows = arrowCount - 1;
        setArrowCount(newArrows);
        if (newArrows <= 0) { setGameOver(true); addPlay("archery", score + pts); }
        else { setPhase("result"); setWind((Math.random() - 0.5) * 20); }
        return;
      }
      requestAnimationFrame(animate);
    };
    animate();
  };

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="flex gap-6 text-foreground font-bold">
        <div>スコア: {score}</div>
        <div>矢: {arrowCount}/10</div>
        <div>風: {wind > 0 ? "→" : "←"} {Math.abs(wind).toFixed(1)}</div>
      </div>
      <div className="relative">
        <canvas ref={canvasRef} width={W} height={H} className="border-2 border-border rounded-xl shadow-md" />
        {!started && (
          <div className="absolute inset-0 bg-sky-900/90 flex flex-col items-center justify-center rounded-xl">
            <div className="text-5xl mb-3">🏹</div>
            <h2 className="text-2xl font-black text-white mb-2">アーチェリー</h2>
            <p className="text-sky-200 text-sm mb-4">風を読んで的の中心を射抜け！</p>
            <Button onClick={startGame} size="lg" className="rounded-full px-8">スタート！</Button>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 bg-sky-900/90 flex flex-col items-center justify-center rounded-xl">
            <h2 className="text-3xl font-black text-white mb-2">終了！</h2>
            <p className="text-sky-200 mb-4">合計: {score} 点</p>
            <Button onClick={startGame} size="lg" className="rounded-full px-8">もう一度</Button>
          </div>
        )}
      </div>
      {phase === "aim" && started && !gameOver && (
        <div className="flex flex-col items-center gap-2 w-full max-w-xs">
          <div className="flex items-center gap-2 w-full">
            <span className="text-xs font-bold text-muted-foreground">力</span>
            <input type="range" min="20" max="100" value={power} onChange={e => setPower(Number(e.target.value))} className="flex-1" />
            <span className="text-xs font-bold w-8">{power}</span>
          </div>
          <p className="text-xs text-muted-foreground">マウスで眩いてクリックして射撃</p>
        </div>
      )}
      {phase === "result" && (
        <div className="text-center">
          <p className="font-black text-lg text-primary">{lastScore > 0 ? `${lastScore}点！` : "外れ..."}</p>
          <Button onClick={() => setPhase("aim")} className="rounded-full px-8">次の矢 →</Button>
        </div>
      )}
    </div>
  );
}
