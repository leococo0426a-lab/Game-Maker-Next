import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

function createSolved() { return [...Array(15).keys()].map(i => i + 1).concat([0]); }

function isSolvable(tiles: number[]) {
  let inv = 0;
  for (let i = 0; i < 16; i++) for (let j = i + 1; j < 16; j++) if (tiles[i] && tiles[j] && tiles[i] > tiles[j]) inv++;
  const row = Math.floor(tiles.indexOf(0) / 4);
  return (inv + row) % 2 === 0;
}

function shuffle() {
  let t = createSolved().sort(() => Math.random() - 0.5);
  while (!isSolvable(t)) t = createSolved().sort(() => Math.random() - 0.5);
  return t;
}

function isSolved(tiles: number[]) { return tiles.every((v, i) => i === 15 ? v === 0 : v === i + 1); }

export default function Puzzle15() {
  const [tiles, setTiles] = useState(shuffle);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(true);
  const { addPlay } = useGameHistory();

  useEffect(() => {
    if (!running || won) return;
    const t = setInterval(() => setTime(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [running, won]);

  const move = useCallback((idx: number) => {
    if (won) return;
    const empty = tiles.indexOf(0);
    const r = Math.floor(idx / 4), c = idx % 4;
    const er = Math.floor(empty / 4), ec = empty % 4;
    if ((Math.abs(r - er) === 1 && c === ec) || (Math.abs(c - ec) === 1 && r === er)) {
      const nt = [...tiles]; [nt[idx], nt[empty]] = [nt[empty], nt[idx]];
      setTiles(nt); setMoves(m => m + 1);
      if (isSolved(nt)) { setWon(true); setRunning(false); addPlay("puzzle15", moves + 1); }
    }
  }, [tiles, won, moves, addPlay]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const empty = tiles.indexOf(0);
      const er = Math.floor(empty / 4), ec = empty % 4;
      let target = -1;
      if (e.key === "ArrowUp" && er < 3) target = empty + 4;
      if (e.key === "ArrowDown" && er > 0) target = empty - 4;
      if (e.key === "ArrowLeft" && ec < 3) target = empty + 1;
      if (e.key === "ArrowRight" && ec > 0) target = empty - 1;
      if (target >= 0) { e.preventDefault(); move(target); }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [move, tiles]);

  const reset = () => { setTiles(shuffle()); setMoves(0); setWon(false); setTime(0); setRunning(true); };

  return (
    <div className="flex flex-col items-center space-y-4 max-w-xs mx-auto">
      <div className="flex gap-8 text-center">
        <div><p className="text-xs text-muted-foreground font-bold uppercase">手数</p><p className="text-2xl font-black">{moves}</p></div>
        <div><p className="text-xs text-muted-foreground font-bold uppercase">時間</p><p className="text-2xl font-black">{time}s</p></div>
      </div>
      <div className="grid grid-cols-4 gap-2 p-3 bg-slate-200 rounded-2xl">
        {tiles.map((val, i) => (
          <button key={i} onClick={() => move(i)}
            className={`w-16 h-16 rounded-xl text-xl font-black transition-all duration-100
              ${val === 0 ? "bg-slate-200" : "bg-white border-2 border-slate-300 hover:bg-primary/10 hover:border-primary shadow-sm"}`}>
            {val !== 0 && val}
          </button>
        ))}
      </div>
      {won ? (
        <div className="text-center space-y-2">
          <p className="text-2xl font-black text-green-600">クリア！🎉</p>
          <p className="text-muted-foreground">{moves}手 / {time}秒</p>
          <Button onClick={reset} className="rounded-full px-8">もう一度</Button>
        </div>
      ) : (
        <Button variant="outline" onClick={reset} className="rounded-full">シャッフル</Button>
      )}
    </div>
  );
}
