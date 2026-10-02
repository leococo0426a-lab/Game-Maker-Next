import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const COLORS = [
  { name: "赤", bg: "#ef4444", border: "#b91c1c" },
  { name: "青", bg: "#3b82f6", border: "#1d4ed8" },
  { name: "緑", bg: "#22c55e", border: "#15803d" },
  { name: "黄", bg: "#eab308", border: "#a16207" },
  { name: "紫", bg: "#a855f7", border: "#7e22ce" },
  { name: "オレンジ", bg: "#f97316", border: "#c2410c" },
];

const GRID_SIZE = 3;

export default function ReflexTest() {
  const [phase, setPhase] = useState<"ready" | "playing" | "result">("ready");
  const [targetColor, setTargetColor] = useState(COLORS[0]);
  const [grid, setGrid] = useState<{ color: typeof COLORS[0]; id: number }[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [combo, setCombo] = useState(0);
  const [bestScore, setBestScore] = useState(() => parseInt(localStorage.getItem("reflex_best") || "0"));
  const [wrongFlash, setWrongFlash] = useState(false);
  const { addPlay } = useGameHistory();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextId = useRef(0);

  const generateGrid = useCallback((target: typeof COLORS[0]) => {
    const cells: { color: typeof COLORS[0]; id: number }[] = [];
    const total = GRID_SIZE * GRID_SIZE;
    const targetCount = Math.floor(Math.random() * 3) + 2; // 2-4 target cells
    for (let i = 0; i < targetCount; i++) {
      cells.push({ color: target, id: nextId.current++ });
    }
    const otherColors = COLORS.filter(c => c.name !== target.name);
    for (let i = targetCount; i < total; i++) {
      const c = otherColors[Math.floor(Math.random() * otherColors.length)];
      cells.push({ color: c, id: nextId.current++ });
    }
    // Shuffle
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    return cells;
  }, []);

  const startGame = () => {
    setScore(0);
    setCombo(0);
    setTimeLeft(30);
    setPhase("playing");
    const target = COLORS[Math.floor(Math.random() * COLORS.length)];
    setTargetColor(target);
    setGrid(generateGrid(target));
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setPhase("result");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCellClick = (cell: typeof grid[0]) => {
    if (phase !== "playing") return;
    if (cell.color.name === targetColor.name) {
      const newCombo = combo + 1;
      setCombo(newCombo);
      const bonus = Math.floor(newCombo / 5) * 5;
      const newScore = score + 10 + bonus;
      setScore(newScore);
      const nextTarget = COLORS[Math.floor(Math.random() * COLORS.length)];
      setTargetColor(nextTarget);
      setGrid(generateGrid(nextTarget));
    } else {
      setCombo(0);
      setWrongFlash(true);
      setTimeout(() => setWrongFlash(false), 200);
    }
  };

  useEffect(() => {
    if (phase === "result") {
      if (score > bestScore) {
        setBestScore(score);
        localStorage.setItem("reflex_best", String(score));
      }
      addPlay("reflex", score);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  // score/bestScore を deps に入れると、クリックのたびに cleanup が走って
  // clearInterval でタイマーが止まる。phase の変化のみを監視する。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // アンマウント時だけタイマーを確実にクリア
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  if (phase === "ready") {
    return (
      <div className="text-center">
        <div className="text-6xl mb-4">⚡</div>
        <h2 className="text-2xl font-black mb-2">反射神経テスト</h2>
        <p className="text-muted-foreground mb-1 max-w-sm mx-auto">指定された色のボタンを素早くクリック！30秒でどれだけ得点かな？</p>
        <p className="text-sm text-muted-foreground mb-6">コンボで加点！間違えるとリセット</p>
        {bestScore > 0 && <p className="text-sm font-bold text-amber-600 mb-4">最高得点: {bestScore}</p>}
        <Button onClick={startGame} className="rounded-full px-8 text-lg font-bold">スタート</Button>
      </div>
    );
  }

  if (phase === "result") {
    return (
      <div className="text-center">
        <div className="text-6xl mb-4">⚡</div>
        <h2 className="text-2xl font-black mb-2">タイムアップ！</h2>
        <div className="text-5xl font-black text-blue-600 mb-2">{score}</div>
        <p className="text-muted-foreground mb-4">得点</p>
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
    <div className="w-full max-w-md mx-auto">
      {/* HUD */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">得点</p>
          <p className="text-xl font-black">{score}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">コンボ</p>
          <p className="text-xl font-black text-orange-500">{combo}x</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">残り時間</p>
          <p className={`text-xl font-black ${timeLeft <= 5 ? "text-red-500" : ""}`}>{timeLeft}</p>
        </div>
      </div>

      {/* Target */}
      <div className="bg-white rounded-2xl border-2 border-border p-4 mb-4 text-center shadow-sm">
        <p className="text-sm text-muted-foreground mb-2">下の色を探せ！</p>
        <div
          className="w-20 h-20 rounded-xl mx-auto border-4 shadow-lg transition-transform hover:scale-105"
          style={{ backgroundColor: targetColor.bg, borderColor: targetColor.border }}
        />
        <p className="text-lg font-black mt-2" style={{ color: targetColor.border }}>{targetColor.name}</p>
      </div>

      {/* Grid */}
      <div className={`grid grid-cols-3 gap-2 ${wrongFlash ? "animate-pulse" : ""}`}>
        {grid.map(cell => (
          <button
            key={cell.id}
            onClick={() => handleCellClick(cell)}
            className="aspect-square rounded-xl border-2 shadow-md active:scale-95 transition-all hover:brightness-110"
            style={{ backgroundColor: cell.color.bg, borderColor: cell.color.border }}
          />
        ))}
      </div>
    </div>
  );
}
