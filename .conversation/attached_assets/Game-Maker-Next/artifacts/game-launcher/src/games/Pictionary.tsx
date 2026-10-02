import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const WORDS = [
  "猫", "犬", "鳥", "魚", "花", "木", "太陽", "月", "星", "車",
  "家", "時計", "りんご", "ケーキ", "ハンバーガー", "ピザ", "たこ焼き", "ラーメン", "寿司", "アイス",
  "傘", "椅子", "本", "電話", "テレビ", "自転車", "飛行機", "船", "ロボット", "忍者",
  "UFO", "恐竜", "おばけ", "王子様", "魔女", "海賊", "サンタ", "天使", "ペンギン", "ライオン",
  "熊", "うさぎ", "象", "カエル", "バナナ", "ぶどう", "みかん", "スイカ", "いちご", "チョコ",
];

const COLORS = ["#000000", "#ef4444", "#f97316", "#facc15", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7", "#ec4899", "#8b5cf6"];
const BRUSH_SIZES = [2, 4, 8, 12, 18];

const TOTAL_ROUNDS = 10;
const TIME_LIMIT = 60;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getChoices(correct: string): string[] {
  const pool = WORDS.filter(w => w !== correct);
  const wrong = shuffle(pool).slice(0, 3);
  return shuffle([correct, ...wrong]);
}

export default function Pictionary() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [round, setRound] = useState(0);
  const [word, setWord] = useState("");
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [phase, setPhase] = useState<"drawing" | "answering" | "result">("drawing");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => parseInt(localStorage.getItem("pictionary_hs") || "0"));
  const [choices, setChoices] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [correct, setCorrect] = useState(false);
  const [brushSize, setBrushSize] = useState(4);
  const [color, setColor] = useState("#000000");
  const [isDrawing, setIsDrawing] = useState(false);
  const { addPlay } = useGameHistory();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startRound = useCallback(() => {
    const w = WORDS[Math.floor(Math.random() * WORDS.length)];
    setWord(w);
    setTimeLeft(TIME_LIMIT);
    setPhase("drawing");
    setSelected(null);
    setCorrect(false);
    clearCanvas();
  }, [clearCanvas]);

  const startGame = useCallback(() => {
    setStarted(true);
    setGameOver(false);
    setScore(0);
    setRound(1);
    startRound();
  }, [startRound]);

  // Timer
  useEffect(() => {
    if (phase === "drawing" && started && !gameOver) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Time up - force answer
            setPhase("answering");
            const w = word;
            if (w) setChoices(getChoices(w));
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, started, gameOver, word]);

  // Drawing handlers
  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
    const clientY = "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const onDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    const { x, y } = getPos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  };

  const onMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const { x, y } = getPos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.beginPath();
    // Get last position from canvas (we need to track it)
    // Instead, we'll draw line by tracking
  };

  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPos(e);
    setIsDrawing(true);
    setLastPos(pos);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPos) return;
    const pos = getPos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setLastPos(pos);
  };

  const onMouseUp = () => {
    setIsDrawing(false);
    setLastPos(null);
  };

  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pos = getPos(e);
    setIsDrawing(true);
    setLastPos(pos);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  };

  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing || !lastPos) return;
    const pos = getPos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setLastPos(pos);
  };

  const onTouchEnd = () => {
    setIsDrawing(false);
    setLastPos(null);
  };

  const submitAnswer = () => {
    if (phase !== "drawing") return;
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("answering");
    setChoices(getChoices(word));
  };

  const pickChoice = (choice: string) => {
    if (phase !== "answering") return;
    setSelected(choice);
    const isCorrect = choice === word;
    setCorrect(isCorrect);
    const bonus = Math.max(50, timeLeft * 10);
    if (isCorrect) {
      setScore(prev => prev + bonus);
    }
    setPhase("result");
  };

  const nextRound = () => {
    if (round >= TOTAL_ROUNDS) {
      setGameOver(true);
      setStarted(false);
      if (score > bestScore) {
        setBestScore(score);
        localStorage.setItem("pictionary_hs", String(score));
      }
      addPlay("pictionary", score);
      return;
    }
    setRound(prev => prev + 1);
    startRound();
  };

  // Timer bar color
  const timerColor = timeLeft > 30 ? "bg-green-500" : timeLeft > 10 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="flex flex-col items-center space-y-3 select-none w-full max-w-md">
      {/* Header */}
      <div className="flex items-center gap-4 w-full justify-center">
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase font-bold">SCORE</p>
          <p className="text-2xl font-black text-orange-500 leading-none">{score}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase font-bold">ROUND</p>
          <p className="text-2xl font-black text-blue-500 leading-none">{round}/{TOTAL_ROUNDS}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase font-bold">BEST</p>
          <p className="text-lg font-bold text-muted-foreground leading-none">{bestScore}</p>
        </div>
      </div>

      {!started && !gameOver && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-6 text-center w-full">
          <div className="text-5xl mb-3">🖌️</div>
          <h2 className="text-2xl font-black text-orange-700 mb-2">お絵かきクイズ</h2>
          <p className="text-orange-600 text-sm mb-2">お題に合わせて絵を描き、回答を当てよう！</p>
          <p className="text-orange-500 text-xs mb-4">早く描いて早く回答するほどボーナス！</p>
          <div className="text-xs text-orange-500 mb-4 space-y-1">
            <p>1. お題が表示される</p>
            <p>2. キャンバスに絵を描く</p>
            <p>3. 回答するボタンで確定</p>
            <p>4. 4つの選択肢から正解を選ぶ</p>
          </div>
          <Button onClick={startGame} size="lg" className="rounded-full px-8 bg-orange-500 hover:bg-orange-600">スタート！</Button>
        </div>
      )}

      {gameOver && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-6 text-center w-full">
          <div className="text-5xl mb-3">🖌️</div>
          <h2 className="text-2xl font-black text-orange-700 mb-2">ゲームオーバー</h2>
          <p className="text-orange-600 text-lg mb-1">スコア: {score}</p>
          {score >= bestScore && score > 0 && <p className="text-yellow-500 font-bold mb-3">🌟 ハイスコア更新！</p>}
          <Button onClick={startGame} size="lg" className="rounded-full px-8 bg-orange-500 hover:bg-orange-600">もう一度</Button>
        </div>
      )}

      {started && !gameOver && (
        <>
          {/* Word display */}
          <div className="bg-gradient-to-r from-orange-100 to-amber-100 border-2 border-orange-300 rounded-xl px-6 py-3 w-full text-center">
            <p className="text-xs text-orange-500 font-bold uppercase">お題</p>
            <p className="text-3xl font-black text-orange-700">{word}</p>
          </div>

          {/* Timer */}
          {phase === "drawing" && (
            <div className="w-full">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>残り時間</span>
                <span className="font-bold">{timeLeft}秒</span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${timerColor} transition-all duration-1000`}
                  style={{ width: `${(timeLeft / TIME_LIMIT) * 100}%` }} />
              </div>
            </div>
          )}

          {/* Canvas */}
          {phase === "drawing" && (
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={400}
                height={350}
                className="border-2 border-border rounded-xl shadow cursor-crosshair touch-none"
                style={{ background: "#fff", maxWidth: "100%" }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              />
            </div>
          )}

          {/* Hidden canvas during answer phase */}
          {(phase === "answering" || phase === "result") && (
            <div className="border-2 border-border rounded-xl shadow bg-white w-[400px] h-[350px] max-w-full flex items-center justify-center">
              {phase === "answering" ? (
                <div className="text-center">
                  <div className="text-5xl mb-2">🎭</div>
                  <p className="text-lg font-bold text-muted-foreground">絵は隠されました</p>
                  <p className="text-sm text-muted-foreground">さっきの絵は何だった？</p>
                </div>
              ) : correct ? (
                <div className="text-center">
                  <div className="text-6xl mb-2">🎉</div>
                  <p className="text-2xl font-black text-green-600">正解！</p>
                  <p className="text-sm text-green-500">+{Math.max(50, timeLeft * 10)}ポイント</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-6xl mb-2">😢</div>
                  <p className="text-2xl font-black text-red-500">残念...</p>
                  <p className="text-sm text-muted-foreground">正解: <span className="font-bold text-foreground">{word}</span></p>
                </div>
              )}
            </div>
          )}

          {/* Brush controls - only during drawing */}
          {phase === "drawing" && (
            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center gap-2 justify-center">
                <span className="text-xs text-muted-foreground">色:</span>
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 justify-center">
                <span className="text-xs text-muted-foreground">大きさ:</span>
                {BRUSH_SIZES.map(s => (
                  <button
                    key={s}
                    onClick={() => setBrushSize(s)}
                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${brushSize === s ? "border-foreground bg-muted" : "border-transparent"}`}
                  >
                    <div className="rounded-full bg-foreground" style={{ width: s, height: s }} />
                  </button>
                ))}
              </div>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={clearCanvas}>🗑️ クリア</Button>
                <Button size="sm" onClick={submitAnswer} className="bg-orange-500 hover:bg-orange-600">
                  ✅ 回答する
                </Button>
              </div>
            </div>
          )}

          {/* Choices during answering */}
          {phase === "answering" && (
            <div className="grid grid-cols-2 gap-3 w-full">
              {choices.map(c => (
                <button
                  key={c}
                  onClick={() => pickChoice(c)}
                  className="bg-white border-2 border-orange-200 hover:border-orange-400 rounded-xl py-4 text-lg font-bold text-orange-700 transition-all hover:shadow-md active:scale-95"
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Result */}
          {phase === "result" && (
            <div className="w-full flex flex-col items-center gap-3">
              {correct ? (
                <p className="text-lg font-bold text-green-600">正解！ +{Math.max(50, timeLeft * 10)}ポイント</p>
              ) : (
                <p className="text-lg font-bold text-red-500">残念... 正解は「{word}」</p>
              )}
              <Button onClick={nextRound} size="lg" className="rounded-full px-8 bg-orange-500 hover:bg-orange-600">
                {round >= TOTAL_ROUNDS ? "結果を見る" : "次のお題へ"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
