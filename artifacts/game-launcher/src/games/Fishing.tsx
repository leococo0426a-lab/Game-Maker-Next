import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const FISH_TYPES = [
  { name: "サンマ", emoji: "🐟", points: 10, speed: 1.5, color: "#94a3b8" },
  { name: "タイ", emoji: "🐠", points: 25, speed: 2.2, color: "#3b82f6" },
  { name: "カジキ", emoji: "🐡", points: 50, speed: 3, color: "#f59e0b" },
  { name: "マグロ", emoji: "🐢", points: 100, speed: 4, color: "#ef4444" },
  { name: "タコ", emoji: "🐙", points: 200, speed: 5, color: "#a855f7" },
];

export default function Fishing() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState<"wait" | "bite" | "reel" | "result">("wait");
  const [message, setMessage] = useState("クリックして釣りを始めよう...");
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameOver, setGameOver] = useState(false);
  const { addPlay } = useGameHistory();

  const startGame = useCallback(() => {
    setScore(0); setStarted(true); setGameOver(false); setPhase("wait"); setMessage("クリックして釣りを始めよう..."); setTimeLeft(60);
  }, []);

  useEffect(() => {
    if (!started || gameOver) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { setGameOver(true); addPlay("fishing", score); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [started, gameOver, score, addPlay]);

  const cast = () => {
    if (phase !== "wait") return;
    setPhase("bite");
    setMessage("餌を待っています...");
    const delay = 1000 + Math.random() * 3000;
    setTimeout(() => {
      if (phase === "bite" || phase === "wait") {
        setPhase("reel");
        setMessage("🎯 来た！クリックして巻き上げよう！");
        setTimeout(() => {
          if (phase === "reel") {
            setMessage("遅い... 魚は逃げた");
            setPhase("wait");
          }
        }, 2000);
      }
    }, delay);
  };

  const reel = () => {
    if (phase !== "reel") return;
    const fish = FISH_TYPES[Math.floor(Math.random() * FISH_TYPES.length)];
    const caught = Math.random() > 0.3;
    if (caught) {
      setScore(s => s + fish.points);
      setMessage(`${fish.emoji} ${fish.name}を釣った！ +${fish.points}点`);
    } else {
      setMessage("魚は逃げた...");
    }
    setPhase("result");
    setTimeout(() => { setPhase("wait"); setMessage("クリックして釣りを始めよう..."); }, 1500);
  };

  const handleClick = () => {
    if (phase === "wait") cast();
    else if (phase === "reel") reel();
  };

  return (
    <div className="flex flex-col items-center space-y-4 max-w-sm mx-auto">
      <div className="flex justify-between w-full px-2">
        <div className="text-center"><p className="text-xs text-muted-foreground font-bold">スコア</p><p className="text-2xl font-black">{score}</p></div>
        <div className="text-center"><p className="text-xs text-muted-foreground font-bold">時間</p><p className="text-2xl font-black">{timeLeft}s</p></div>
      </div>

      <div className="relative w-80 h-60 bg-blue-400 rounded-xl border-4 border-blue-600 overflow-hidden cursor-pointer" onClick={handleClick}>
        <div className="absolute inset-0 bg-gradient-to-b from-blue-300 to-blue-600" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-amber-700" />
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-6xl">🎣</div>

        {phase === "bite" && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-4 h-4 bg-white rounded-full animate-ping" />
          </div>
        )}
        {phase === "reel" && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="text-4xl animate-bounce">🎯</div>
          </div>
        )}
        {phase === "result" && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center">
            <p className="text-xl font-black text-white drop-shadow-lg">{message}</p>
          </div>
        )}
        {phase === "wait" && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2">
            <p className="text-sm font-bold text-white/80">{message}</p>
          </div>
        )}
      </div>

      {gameOver ? (
        <div className="text-center space-y-2">
          <p className="text-2xl font-black text-green-600">タイムアップ！</p>
          <p className="text-muted-foreground">合計: {score} 点</p>
          <Button onClick={startGame} className="rounded-full px-8">もう一度</Button>
        </div>
      ) : (
        <Button variant="outline" onClick={startGame} className="rounded-full">リセット</Button>
      )}
      <p className="text-xs text-muted-foreground">クリックして釣りを始め、餌が来たらまたクリックして巻き上げよう！</p>
    </div>
  );
}
