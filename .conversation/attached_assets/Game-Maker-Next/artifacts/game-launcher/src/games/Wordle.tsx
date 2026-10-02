import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const WORDS = ["apple","brave","chest","dance","eagle","flame","grant","house","input","juice","knife","light","magic","north","ocean","plant","queen","river","stone","tiger","ultra","voice","water","xerox","yacht","zebra","angel","birth","cable","daily","early","fairy","giant","happy","ideal","japan","karma","laser","maybe","night","opera","party","quick","radio","solar","table","unity","value","witch","youth","zilch","above","basic","chair","depth","ended","fixed","great","hotel","index","known","lower","mayor","noble","often","power","quite","reach","small","trace","under","video","whole","extra","young","zones","award","blank","clear","dream","event","front","green","heart","image","jokes","kinds","large","means","moved","noted","other","pilot","quiet","rapid","speed","think","usual","valid","weeks","xenon","years"];

const TARGET_WORDS = WORDS.filter(w => w.length === 5);
const VALID_WORDS = new Set(WORDS);

type LetterState = "correct" | "present" | "absent" | "empty" | "tbd";
type Row = { letters: string[]; states: LetterState[] };

function getRandomWord() { return TARGET_WORDS[Math.floor(Math.random() * TARGET_WORDS.length)].toUpperCase(); }

const STATE_COLORS: Record<LetterState, string> = {
  correct: "bg-green-500 border-green-500 text-white",
  present: "bg-yellow-500 border-yellow-500 text-white",
  absent: "bg-slate-600 border-slate-600 text-white",
  tbd: "bg-white border-border text-foreground animate-[pop_0.1s]",
  empty: "bg-white border-border text-foreground",
};

const KEY_COLORS: Record<string, string> = {};

export default function Wordle() {
  const [target, setTarget] = useState(getRandomWord);
  const [rows, setRows] = useState<Row[]>(Array(6).fill(null).map(() => ({ letters: [], states: [] as LetterState[] })));
  const [currentRow, setCurrentRow] = useState(0);
  const [currentInput, setCurrentInput] = useState<string[]>([]);
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">("playing");
  const [keyStates, setKeyStates] = useState<Record<string, LetterState>>({});
  const [message, setMessage] = useState("");
  const { addPlay } = useGameHistory();

  const showMsg = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(""), 1500); };

  const evaluate = useCallback((guess: string): LetterState[] => {
    const result: LetterState[] = Array(5).fill("absent");
    const targetArr = target.split("");
    const guessArr = guess.split("");
    const used = Array(5).fill(false);
    for (let i = 0; i < 5; i++) if (guessArr[i] === targetArr[i]) { result[i] = "correct"; used[i] = true; }
    for (let i = 0; i < 5; i++) {
      if (result[i] === "correct") continue;
      const j = targetArr.findIndex((c, k) => c === guessArr[i] && !used[k]);
      if (j !== -1) { result[i] = "present"; used[j] = true; }
    }
    return result;
  }, [target]);

  const submitGuess = useCallback(() => {
    if (currentInput.length !== 5) { showMsg("5文字入力してください"); return; }
    const guess = currentInput.join("");
    if (!VALID_WORDS.has(guess.toLowerCase())) { showMsg("単語が見つかりません"); return; }
    const states = evaluate(guess);
    const newRows = [...rows];
    newRows[currentRow] = { letters: currentInput, states };
    setRows(newRows);
    const newKeys = { ...keyStates };
    currentInput.forEach((l, i) => {
      const cur = newKeys[l];
      if (cur !== "correct") { if (states[i] === "correct" || (!cur && states[i] === "present")) newKeys[l] = states[i]; else if (!cur) newKeys[l] = "absent"; }
    });
    setKeyStates(newKeys);
    if (guess === target) { setGameState("won"); addPlay("wordle"); showMsg("素晴らしい！"); }
    else if (currentRow === 5) { setGameState("lost"); addPlay("wordle"); showMsg(target); }
    else { setCurrentRow(r => r + 1); setCurrentInput([]); }
  }, [currentInput, currentRow, evaluate, rows, target, keyStates, addPlay]);

  const handleKey = useCallback((key: string) => {
    if (gameState !== "playing") return;
    if (key === "Enter") { submitGuess(); return; }
    if (key === "Backspace" || key === "Delete") { setCurrentInput(prev => prev.slice(0, -1)); return; }
    if (/^[A-Za-z]$/.test(key) && currentInput.length < 5) setCurrentInput(prev => [...prev, key.toUpperCase()]);
  }, [gameState, submitGuess, currentInput]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => handleKey(e.key);
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [handleKey]);

  const reset = () => {
    setTarget(getRandomWord());
    setRows(Array(6).fill(null).map(() => ({ letters: [], states: [] as LetterState[] })));
    setCurrentRow(0); setCurrentInput([]); setGameState("playing"); setKeyStates({});
  };

  const KEYBOARD = [["Q","W","E","R","T","Y","U","I","O","P"],["A","S","D","F","G","H","J","K","L"],["Enter","Z","X","C","V","B","N","M","⌫"]];

  return (
    <div className="flex flex-col items-center space-y-4 max-w-sm mx-auto">
      <h2 className="text-2xl font-black text-foreground">Wordle</h2>
      {message && <div className="bg-foreground text-background px-4 py-2 rounded-xl text-sm font-bold">{message}</div>}
      <div className="grid grid-rows-6 gap-1.5">
        {rows.map((row, ri) => (
          <div key={ri} className="flex gap-1.5">
            {Array(5).fill(null).map((_, ci) => {
              const isCurrent = ri === currentRow;
              const letter = isCurrent ? currentInput[ci] : row.letters[ci];
              const state: LetterState = isCurrent ? (letter ? "tbd" : "empty") : (row.states[ci] || "empty");
              return (
                <div key={ci} className={`w-14 h-14 border-2 flex items-center justify-center text-2xl font-black rounded-md transition-all ${STATE_COLORS[state]}`}>
                  {letter || ""}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="space-y-1.5 w-full">
        {KEYBOARD.map((row, i) => (
          <div key={i} className="flex justify-center gap-1">
            {row.map(key => {
              const letter = key === "⌫" ? "Backspace" : key;
              const state = keyStates[key];
              const base = state === "correct" ? "bg-green-500 text-white" : state === "present" ? "bg-yellow-500 text-white" : state === "absent" ? "bg-slate-400 text-white" : "bg-slate-200 text-foreground";
              return (
                <button key={key} onClick={() => handleKey(letter)}
                  className={`${base} rounded-md font-bold text-xs h-10 transition-colors ${key.length > 1 ? "px-2 min-w-[52px]" : "w-9"}`}>
                  {key}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {gameState !== "playing" && <Button onClick={reset} className="rounded-full px-8">もう一度</Button>}
    </div>
  );
}
