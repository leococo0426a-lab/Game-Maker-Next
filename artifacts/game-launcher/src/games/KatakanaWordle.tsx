import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const KATAKANA = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
const WORDS = ["サカナ", "キッチン", "ハサミ", "コンピュータ", "スマホ", "メガネ", "テレビ", "カメラ", "イヌ", "ネコ", "ユキ", "カラオケ", "ピザ", "ラーメン", "タクシー", "ドライブ", "フライパン", "キッズ", "ショッピング", "サッカー", "テニス", "ダンス", "メモ", "エアコン", "パソコン", "ラジオ", "レストラン", "ホテル", "マッサージ", "ブック"];

function getWord() { return WORDS[Math.floor(Math.random() * WORDS.length)]; }

export default function KatakanaWordle() {
  const [target, setTarget] = useState(getWord());
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const { addPlay } = useGameHistory();

  const reset = useCallback(() => {
    setTarget(getWord()); setGuesses([]); setCurrent(""); setWon(false); setLost(false);
  }, []);

  const handleKey = (k: string) => {
    if (won || lost || current.length >= 5) return;
    setCurrent(c => c + k);
  };

  const backspace = () => setCurrent(c => c.slice(0, -1));

  const submit = () => {
    if (current.length !== 5) return;
    const newGuesses = [...guesses, current];
    setGuesses(newGuesses);
    setCurrent("");
    if (current === target) { setWon(true); addPlay("katakana-wordle", 7 - newGuesses.length); }
    else if (newGuesses.length >= 6) { setLost(true); addPlay("katakana-wordle", 0); }
  };

  const getColor = (g: string, i: number) => {
    const c = g[i];
    if (target[i] === c) return "bg-green-500 text-white border-green-500";
    if (target.includes(c)) return "bg-yellow-500 text-white border-yellow-500";
    return "bg-slate-300 text-slate-500 border-slate-300";
  };

  const getKeyColor = (k: string) => {
    for (const g of guesses) {
      for (let i = 0; i < 5; i++) {
        if (g[i] === k) {
          if (target[i] === k) return "bg-green-500 text-white";
          if (target.includes(k)) return "bg-yellow-500 text-white";
          return "bg-slate-300 text-slate-500";
        }
      }
    }
    return "bg-white text-foreground hover:bg-muted";
  };

  const keys = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";

  return (
    <div className="flex flex-col items-center space-y-4 max-w-sm mx-auto">
      <div className="space-y-1">
        {guesses.map((g, r) => (
          <div key={r} className="flex gap-1">
            {[...Array(5)].map((_, c) => (
              <div key={c} className={`w-12 h-12 border-2 rounded-lg flex items-center justify-center text-xl font-black transition-all ${getColor(g, c)}`}>{g[c]}</div>
            ))}
          </div>
        ))}
        {!won && !lost && (
          <div className="flex gap-1">
            {[...Array(5)].map((_, c) => (
              <div key={c} className={`w-12 h-12 border-2 rounded-lg flex items-center justify-center text-xl font-black transition-all ${current[c] ? "border-primary bg-primary/5" : "border-border bg-white text-foreground"}`}>{current[c] || ""}</div>
            ))}
          </div>
        )}
      </div>
      {won && <p className="text-xl font-black text-green-600">正解！🎉</p>}
      {lost && <p className="text-xl font-black text-red-600">残念... 正解: {target}</p>}
      <div className="flex flex-wrap gap-1 justify-center w-full">
        {keys.split("").map((k, ki) => (
          <button key={ki} onClick={() => handleKey(k)} className={`w-8 h-10 rounded-lg border text-sm font-bold transition-all ${getKeyColor(k)}`}>{k}</button>
        ))}
        <button onClick={backspace} className="w-8 h-10 rounded-lg border text-sm font-bold bg-white text-foreground hover:bg-muted">削除</button>
        <button onClick={submit} className="w-8 h-10 rounded-lg border text-sm font-bold bg-white text-foreground hover:bg-muted">⏎</button>
      </div>
      <Button variant="outline" onClick={reset} className="rounded-full">シャッフル</Button>
      <p className="text-xs text-muted-foreground">カタカナ5文字の単語を6回で当てよう！</p>
    </div>
  );
}
