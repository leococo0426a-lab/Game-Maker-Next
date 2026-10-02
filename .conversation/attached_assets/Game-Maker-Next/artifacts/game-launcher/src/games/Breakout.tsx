import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const BRICK_ROWS = 9;
const BRICK_COLS = 12;
const ROW_COLORS = ["#ef4444","#f97316","#f59e0b","#22c55e","#06b6d4","#3b82f6","#a855f7","#ec4899","#64748b"];

export default function Breakout() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const { addPlay } = useGameHistory();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const CW = canvas.width, CH = canvas.height;
    const BALL_R = 7;
    let x = CW / 2, y = CH - 50;
    let dx = 4, dy = -4;
    const PAD_H = 12, PAD_W = 90;
    let paddleX = (CW - PAD_W) / 2;
    let right = false, left = false;

    const BW = 44, BH = 16, BPAD_X = 6, BPAD_Y = 6;
    const OFF_TOP = 40, OFF_LEFT = 14;

    type Brick = { x: number; y: number; status: number };
    const bricks: Brick[][] = [];
    for (let c = 0; c < BRICK_COLS; c++) {
      bricks[c] = [];
      for (let r = 0; r < BRICK_ROWS; r++) {
        bricks[c][r] = { x: 0, y: 0, status: 1 };
      }
    }

    let localScore = 0;
    let localLives = 3;
    let animId: number;
    let stopped = false;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") right = true;
      if (e.key === "ArrowLeft") left = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") right = false;
      if (e.key === "ArrowLeft") left = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      paddleX = e.clientX - rect.left - PAD_W / 2;
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      paddleX = e.touches[0].clientX - rect.left - PAD_W / 2;
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });

    const draw = () => {
      if (stopped) return;
      animId = requestAnimationFrame(draw);

      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, CW, CH);

      let totalBricks = 0;
      for (let c = 0; c < BRICK_COLS; c++) {
        for (let r = 0; r < BRICK_ROWS; r++) {
          const b = bricks[c][r];
          const bx = OFF_LEFT + c * (BW + BPAD_X);
          const by = OFF_TOP + r * (BH + BPAD_Y);
          b.x = bx; b.y = by;
          if (b.status === 1) {
            totalBricks++;
            ctx.fillStyle = ROW_COLORS[r] || "#888";
            ctx.beginPath();
            ctx.roundRect(bx, by, BW, BH, 4);
            ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.2)";
            ctx.fillRect(bx + 3, by + 3, BW - 6, 4);
          }
        }
      }

      if (totalBricks === 0) {
        stopped = true;
        setWon(true);
        setGameOver(true);
        addPlay("breakout", localScore);
        return;
      }

      ctx.beginPath();
      ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
      ctx.fillStyle = "#7c3aed";
      ctx.fill();

      ctx.beginPath();
      ctx.roundRect(paddleX, CH - PAD_H - 5, PAD_W, PAD_H, 6);
      ctx.fillStyle = "#1e293b";
      ctx.fill();

      for (let c = 0; c < BRICK_COLS; c++) {
        for (let r = 0; r < BRICK_ROWS; r++) {
          const b = bricks[c][r];
          if (b.status === 1 && x > b.x && x < b.x + BW && y > b.y && y < b.y + BH) {
            dy = -dy; b.status = 0;
            localScore += 10;
            setScore(localScore);
          }
        }
      }

      if (x + dx > CW - BALL_R || x + dx < BALL_R) dx = -dx;
      if (y + dy < BALL_R) dy = -dy;
      else if (y + dy > CH - BALL_R - PAD_H - 5) {
        if (x > paddleX && x < paddleX + PAD_W) {
          dy = -Math.abs(dy);
          dx += (x - (paddleX + PAD_W / 2)) * 0.05;
        } else if (y + dy > CH - BALL_R) {
          localLives--;
          setLives(localLives);
          if (localLives <= 0) {
            stopped = true;
            setGameOver(true);
            addPlay("breakout", localScore);
            return;
          }
          x = CW / 2; y = CH - 50; dx = 4; dy = -4;
          paddleX = (CW - PAD_W) / 2;
        }
      }

      if (right && paddleX < CW - PAD_W) paddleX += 7;
      if (left && paddleX > 0) paddleX -= 7;
      paddleX = Math.max(0, Math.min(CW - PAD_W, paddleX));
      x += dx; y += dy;
    };

    animId = requestAnimationFrame(draw);

    return () => {
      stopped = true;
      cancelAnimationFrame(animId);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("touchmove", onTouchMove);
    };
  }, [gameOver, addPlay]);

  const restart = useCallback(() => {
    setScore(0); setLives(3); setWon(false); setGameOver(false);
  }, []);

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex justify-between w-[590px] px-4 text-lg font-bold text-foreground">
        <div>スコア: {score}</div>
        <div className="flex gap-2">{Array.from({ length: lives }).map((_, i) => <span key={i}>❤️</span>)}</div>
      </div>
      <div className="relative">
        <canvas ref={canvasRef} width={590} height={400} className="border-2 border-border rounded-xl shadow-md bg-slate-50" />
        {gameOver && (
          <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center rounded-xl">
            <h2 className={`text-3xl font-black mb-2 ${won ? "text-green-600" : "text-destructive"}`}>
              {won ? "クリア！" : "ゲームオーバー"}
            </h2>
            <p className="text-xl font-bold text-foreground mb-6">スコア: {score}</p>
            <Button onClick={restart} size="lg" className="rounded-full px-8">もう一度</Button>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">マウスまたは矢印キーでパドルを操作</p>
    </div>
  );
}
