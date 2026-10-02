import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const W = 600, H = 400;
const PAD_W = 12, PAD_H = 80, BALL_R = 8, PAD_SPEED = 6;

export default function Pong() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<"player" | "ai" | null>(null);
  const { addPlay } = useGameHistory();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let bx = W / 2, by = H / 2;
    let bdx = (Math.random() > 0.5 ? 1 : -1) * 5;
    let bdy = (Math.random() > 0.5 ? 1 : -1) * 4;
    let p1y = H / 2 - PAD_H / 2;
    let p2y = H / 2 - PAD_H / 2;
    let ps = 0, as_ = 0;
    let up = false, down = false;
    let animId: number;
    const MAX_SCORE = 7;

    const onKey = (e: KeyboardEvent, v: boolean) => {
      if (e.key === "ArrowUp") up = v;
      if (e.key === "ArrowDown") down = v;
      if (["ArrowUp","ArrowDown"].includes(e.key)) e.preventDefault();
    };
    document.addEventListener("keydown", e => onKey(e, true));
    document.addEventListener("keyup", e => onKey(e, false));

    const draw = () => {
      animId = requestAnimationFrame(draw);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, W, H);

      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke();
      ctx.setLineDash([]);

      if (up && p1y > 0) p1y -= PAD_SPEED;
      if (down && p1y < H - PAD_H) p1y += PAD_SPEED;

      const center = p2y + PAD_H / 2;
      if (center < by - 5) p2y = Math.min(p2y + 4.5, H - PAD_H);
      else if (center > by + 5) p2y = Math.max(p2y - 4.5, 0);

      bx += bdx; by += bdy;

      if (by < BALL_R || by > H - BALL_R) bdy = -bdy;

      if (bx < PAD_W + 20 + BALL_R && by > p1y && by < p1y + PAD_H && bdx < 0) {
        bdx = Math.abs(bdx) * 1.05;
        bdy += (by - (p1y + PAD_H / 2)) * 0.1;
      }
      if (bx > W - PAD_W - 20 - BALL_R && by > p2y && by < p2y + PAD_H && bdx > 0) {
        bdx = -Math.abs(bdx) * 1.05;
        bdy += (by - (p2y + PAD_H / 2)) * 0.1;
      }
      bdx = Math.max(-10, Math.min(10, bdx));
      bdy = Math.max(-8, Math.min(8, bdy));

      if (bx < 0) {
        as_++;
        setAiScore(as_);
        if (as_ >= MAX_SCORE) { cancelAnimationFrame(animId); setWinner("ai"); setGameOver(true); addPlay("pong", ps); return; }
        bx = W/2; by = H/2; bdx = 5; bdy = (Math.random()-0.5)*6;
      }
      if (bx > W) {
        ps++;
        setPlayerScore(ps);
        if (ps >= MAX_SCORE) { cancelAnimationFrame(animId); setWinner("player"); setGameOver(true); addPlay("pong", ps); return; }
        bx = W/2; by = H/2; bdx = -5; bdy = (Math.random()-0.5)*6;
      }

      ctx.fillStyle = "#6366f1";
      ctx.beginPath(); ctx.roundRect(20, p1y, PAD_W, PAD_H, 6); ctx.fill();
      ctx.fillStyle = "#ef4444";
      ctx.beginPath(); ctx.roundRect(W - 20 - PAD_W, p2y, PAD_W, PAD_H, 6); ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(bx, by, BALL_R, 0, Math.PI*2); ctx.fill();

      ctx.fillStyle = "#6366f1";
      ctx.font = "bold 40px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(String(ps), W/2 - 20, 50);
      ctx.fillStyle = "#ef4444";
      ctx.textAlign = "left";
      ctx.fillText(String(as_), W/2 + 20, 50);
    };

    animId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animId);
      document.removeEventListener("keydown", e => onKey(e, true));
      document.removeEventListener("keyup", e => onKey(e, false));
    };
  }, [gameOver, addPlay]);

  const restart = useCallback(() => {
    setPlayerScore(0); setAiScore(0); setWinner(null); setGameOver(false);
  }, []);

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex gap-12 text-sm font-bold text-foreground">
        <span className="text-indigo-600">あなた (矢印キー)</span>
        <span className="text-destructive">AI</span>
      </div>
      <div className="relative">
        <canvas ref={canvasRef} width={W} height={H} className="border-2 border-border rounded-xl shadow-md" />
        {gameOver && (
          <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center rounded-xl">
            <h2 className={`text-3xl font-black mb-2 ${winner === "player" ? "text-primary" : "text-destructive"}`}>
              {winner === "player" ? "あなたの勝ち！" : "AIの勝ち..."}
            </h2>
            <p className="text-lg text-muted-foreground mb-6">{playerScore} - {aiScore}</p>
            <Button onClick={restart} size="lg" className="rounded-full px-8">もう一度</Button>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">↑↓ キーでパドルを操作 / 先に {7} 点取ったら勝ち！</p>
    </div>
  );
}
