import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const WORD_LISTS = [
  ["apple", "banana", "cherry", "dragon", "eagle", "forest", "garden", "harbor", "island", "jungle"],
  ["kingdom", "lemon", "mountain", "nature", "orange", "palace", "queen", "river", "sunset", "tiger"],
  ["umbrella", "village", "water", "xylophone", "yellow", "zebra", "ancient", "bridge", "castle", "desert"],
  ["elephant", "flower", "galaxy", "horizon", "imagine", "journey", "kitchen", "lantern", "marble", "noble"],
  ["ocean", "purple", "quiet", "rainbow", "silver", "thunder", "unique", "voyage", "winter", "youth"],
];

const GAME_DURATION = 60;

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function getWords() {
  return shuffle(WORD_LISTS.flat());
}

export default function TypingTest() {
  const [words, setWords] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [wordIdx, setWordIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const { addPlay } = useGameHistory();

  const init = useCallback(() => {
    const ws = getWords();
    setWords(ws);
    setCurrent("");
    setWordIdx(0);
    setCorrect(0);
    setIncorrect(0);
    setTimeLeft(GAME_DURATION);
    setRunning(false);
    setDone(false);
    clearInterval(timerRef.current);
  }, []);

  useEffect(() => { init(); }, [init]);

  const start = () => {
    setRunning(true);
    inputRef.current?.focus();
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setRunning(false);
          setDone(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (done) addPlay("typing", correct);
  }, [done, correct, addPlay]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!running) return;
    const val = e.target.value;
    if (val.endsWith(" ")) {
      const typed = val.trim();
      if (typed === words[wordIdx]) { setCorrect(c => c + 1); }
      else { setIncorrect(c => c + 1); }
      setWordIdx(i => i + 1);
      setCurrent("");
    } else {
      setCurrent(val);
    }
  };

  const wpm = done ? Math.round((correct / GAME_DURATION) * 60) : Math.round((correct / (GAME_DURATION - timeLeft || 1)) * 60);
  const accuracy = correct + incorrect > 0 ? Math.round((correct / (correct + incorrect)) * 100) : 100;
  const progressColor = timeLeft > 30 ? "bg-green-500" : timeLeft > 15 ? "bg-yellow-500" : "bg-red-500";

  const displayWords = words.slice(wordIdx, wordIdx + 12);

  return (
    <div className="flex flex-col items-center space-y-5 max-w-xl mx-auto w-full p-4">
      <div className="flex justify-between w-full">
        <div className="text-center">
          <p className="text-xs text-muted-foreground font-bold uppercase">WPM</p>
          <p className="text-3xl font-black text-foreground">{running || done ? wpm : "—"}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground font-bold uppercase">正解</p>
          <p className="text-3xl font-black text-green-600">{correct}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground font-bold uppercase">残り</p>
          <p className="text-3xl font-black text-foreground">{timeLeft}s</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground font-bold uppercase">精度</p>
          <p className="text-3xl font-black text-foreground">{accuracy}%</p>
        </div>
      </div>

      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${progressColor}`}
          style={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }} />
      </div>

      {!done ? (
        <>
          <div className="w-full bg-muted/50 border border-border rounded-xl p-4 min-h-[80px] flex flex-wrap gap-2">
            {displayWords.map((word, i) => (
              <span key={`${wordIdx + i}-${word}`}
                className={`text-lg font-mono px-1 rounded ${i === 0 ? "bg-primary/20 text-primary font-bold border-b-2 border-primary" : "text-foreground"}`}>
                {word}
              </span>
            ))}
          </div>

          <input
            ref={inputRef}
            value={current}
            onChange={handleInput}
            disabled={!running}
            placeholder={running ? "スペースで次の単語へ..." : "スタートをクリック！"}
            className={`
              w-full border-2 rounded-xl px-4 py-3 text-lg font-mono outline-none transition-colors
              ${current && words[wordIdx]?.startsWith(current) ? "border-green-400 bg-green-50" : current ? "border-red-400 bg-red-50" : "border-border bg-background"}
            `}
            onKeyDown={e => { if (e.key === " ") e.stopPropagation(); }}
          />

          {!running && (
            <Button onClick={start} size="lg" className="rounded-full px-10 text-lg font-bold w-full">
              スタート！
            </Button>
          )}
        </>
      ) : (
        <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-8 text-center w-full">
          <h3 className="text-2xl font-black text-foreground mb-4">結果</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-border">
              <p className="text-sm text-muted-foreground font-bold">WPM</p>
              <p className="text-4xl font-black text-primary">{wpm}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-border">
              <p className="text-sm text-muted-foreground font-bold">精度</p>
              <p className="text-4xl font-black text-green-600">{accuracy}%</p>
            </div>
          </div>
          <Button onClick={init} size="lg" className="rounded-full px-8 w-full">もう一度</Button>
        </div>
      )}
    </div>
  );
}
