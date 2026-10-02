import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const W = 500, H = 400;

const HOLES = [
  { start: { x: 50, y: 350 }, hole: { x: 450, y: 50 }, walls: [{ x: 0, y: 200, w: 300, h: 20 }, { x: 200, y: 100, w: 20, h: 100 }] },
  { start: { x: 50, y: 50 }, hole: { x: 450, y: 350 }, walls: [{ x: 150, y: 0, w: 20, h: 200 }, { x: 300, y: 200, w: 20, h: 200 }] },
  { start: { x: 250, y: 350 }, hole: { x: 250, y: 50 }, walls: [{ x: 100, y: 150, w: 120, h: 20 }, { x: 280, y: 150, w: 120, h: 20 }] },
];

export default function MiniGolf() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [holeIdx, setHoleIdx] = useState(0);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [phase, setPhase] = useState<"aim" | "roll" | "done">("aim");
  const [strokes, setStrokes] = useState(0);
  const [totalStrokes, setTotalStrokes] = useState(0);
  const [aimAngle, setAimAngle] = useState(-Math.PI / 2);
  const [power, setPower] = useState(50);
  const { addPlay } = useGameHistory();

  const hole = HOLES[holeIdx];
  const [ball, setBall] = useState({ x: hole.start.x, y: hole.start.y });

  const startGame = useCallback(() => {
    setScore(0); setHoleIdx(0); setStarted(true); setGameOver(false);
    setPhase("aim"); setStrokes(0); setTotalStrokes(0); setAimAngle(-Math.PI / 2); setPower(50);
    setBall({ x: HOLES[0].start.x, y: HOLES[0].start.y });
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const h = HOLES[holeIdx];
    ctx.fillStyle = "#166534"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#22c55e"; ctx.fillRect(20, 20, W - 40, H - 40);

    h.walls.forEach(w => {
      ctx.fillStyle = "#78350f"; ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeStyle = "#92400e"; ctx.lineWidth = 2; ctx.strokeRect(w.x, w.y, w.w, w.h);
    });

    ctx.fillStyle = "#1e3a8a"; ctx.beginPath(); ctx.arc(h.hole.x, h.hole.y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(h.hole.x, h.hole.y, 8, 0, Math.PI * 2); ctx.fill();

    if (phase === "aim") {
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(ball.x, ball.y); ctx.lineTo(ball.x + Math.cos(aimAngle) * power, ball.y + Math.sin(aimAngle) * power); ctx.stroke(); ctx.setLineDash([]);
    }

    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ccc"; ctx.beginPath(); ctx.arc(ball.x - 2, ball.y - 2, 3, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#fff"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`ホール ${holeIdx + 1}/3`, 10, 20); ctx.fillText(`打数: ${strokes}`, 10, 40);
  }, [holeIdx, ball, phase, aimAngle, power, strokes]);

  useEffect(() => { draw(); }, [draw]);

  const shoot = () => {
    if (phase !== "aim") return;
    setPhase("roll");
    const newStrokes = strokes + 1;
    setStrokes(newStrokes);
    setTotalStrokes(t => t + 1);

    let bx = ball.x, by = ball.y;
    let vx = Math.cos(aimAngle) * (power / 8);
    let vy = Math.sin(aimAngle) * (power / 8);
    const h = HOLES[holeIdx];

    const animate = () => {
      bx += vx; by += vy;
      vx *= 0.98; vy *= 0.98;

      if (bx < 20 || bx > W - 20) { vx = -vx; bx = Math.max(20, Math.min(W - 20, bx)); }
      if (by < 20 || by > H - 20) { vy = -vy; by = Math.max(20, Math.min(H - 20, by)); }

      h.walls.forEach(w => {
        if (bx + 8 > w.x && bx - 8 < w.x + w.w && by + 8 > w.y && by - 8 < w.y + w.h) {
          const dx = Math.abs(bx - (w.x + w.w / 2)), dy = Math.abs(by - (w.y + w.h / 2));
          if (dx / w.w > dy / w.h) vx = -vx; else vy = -vy;
        }
      });

      const dh = Math.sqrt((bx - h.hole.x) ** 2 + (by - h.hole.y) ** 2);
      if (dh < 12 && Math.abs(vx) < 3 && Math.abs(vy) < 3) {
        setScore(s => s + Math.max(1, 4 - newStrokes) * 100);
        if (holeIdx >= 2) {
          setGameOver(true);
          addPlay("minigolf", totalStrokes + 1);
        } else {
          setHoleIdx(hi => hi + 1);
          setStrokes(0);
          setBall({ x: HOLES[holeIdx + 1].start.x, y: HOLES[holeIdx + 1].start.y });
          setPhase("aim");
        }
        return;
      }

      if (Math.abs(vx) < 0.1 && Math.abs(vy) < 0.1) {
        setBall({ x: bx, y: by });
        setPhase("aim");
        return;
      }

      setBall({ x: bx, y: by });
      requestAnimationFrame(animate);
    };
    animate();
  };

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="flex gap-6 text-foreground font-bold">
        <div>ホール: {holeIdx + 1}/3</div>
        <div>打数: {strokes}</div>
        <div>スコア: {score}</div>
      </div>
      <div className="relative">
        <canvas ref={canvasRef} width={W} height={H} className="border-2 border-border rounded-xl shadow-md" />
        {!started && (
          <div className="absolute inset-0 bg-green-900/90 flex flex-col items-center justify-center rounded-xl">
            <div className="text-5xl mb-3">⛳</div>
            <h2 className="text-2xl font-black text-white mb-2">ミニゴルフ</h2>
            <p className="text-green-200 text-sm mb-4">3ホールに挑戦！最少打数で入れよう</p>
            <Button onClick={startGame} size="lg" className="rounded-full px-8">スタート！</Button>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 bg-green-900/90 flex flex-col items-center justify-center rounded-xl">
            <h2 className="text-3xl font-black text-white mb-2">コンプリート！</h2>
            <p className="text-green-200 mb-1">合計打数: {totalStrokes}</p>
            <p className="text-green-200 mb-4">スコア: {score}</p>
            <Button onClick={startGame} size="lg" className="rounded-full px-8">もう一度</Button>
          </div>
        )}
      </div>
      {phase === "aim" && started && !gameOver && (
        <div className="flex flex-col items-center gap-2 w-full max-w-xs">
          <div className="flex items-center gap-2 w-full">
            <span className="text-xs font-bold text-muted-foreground">力</span>
            <input type="range" min="10" max="100" value={power} onChange={e => setPower(Number(e.target.value))} className="flex-1" />
            <span className="text-xs font-bold w-8">{power}</span>
          </div>
          <div className="flex items-center gap-2 w-full">
            <span className="text-xs font-bold text-muted-foreground">角度</span>
            <input type="range" min="-180" max="0" value={aimAngle * 180 / Math.PI} onChange={e => setAimAngle(Number(e.target.value) * Math.PI / 180)} className="flex-1" />
          </div>
          <Button onClick={shoot} className="rounded-full px-8">打つ！</Button>
        </div>
      )}
    </div>
  );
}
