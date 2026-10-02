import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

type Difficulty = "easy" | "normal" | "hard";

const PUZZLES: Record<Difficulty, { puzzle: number[]; solution: number[] }[]> = {
  easy: [{
    puzzle:   [5,3,0,0,7,0,0,0,0,6,0,0,1,9,5,0,0,0,0,9,8,0,0,0,0,6,0,8,0,0,0,6,0,0,0,3,4,0,0,8,0,3,0,0,1,7,0,0,0,2,0,0,0,6,0,6,0,0,0,0,2,8,0,0,0,0,4,1,9,0,0,5,0,0,0,0,8,0,0,7,9],
    solution: [5,3,4,6,7,8,9,1,2,6,7,2,1,9,5,3,4,8,1,9,8,3,4,2,5,6,7,8,5,9,7,6,1,4,2,3,4,2,6,8,5,3,7,9,1,7,1,3,9,2,4,8,5,6,9,6,1,5,3,7,2,8,4,2,8,7,4,1,9,6,3,5,3,4,5,2,8,6,1,7,9]
  }],
  normal: [{
    puzzle:   [0,0,0,2,6,0,7,0,1,6,8,0,0,7,0,0,9,0,1,9,0,0,0,4,5,0,0,8,2,0,1,0,0,0,4,0,0,0,4,6,0,2,9,0,0,0,5,0,0,0,3,0,2,8,0,0,9,3,0,0,0,7,4,0,4,0,0,5,0,0,3,6,7,0,3,0,1,8,0,0,0],
    solution: [4,3,5,2,6,9,7,8,1,6,8,2,5,7,1,4,9,3,1,9,7,8,3,4,5,6,2,8,2,6,1,9,5,3,4,7,3,7,4,6,8,2,9,1,5,9,5,1,7,4,3,6,2,8,5,1,9,3,2,6,8,7,4,2,4,8,9,5,7,1,3,6,7,6,3,4,1,8,2,5,9]
  }],
  hard: [{
    puzzle:   [0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,8,5,0,0,1,0,2,0,0,0,0,0,0,0,5,0,7,0,0,0,0,0,4,0,0,0,1,0,0,0,9,0,0,0,0,0,0,0,5,0,0,0,0,0,0,7,3,0,0,2,0,1,0,0,0,0,0,0,0,0,4,0,0,0,9],
    solution: [9,8,7,6,5,4,3,2,1,2,4,6,1,7,3,9,8,5,3,5,1,9,2,8,7,4,6,1,2,8,5,3,7,6,9,4,6,3,4,8,9,2,1,5,7,7,9,5,4,6,1,8,3,2,5,1,9,2,8,6,4,7,3,4,7,2,3,1,9,5,6,8,8,6,3,7,4,5,2,1,9]
  }]
};

export default function Sudoku() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [puzzleSet] = useState(() => PUZZLES);
  const [puzzleIdx] = useState(0);
  const [userValues, setUserValues] = useState<(number|null)[]>(Array(81).fill(null));
  const [selected, setSelected] = useState<number | null>(null);
  const [errors, setErrors] = useState<Set<number>>(new Set());
  const [solved, setSolved] = useState(false);
  const { addPlay } = useGameHistory();

  const puzzle = puzzleSet[difficulty][puzzleIdx].puzzle;
  const solution = puzzleSet[difficulty][puzzleIdx].solution;
  const isGiven = (i: number) => puzzle[i] !== 0;
  const getValue = (i: number) => isGiven(i) ? puzzle[i] : (userValues[i] || null);

  const setDiff = (d: Difficulty) => { setDifficulty(d); setUserValues(Array(81).fill(null)); setSelected(null); setErrors(new Set()); setSolved(false); };

  const inputNumber = useCallback((n: number) => {
    if (selected === null || isGiven(selected)) return;
    const nv = [...userValues]; nv[selected] = n === 0 ? null : n;
    setUserValues(nv);
    const newErrors = new Set<number>();
    nv.forEach((v, i) => { if (v && !isGiven(i) && v !== solution[i]) newErrors.add(i); });
    setErrors(newErrors);
    const allFilled = nv.every((v, i) => isGiven(i) || v === solution[i]);
    if (allFilled) { setSolved(true); addPlay("sudoku"); }
  }, [selected, userValues, solution, puzzle, addPlay]);

  const r = (i: number) => Math.floor(i / 9);
  const c = (i: number) => i % 9;
  const box = (i: number) => Math.floor(r(i) / 3) * 3 + Math.floor(c(i) / 3);
  const isHighlighted = (i: number) => selected !== null && (r(i) === r(selected) || c(i) === c(selected) || box(i) === box(selected));
  const isSameValue = (i: number) => selected !== null && getValue(i) && getValue(i) === getValue(selected);

  return (
    <div className="flex flex-col items-center space-y-4 max-w-sm mx-auto">
      <div className="flex gap-2">
        {(["easy","normal","hard"] as Difficulty[]).map(d => (
          <Button key={d} size="sm" variant={difficulty === d ? "default" : "outline"} onClick={() => setDiff(d)} className="rounded-full px-4 text-xs">
            {d === "easy" ? "かんたん" : d === "normal" ? "ふつう" : "むずかしい"}
          </Button>
        ))}
      </div>

      <div className="border-2 border-foreground rounded-md overflow-hidden">
        <div className="grid grid-cols-9" style={{ width: 288, height: 288 }}>
          {Array(81).fill(null).map((_, i) => {
            const val = getValue(i);
            const given = isGiven(i);
            const err = errors.has(i);
            const sel = selected === i;
            const hl = isHighlighted(i);
            const same = isSameValue(i);
            let bg = "bg-white";
            if (sel) bg = "bg-blue-200";
            else if (same && val) bg = "bg-blue-100";
            else if (hl) bg = "bg-slate-100";
            const borderR = c(i) % 3 === 2 && c(i) !== 8 ? "border-r-2 border-r-slate-700" : "border-r border-r-slate-300";
            const borderB = r(i) % 3 === 2 && r(i) !== 8 ? "border-b-2 border-b-slate-700" : "border-b border-b-slate-300";
            return (
              <button key={i} onClick={() => setSelected(i)}
                className={`w-8 h-8 flex items-center justify-center text-sm font-bold ${bg} ${borderR} ${borderB}
                  ${err ? "text-red-600" : given ? "text-slate-800" : "text-blue-700"}`}>
                {val || ""}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {[1,2,3,4,5,6,7,8,9,0].map(n => (
          <button key={n} onClick={() => inputNumber(n)}
            className={`w-10 h-10 rounded-xl font-black text-sm border-2 border-border hover:border-primary hover:bg-primary/10 ${n === 0 ? "col-span-1 text-muted-foreground" : ""}`}>
            {n === 0 ? "✕" : n}
          </button>
        ))}
      </div>

      {solved && (
        <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-4 text-center w-full">
          <p className="text-xl font-black text-green-700">クリア！🎉</p>
          <Button onClick={() => setDiff(difficulty)} className="rounded-full px-8 mt-3">もう一度</Button>
        </div>
      )}
    </div>
  );
}
