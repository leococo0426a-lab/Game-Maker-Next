import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const NOTES = [
  { time: 1000, lane: 0 }, { time: 1500, lane: 1 }, { time: 2000, lane: 2 }, { time: 2500, lane: 3 },
  { time: 3000, lane: 0 }, { time: 3250, lane: 1 }, { time: 3500, lane: 2 }, { time: 4000, lane: 3 },
  { time: 4500, lane: 1 }, { time: 5000, lane: 0 }, { time: 5500, lane: 2 }, { time: 6000, lane: 3 },
  { time: 6500, lane: 0 }, { time: 7000, lane: 1 }, { time: 7500, lane: 2 }, { time: 8000, lane: 3 },
  { time: 8500, lane: 0 }, { time: 9000, lane: 2 }, { time: 9500, lane: 1 }, { time: 10000, lane: 3 },
];

const LANE_KEYS = ["d", "f", "j", "k"];
const LANE_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b"];

export default function Rhythm() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [judgment, setJudgment] = useState("");
  const startTimeRef = useRef(0);
  const { addPlay } = useGameHistory();

  const startGame = useCallback(() => {
    setScore(0); setCombo(0); setMaxCombo(0); setStarted(true); setGameOver(false); setJudgment("");
  }, []);

  useEffect(() => {
    if (!started || gameOver) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    startTimeRef.current = Date.now();

    const hitNotes = new Set<number>();
    const keysDown = new Set<string>();
    let animId: number;
    let localScore = 0, localCombo = 0, localMaxCombo = 0;

    const handleKey = (e: KeyboardEvent, down: boolean) => {
      const key = e.key.toLowerCase();
      if (!LANE_KEYS.includes(key)) return;
      e.preventDefault();
      if (down && !keysDown.has(key)) {
        keysDown.add(key);
        const lane = LANE_KEYS.indexOf(key);
        const now = Date.now() - startTimeRef.current;
        NOTES.forEach((note, i) => {
          if (hitNotes.has(i) || note.lane !== lane) return;
          const diff = Math.abs(note.time - now);
          if (diff < 150) {
            hitNotes.add(i);
            if (diff < 50) { localScore += 100; setJudgment("PERFECT!"); }
            else if (diff < 100) { localScore += 50; setJudgment("GOOD"); }
            else { localScore += 20; setJudgment("OK"); }
            localCombo++; localMaxCombo = Math.max(localMaxCombo, localCombo);
            setScore(localScore); setCombo(localCombo); setMaxCombo(localMaxCombo);
            setTimeout(() => setJudgment(""), 500);
          }
        });
      } else if (!down) {
        keysDown.delete(key);
      }
    };

    document.addEventListener("keydown", e => handleKey(e, true));
    document.addEventListener("keyup", e => handleKey(e, false));

    const loop = () => {
      animId = requestAnimationFrame(loop);
      const now = Date.now() - startTimeRef.current;
      ctx.fillStyle = "#1a1a2e"; ctx.fillRect(0, 0, 400, 500);

      const laneWidth = 100;
      LANE_KEYS.forEach((_, i) => {
        ctx.fillStyle = keysDown.has(LANE_KEYS[i]) ? LANE_COLORS[i] + "40" : "#16213e";
        ctx.fillRect(i * laneWidth, 0, laneWidth, 500);
        ctx.strokeStyle = "#0f3460"; ctx.strokeRect(i * laneWidth, 0, laneWidth, 500);
      });

      ctx.fillStyle = "#e94560"; ctx.fillRect(0, 420, 400, 5);

      NOTES.forEach((note, i) => {
        if (hitNotes.has(i)) return;
        const y = 420 - (note.time - now) * 0.15;
        if (y < -50 || y > 550) return;
        ctx.fillStyle = LANE_COLORS[note.lane];
        ctx.beginPath(); ctx.roundRect(note.lane * laneWidth + 20, y - 15, 60, 30, 8); ctx.fill();
      });

      ctx.fillStyle = "#fff"; ctx.font = "bold 20px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(`Score: ${localScore}`, 200, 30);
      ctx.fillText(`Combo: ${localCombo}`, 200, 55);
      ctx.fillStyle = "#e94560"; ctx.font = "bold 24px sans-serif";
      ctx.fillText(judgment, 200, 200);

      if (now > 12000) {
        setGameOver(true); addPlay("rhythm", localScore);
        cancelAnimationFrame(animId);
      }
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      document.removeEventListener("keydown", e => handleKey(e, true));
      document.removeEventListener("keyup", e => handleKey(e, false));
    };
  }, [started, gameOver, judgment, addPlay]);

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="flex gap-6 text-foreground font-bold">
        <div>スコア: {score}</div>
        <div className="text-primary">Combo: {combo}</div>
        <div className="text-muted-foreground">Max: {maxCombo}</div>
      </div>
      <div className="relative">
        <canvas ref={canvasRef} width={400} height={500} className="border-2 border-border rounded-xl shadow-lg" style={{ background: "#1a1a2e" }} />
        {!started && (
          <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center rounded-xl">
            <div className="text-5xl mb-3">🎵</div>
            <h2 className="text-2xl font-black text-white mb-2">リズムゲーム</h2>
            <p className="text-slate-400 text-sm mb-1">D F J K キーでタイミングよく打て！</p>
            <p className="text-slate-400 text-sm mb-4">ノートがラインに重なったらキーを押そう</p>
            <Button onClick={startGame} size="lg" className="rounded-full px-8">スタート！</Button>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center rounded-xl">
            <h2 className="text-3xl font-black text-white mb-2">終了！</h2>
            <p className="text-slate-300 mb-1">スコア: {score}</p>
            <p className="text-slate-300 mb-4">Max Combo: {maxCombo}</p>
            <Button onClick={startGame} size="lg" className="rounded-full px-8">もう一度</Button>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {LANE_KEYS.map((k, i) => (
          <div key={i} className="w-16 h-16 rounded-xl border-2 flex items-center justify-center text-xl font-black" style={{ borderColor: LANE_COLORS[i], color: LANE_COLORS[i] }}>
            {k.toUpperCase()}
          </div>
        ))}
      </div>
    </div>
  );
}
