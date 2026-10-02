import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const HOLES = 9;
const GAME_TIME = 30;

export default function WhackAMole() {
  const [active, setActive] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [whacked, setWhacked] = useState<number | null>(null);
  const { addPlay } = useGameHistory();
  const moleTimer = useRef<ReturnType<typeof setTimeout>>();
  const gameTimer = useRef<ReturnType<typeof setInterval>>();
  const localScore = useRef(0);
  const runningRef = useRef(false);

  const showMole = useCallback(() => {
    if (!runningRef.current) return;
    const next = Math.floor(Math.random() * HOLES);
    setActive(next);
    const dur = Math.max(400, 900 - localScore.current * 5);
    moleTimer.current = setTimeout(() => {
      setActive(null);
      showMole();
    }, dur);
  }, []);

  const start = useCallback(() => {
    localScore.current = 0;
    runningRef.current = true;
    setScore(0);
    setTimeLeft(GAME_TIME);
    setDone(false);
    setRunning(true);
    setActive(null);
  }, []);

  useEffect(() => {
    if (!running) return;
    showMole();
    gameTimer.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(gameTimer.current);
          clearTimeout(moleTimer.current);
          runningRef.current = false;
          setRunning(false);
          setActive(null);
          setDone(true);
          addPlay("whackamole", localScore.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      clearInterval(gameTimer.current);
      clearTimeout(moleTimer.current);
    };
  }, [running, addPlay, showMole]);

  const hit = useCallback((i: number) => {
    setActive(prev => {
      if (!runningRef.current || prev !== i) return prev;
      clearTimeout(moleTimer.current);
      localScore.current += 1;
      setScore(localScore.current);
      setWhacked(i);
      setTimeout(() => {
        setWhacked(null);
        showMole();
      }, 150);
      return null;
    });
  }, [showMole]);

  const progressColor = timeLeft > 15 ? "bg-green-500" : timeLeft > 8 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="flex flex-col items-center space-y-5 max-w-sm mx-auto">
      <div className="flex justify-between w-full items-center">
        <div className="text-2xl font-black text-foreground">スコア: {score}</div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground font-bold">残り時間</div>
          <div className="text-2xl font-black text-foreground">{timeLeft}s</div>
        </div>
      </div>

      <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${progressColor}`}
          style={{ width: `${(timeLeft / GAME_TIME) * 100}%` }} />
      </div>

      <div className="grid grid-cols-3 gap-4 w-full">
        {Array.from({ length: HOLES }).map((_, i) => (
          <button key={i} data-testid={`hole-${i}`} onClick={() => hit(i)}
            className={`
              relative aspect-square rounded-2xl border-4 overflow-hidden transition-all duration-150
              ${active === i ? "border-amber-400 bg-amber-50 shadow-lg shadow-amber-200 scale-105" : "border-border bg-muted hover:bg-secondary"}
              ${whacked === i ? "bg-green-100 border-green-400" : ""}
              ${running ? "cursor-pointer" : "cursor-default"}
            `}>
            <span className={`
              absolute inset-0 flex items-center justify-center text-4xl
              transition-all duration-150
              ${active === i ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}
            `}>
              🐹
            </span>
            {whacked === i && (
              <span className="absolute inset-0 flex items-center justify-center text-3xl">✨</span>
            )}
          </button>
        ))}
      </div>

      {!running && !done && (
        <Button onClick={start} size="lg" className="rounded-full px-10 text-lg font-bold">スタート！</Button>
      )}

      {done && (
        <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-6 text-center w-full">
          <h3 className="text-2xl font-black text-green-700 mb-1">終了！</h3>
          <p className="text-4xl font-black text-foreground mb-4">{score} 匹</p>
          <Button onClick={start} size="lg" className="rounded-full px-8 w-full">もう一度</Button>
        </div>
      )}
    </div>
  );
}
