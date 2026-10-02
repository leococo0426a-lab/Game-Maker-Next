import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const PUZZLES = [
  {
    grid: [
      "#CAT##",
      "#APPLE",
      "R##N##",
      "E##D##",
      "D##O##",
      "######",
    ],
    words: [
      { word: "CAT", row: 0, col: 1, dir: "across", clue: "ネズミを食べる動物" },
      { word: "APPLE", row: 1, col: 1, dir: "across", clue: "赤い果物" },
      { word: "RED", row: 2, col: 0, dir: "down", clue: "赤い" },
    ],
  },
  {
    grid: [
      "#SUN##",
      "#TIGER",
      "U##G##",
      "N##E##",
      "######",
      "######",
    ],
    words: [
      { word: "SUN", row: 0, col: 1, dir: "across", clue: "天から光を透かす" },
      { word: "TIGER", row: 1, col: 1, dir: "across", clue: "森の王" },
      { word: "RUN", row: 0, col: 1, dir: "down", clue: "走る" },
    ],
  },
];

export default function Crossword() {
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [inputs, setInputs] = useState<string[][]>([]);
  const [selected, setSelected] = useState<{row:number;col:number} | null>(null);
  const [showClue, setShowClue] = useState<string | null>(null);
  const [won, setWon] = useState(false);
  const { addPlay } = useGameHistory();

  const puzzle = PUZZLES[puzzleIdx];

  const init = useCallback(() => {
    const grid = puzzle.grid.map(row => row.split("").map(c => c === "#" ? "#" : ""));
    setInputs(grid);
    setSelected(null); setShowClue(null); setWon(false);
  }, [puzzle]);

  const [initialized, setInitialized] = useState(false);
  if (!initialized) { init(); setInitialized(true); }

  const handleClick = (r: number, c: number) => {
    if (puzzle.grid[r][c] === "#") return;
    setSelected({ row: r, col: c });
    const word = puzzle.words.find(w => {
      if (w.dir === "across") return w.row === r && c >= w.col && c < w.col + w.word.length;
      return w.col === c && r >= w.row && r < w.row + w.word.length;
    });
    if (word) setShowClue(word.clue);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    const key = e.key.toUpperCase();
    if (key.length === 1 && key >= "A" && key <= "Z") {
      const newInputs = inputs.map(row => [...row]);
      newInputs[r][c] = key;
      setInputs(newInputs);
      const nextC = c + 1;
      if (nextC < puzzle.grid[0].length && puzzle.grid[r][nextC] !== "#") {
        setSelected({ row: r, col: nextC });
      }
      const allCorrect = puzzle.words.every(w => {
        if (w.dir === "across") {
          return w.word.split("").every((ch, i) => newInputs[w.row][w.col + i] === ch);
        }
        return w.word.split("").every((ch, i) => newInputs[w.row + i][w.col] === ch);
      });
      if (allCorrect) { setWon(true); addPlay("crossword"); }
    } else if (key === "BACKSPACE") {
      const newInputs = inputs.map(row => [...row]);
      newInputs[r][c] = "";
      setInputs(newInputs);
    }
  };

  const nextPuzzle = () => {
    if (puzzleIdx < PUZZLES.length - 1) {
      setPuzzleIdx(p => p + 1);
      setInitialized(false);
    } else {
      setPuzzleIdx(0);
      setInitialized(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 max-w-sm mx-auto">
      <div className="text-center">
        <p className="text-sm font-bold text-muted-foreground">パズル {puzzleIdx + 1}/{PUZZLES.length}</p>
        {showClue && <p className="text-sm font-bold text-primary mt-1">ヒント: {showClue}</p>}
      </div>
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${puzzle.grid[0].length}, 1fr)` }}>
        {puzzle.grid.map((row, r) => row.split("").map((cell, c) => {
          const isSelected = selected?.row === r && selected?.col === c;
          const isBlack = cell === "#";
          const val = inputs[r]?.[c] || "";
          const isCorrect = puzzle.words.some(w => {
            if (w.dir === "across") return w.row === r && c >= w.col && c < w.col + w.word.length && w.word[c - w.col] === val;
            return w.col === c && r >= w.row && r < w.row + w.word.length && w.word[r - w.row] === val;
          });
          return isBlack ? (
            <div key={`${r}-${c}`} className="w-10 h-10 bg-black rounded-sm" />
          ) : (
            <div key={`${r}-${c}`} onClick={() => handleClick(r, c)} className={`w-10 h-10 border-2 rounded-sm flex items-center justify-center text-lg font-bold cursor-pointer transition-all ${isSelected ? "border-primary ring-2 ring-primary/30" : "border-border"} ${isCorrect && val ? "bg-green-100 text-green-700" : "bg-white text-foreground"}`}>
              {val && <span>{val}</span>}
            </div>
          );
        }))}
      </div>
      {won && (
        <div className="text-center space-y-2">
          <p className="text-xl font-black text-green-600">正解！🎉</p>
          <Button onClick={nextPuzzle} className="rounded-full px-8">次のパズル</Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">マスタイプきってヒントを見て、クロスワードを解こう</p>
      <input type="text" className="absolute opacity-0" autoFocus value="" onKeyDown={(e) => selected && handleKey(e, selected.row, selected.col)} />
    </div>
  );
}
