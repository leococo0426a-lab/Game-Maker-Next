import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const CELL = 20;
const COLS = 20;
const ROWS = 20;
const W = CELL * COLS;
const H = CELL * ROWS;

export default function Snake() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem("snake_high") || "0"));
  const { addPlay } = useGameHistory();

  const drawApple = (ctx: CanvasRenderingContext2D, fx: number, fy: number) => {
    const cx = fx + CELL / 2;
    const cy = fy + CELL / 2 + 1;
    const r = CELL / 2 - 3;
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#b91c1c";
    ctx.beginPath();
    ctx.arc(cx - 2, cy - 1, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#4d7c0f";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, fy + 4);
    ctx.lineTo(cx + 2, fy + 1);
    ctx.stroke();
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.ellipse(cx + 3, fy + 3, 4, 2.5, Math.PI / 5, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawSnake = (ctx: CanvasRenderingContext2D, snake: { x: number; y: number }[], dx: number, dy: number) => {
    snake.forEach((seg, i) => {
      const x = seg.x * CELL;
      const y = seg.y * CELL;
      const isHead = i === 0;
      const isTail = i === snake.length - 1;

      if (isHead) {
        ctx.fillStyle = "#15803d";
      } else {
        ctx.fillStyle = i % 2 === 0 ? "#22c55e" : "#16a34a";
      }

      ctx.beginPath();
      const pad = isHead ? 1 : isTail ? 3 : 2;
      const r = isHead ? 6 : isTail ? 3 : 4;
      ctx.roundRect(x + pad, y + pad, CELL - pad * 2, CELL - pad * 2, r);
      ctx.fill();

      if (isHead) {
        const eyeOffset = 4;
        const eyeR = 2.5;
        let ex1, ey1, ex2, ey2;
        if (dx === 1) { ex1 = x + CELL - 5; ey1 = y + eyeOffset; ex2 = x + CELL - 5; ey2 = y + CELL - eyeOffset; }
        else if (dx === -1) { ex1 = x + 5; ey1 = y + eyeOffset; ex2 = x + 5; ey2 = y + CELL - eyeOffset; }
        else if (dy === -1) { ex1 = x + eyeOffset; ey1 = y + 5; ex2 = x + CELL - eyeOffset; ey2 = y + 5; }
        else { ex1 = x + eyeOffset; ey1 = y + CELL - 5; ex2 = x + CELL - eyeOffset; ey2 = y + CELL - 5; }
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(ex1!, ey1!, eyeR, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex2!, ey2!, eyeR, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#111";
        ctx.beginPath(); ctx.arc(ex1!, ey1!, 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex2!, ey2!, 1.2, 0, Math.PI * 2); ctx.fill();
      }
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    let food = { x: 15, y: 15 };
    let dx = 1, dy = 0;
    let nextDx = 1, nextDy = 0;
    let animationId: number;
    let lastTime = 0;
    let localScore = 0;
    const speed = 130;

    const spawnFood = () => {
      let nx = 0, ny = 0;
      do {
        nx = Math.floor(Math.random() * COLS);
        ny = Math.floor(Math.random() * ROWS);
      } while (snake.some(s => s.x === nx && s.y === ny));
      food = { x: nx, y: ny };
    };

    spawnFood();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","w","a","s","d"].includes(e.key)) e.preventDefault();
      if ((e.key === "ArrowUp" || e.key === "w") && dy !== 1) { nextDx = 0; nextDy = -1; }
      if ((e.key === "ArrowDown" || e.key === "s") && dy !== -1) { nextDx = 0; nextDy = 1; }
      if ((e.key === "ArrowLeft" || e.key === "a") && dx !== 1) { nextDx = -1; nextDy = 0; }
      if ((e.key === "ArrowRight" || e.key === "d") && dx !== -1) { nextDx = 1; nextDy = 0; }
    };

    window.addEventListener("keydown", handleKeyDown);

    const gameLoop = (time: number) => {
      animationId = requestAnimationFrame(gameLoop);
      if (time - lastTime < speed) return;
      lastTime = time;

      dx = nextDx; dy = nextDy;
      const head = { x: snake[0].x + dx, y: snake[0].y + dy };

      if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS || snake.some(s => s.x === head.x && s.y === head.y)) {
        cancelAnimationFrame(animationId);
        const hs = Math.max(localScore, parseInt(localStorage.getItem("snake_high") || "0"));
        localStorage.setItem("snake_high", String(hs));
        setHighScore(hs);
        addPlay("snake", localScore);
        setGameOver(true);
        return;
      }

      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        localScore += 10;
        setScore(localScore);
        spawnFood();
      } else {
        snake.pop();
      }

      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, W, H);

      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          ctx.fillStyle = (c + r) % 2 === 0 ? "#f1f5f9" : "#e2e8f0";
          ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
        }
      }

      drawApple(ctx, food.x * CELL, food.y * CELL);
      drawSnake(ctx, snake, dx, dy);
    };

    animationId = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      cancelAnimationFrame(animationId);
    };
  }, [gameOver, addPlay]);

  const restart = useCallback(() => {
    setScore(0);
    setGameOver(false);
  }, []);

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex gap-8 text-lg font-bold text-foreground">
        <div>スコア: {score}</div>
        <div className="text-muted-foreground">最高: {highScore}</div>
      </div>
      <div className="relative">
        <canvas ref={canvasRef} width={W} height={H} className="border-2 border-border rounded-xl shadow-md" />
        {gameOver && (
          <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center rounded-xl">
            <h2 className="text-3xl font-black text-destructive mb-2">ゲームオーバー</h2>
            <p className="text-xl font-bold text-foreground mb-1">スコア: {score}</p>
            <p className="text-sm text-muted-foreground mb-6">最高スコア: {highScore}</p>
            <Button onClick={restart} size="lg" className="rounded-full px-8">もう一度</Button>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">矢印キー / WASD で操作</p>
    </div>
  );
}
