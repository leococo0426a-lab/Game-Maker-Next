import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const WORDS = [
  { word: "COMPUTER", hint: "コンピューター" }, { word: "GUITAR", hint: "ギター" },
  { word: "ELEPHANT", hint: "ゾウ" }, { word: "DIAMOND", hint: "ダイヤモンド" },
  { word: "FOREST", hint: "森" }, { word: "PIZZA", hint: "ピザ" },
  { word: "RAINBOW", hint: "虹" }, { word: "DRAGON", hint: "ドラゴン" },
  { word: "OCEAN", hint: "海" }, { word: "MOUNTAIN", hint: "山" },
  { word: "CASTLE", hint: "城" }, { word: "PENGUIN", hint: "ペンギン" },
  { word: "THUNDER", hint: "雷" }, { word: "LIBRARY", hint: "図書館" },
  { word: "VOLCANO", hint: "火山" }, { word: "BUTTERFLY", hint: "蝶" },
];
const MAX_WRONG = 6;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function HangmanSVG({ wrong }: { wrong: number }) {
  return (
    <svg width="140" height="150" viewBox="0 0 140 150" className="mx-auto">
      <line x1="10" y1="145" x2="130" y2="145" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
      <line x1="30" y1="145" x2="30" y2="10" stroke="#64748b" strokeWidth="3" />
      <line x1="30" y1="10" x2="90" y2="10" stroke="#64748b" strokeWidth="3" />
      <line x1="90" y1="10" x2="90" y2="30" stroke="#64748b" strokeWidth="3" />
      {wrong >= 1 && <circle cx="90" cy="43" r="13" stroke="#334155" strokeWidth="2.5" fill="none" />}
      {wrong >= 2 && <line x1="90" y1="56" x2="90" y2="100" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />}
      {wrong >= 3 && <line x1="90" y1="68" x2="65" y2="88" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />}
      {wrong >= 4 && <line x1="90" y1="68" x2="115" y2="88" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />}
      {wrong >= 5 && <line x1="90" y1="100" x2="68" y2="125" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />}
      {wrong >= 6 && <line x1="90" y1="100" x2="112" y2="125" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />}
    </svg>
  );
}

export default function Hangman() {
  const [entry, setEntry] = useState(() => WORDS[Math.floor(Math.random() * WORDS.length)]);
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const { addPlay } = useGameHistory();

  const wrong = [...guessed].filter(l => !entry.word.includes(l)).length;
  const revealed = entry.word.split("").map(l => guessed.has(l) ? l : "_");
  const won = revealed.every(l => l !== "_");
  const lost = wrong >= MAX_WRONG;

  const guess = useCallback((letter: string) => {
    if (won || lost || guessed.has(letter)) return;
    const ng = new Set(guessed); ng.add(letter);
    setGuessed(ng);
    const newRevealed = entry.word.split("").map(l => ng.has(l) ? l : "_");
    if (newRevealed.every(l => l !== "_")) addPlay("hangman");
    else if ([...ng].filter(l => !entry.word.includes(l)).length >= MAX_WRONG) addPlay("hangman");
  }, [entry, guessed, won, lost, addPlay]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (/^[A-Za-z]$/.test(e.key)) guess(e.key.toUpperCase()); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [guess]);

  const reset = () => {
    setEntry(WORDS[Math.floor(Math.random() * WORDS.length)]);
    setGuessed(new Set());
  };

  return (
    <div className="flex flex-col items-center space-y-4 max-w-sm mx-auto p-4">
      <div className="text-center">
        <p className="text-xs text-muted-foreground font-bold uppercase">ヒント</p>
        <p className="text-lg font-black text-foreground">{entry.hint}</p>
      </div>
      <div className="bg-slate-50 border-2 border-border rounded-2xl p-4 w-full">
        <HangmanSVG wrong={wrong} />
        <p className="text-center text-xs text-muted-foreground mt-1">残り {MAX_WRONG - wrong} 回</p>
      </div>
      <div className="flex gap-2 flex-wrap justify-center">
        {revealed.map((l, i) => (
          <div key={i} className="w-9 h-10 border-b-2 border-foreground flex items-end justify-center pb-1">
            <span className="text-xl font-black text-foreground">{l !== "_" ? l : ""}</span>
          </div>
        ))}
      </div>
      {(won || lost) ? (
        <div className={`w-full text-center p-4 rounded-2xl border-2 ${won ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
          <p className={`text-xl font-black mb-1 ${won ? "text-green-700" : "text-red-700"}`}>{won ? "正解！" : `ゲームオーバー: ${entry.word}`}</p>
          <Button onClick={reset} className="rounded-full px-6 mt-2">もう一度</Button>
        </div>
      ) : (
        <div className="grid grid-cols-9 gap-1">
          {ALPHABET.map(l => (
            <button key={l} onClick={() => guess(l)} disabled={guessed.has(l)}
              className={`w-8 h-8 text-xs font-black rounded-md transition-colors
                ${guessed.has(l) ? (entry.word.includes(l) ? "bg-green-200 text-green-800" : "bg-red-100 text-red-400") : "bg-muted hover:bg-primary hover:text-white"}`}>
              {l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
