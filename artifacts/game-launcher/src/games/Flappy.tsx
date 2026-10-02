import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export default function Flappy() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Bird
    let birdY = canvas.height / 2;
    let birdVelocity = 0;
    const gravity = 0.5;
    const jump = -8;
    const birdSize = 12;
    const birdX = 50;

    // Pipes
    let pipes: { x: number, y: number, passed: boolean }[] = [];
    const pipeWidth = 50;
    const pipeGap = 130;
    let frames = 0;

    let animationId: number;

    const flap = (e?: KeyboardEvent | MouseEvent | TouchEvent) => {
      if (e && e.type === 'keydown' && (e as KeyboardEvent).code !== 'Space') return;
      if (e) e.preventDefault();
      
      if (!hasStarted) {
        setHasStarted(true);
        return;
      }
      
      if (gameOver) return;
      
      birdVelocity = jump;
    };

    document.addEventListener("keydown", flap);
    canvas.addEventListener("mousedown", flap);
    canvas.addEventListener("touchstart", flap, { passive: false });

    const draw = () => {
      // Clear canvas
      ctx.fillStyle = "#f0f9ff"; // Light blue-white background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Sky clouds (subtle)
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath(); ctx.ellipse(80, 60, 40, 15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(280, 45, 50, 18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(360, 90, 30, 12, 0, 0, Math.PI * 2); ctx.fill();

      if (hasStarted && !gameOver) {
        birdVelocity += gravity;
        birdY += birdVelocity;

        // Generate pipes
        if (frames % 90 === 0) {
          const minY = 50;
          const maxY = canvas.height - pipeGap - 50;
          const pipeY = Math.floor(Math.random() * (maxY - minY + 1)) + minY;
          pipes.push({ x: canvas.width, y: pipeY, passed: false });
        }

        frames++;
      }

      // Draw and update pipes
      for (let i = pipes.length - 1; i >= 0; i--) {
        let p = pipes[i];
        
        if (hasStarted && !gameOver) {
          p.x -= 3; // Pipe speed
        }

        // Top pipe
        ctx.fillStyle = "#16a34a";
        ctx.fillRect(p.x, 0, pipeWidth, p.y);
        ctx.fillStyle = "#15803d";
        ctx.fillRect(p.x - 2, p.y - 20, pipeWidth + 4, 20);
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(p.x + 2, p.y - 18, 4, 4);
        
        // Bottom pipe
        ctx.fillStyle = "#16a34a";
        ctx.fillRect(p.x, p.y + pipeGap, pipeWidth, canvas.height - (p.y + pipeGap));
        ctx.fillStyle = "#15803d";
        ctx.fillRect(p.x - 2, p.y + pipeGap, pipeWidth + 4, 20);
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(p.x + 2, p.y + pipeGap + 2, 4, 4);

        // Collision detection
        if (
          birdX + birdSize > p.x && 
          birdX - birdSize < p.x + pipeWidth && 
          (birdY - birdSize < p.y || birdY + birdSize > p.y + pipeGap)
        ) {
          setGameOver(true);
        }

        // Score tracking
        if (p.x + pipeWidth < birdX && !p.passed) {
          setScore(s => s + 1);
          p.passed = true;
        }

        // Remove off-screen pipes
        if (p.x + pipeWidth < 0) {
          pipes.splice(i, 1);
        }
      }

      // Floor / ceiling collision
      if (birdY + birdSize > canvas.height || birdY - birdSize < 0) {
        setGameOver(true);
      }

      // Draw bird
      ctx.beginPath();
      ctx.arc(birdX, birdY, birdSize, 0, Math.PI * 2);
      ctx.fillStyle = "#fbbf24"; // Yellow
      ctx.fill();
      ctx.closePath();
      
      // Bird eye
      ctx.beginPath();
      ctx.arc(birdX + 4, birdY - 4, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#000";
      ctx.fill();
      ctx.closePath();

      if (!gameOver) {
        animationId = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      document.removeEventListener("keydown", flap);
      canvas.removeEventListener("mousedown", flap);
      canvas.removeEventListener("touchstart", flap);
      cancelAnimationFrame(animationId);
    };
  }, [hasStarted, gameOver]); // Re-run effect when restarting

  const resetGame = () => {
    setScore(0);
    setGameOver(false);
    setHasStarted(false);
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="flex justify-between w-[400px] px-4 text-white text-xl font-bold">
        <div>Score: {score}</div>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={500}
          className="border-2 border-border rounded-lg bg-slate-900 shadow-lg cursor-pointer"
        />
        
        {!hasStarted && !gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-white text-xl animate-pulse font-bold bg-black/50 px-4 py-2 rounded-lg">
              Click or Space to Flap
            </p>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center rounded-lg z-10">
            <h2 className="text-4xl font-bold text-destructive mb-2">Game Over</h2>
            <p className="text-xl text-white mb-6">Final Score: {score}</p>
            <Button onClick={resetGame} size="lg" className="w-32">
              Restart
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
