import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const DISC_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7"];

export default function TowersOfHanoi() {
  const [discCount, setDiscCount] = useState(4);
  const [towers, setTowers] = useState<number[][]>([[3,2,1,0], [], []]);
  const [selectedTower, setSelectedTower] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [minMoves] = useState(15);
  const { addPlay } = useGameHistory();

  const init = useCallback((n: number) => {
    const discs = Array.from({ length: n }, (_, i) => n - 1 - i);
    setTowers([discs, [], []]);
    setSelectedTower(null);
    setMoves(0);
    setWon(false);
  }, []);

  const handleClick = (towerIdx: number) => {
    if (won) return;
    if (selectedTower === null) {
      if (towers[towerIdx].length === 0) return;
      setSelectedTower(towerIdx);
    } else {
      if (selectedTower === towerIdx) { setSelectedTower(null); return; }
      const from = towers[selectedTower];
      const to = towers[towerIdx];
      if (to.length === 0 || from[from.length - 1] < to[to.length - 1]) {
        const nt = towers.map(t => [...t]);
        const disc = nt[selectedTower].pop()!;
        nt[towerIdx].push(disc);
        setTowers(nt);
        setMoves(m => m + 1);
        if (nt[2].length === discCount) { setWon(true); addPlay("towers", moves + 1); }
      }
      setSelectedTower(null);
    }
  };

  const autoSolve = () => {
    const moves: [number, number][] = [];
    const hanoi = (n: number, from: number, aux: number, to: number) => {
      if (n === 0) return;
      hanoi(n - 1, from, to, aux);
      moves.push([from, to]);
      hanoi(n - 1, aux, from, to);
    };
    hanoi(discCount, 0, 1, 2);
    let i = 0;
    const step = () => {
      if (i >= moves.length) return;
      const [f, t] = moves[i];
      setTowers(prev => {
        const nt = prev.map(t => [...t]);
        const disc = nt[f].pop()!;
        nt[t].push(disc);
        return nt;
      });
      setMoves(i + 1);
      i++;
      setTimeout(step, 300);
    };
    step();
  };

  const maxDiscWidth = 200;
  const discHeight = 24;
  const towerHeight = 250;

  return (
    <div className="flex flex-col items-center space-y-4 max-w-lg mx-auto">
      <div className="flex justify-between w-full px-2">
        <div className="text-center"><p className="text-xs text-muted-foreground font-bold">手数</p><p className="text-2xl font-black">{moves}</p></div>
        <div className="text-center"><p className="text-xs text-muted-foreground font-bold">最小</p><p className="text-2xl font-black">{minMoves}</p></div>
        <div className="flex gap-1 items-center">
          {[3,4,5,6,7].map(n => (
            <Button key={n} size="sm" variant={discCount === n ? "default" : "outline"} onClick={() => { setDiscCount(n); init(n); }} className="rounded-full h-7 w-7 p-0 text-xs font-bold">
              {n}
            </Button>
          ))}
        </div>
      </div>

      <div className="relative w-[320px] h-[280px] bg-slate-100 rounded-xl border-2 border-border overflow-hidden">
        {[0, 1, 2].map(ti => (
          <div key={ti} className="absolute bottom-0 flex flex-col items-center justify-end"
            style={{ left: ti * 107, width: 107, height: 280 }}>
            <div className={`w-2 h-[200px] rounded-full ${selectedTower === ti ? "bg-primary" : "bg-slate-400"} transition-colors`} />
            <div className="w-full h-2 bg-slate-500 rounded-full -mt-1" />
            {towers[ti].map((disc, di) => {
              const w = 30 + disc * 25;
              const isTop = di === towers[ti].length - 1;
              return (
                <button key={di} onClick={() => handleClick(ti)} className={`absolute rounded-full border-2 border-white/30 shadow-sm transition-all cursor-pointer hover:brightness-110 ${isTop && selectedTower === ti ? "ring-2 ring-primary scale-105" : ""}`}
                  style={{ bottom: 10 + di * (discHeight - 2), left: 53.5 - w / 2, width: w, height: discHeight, backgroundColor: DISC_COLORS[disc % DISC_COLORS.length], zIndex: 10 }} />
              );
            })}
            <div className="absolute bottom-0 left-0 w-full h-[200px] cursor-pointer" onClick={() => handleClick(ti)} style={{ background: "transparent" }} />
          </div>
        ))}
      </div>

      {won ? (
        <div className="text-center space-y-2">
          <p className="text-2xl font-black text-green-600">クリア！🎉</p>
          <p className="text-muted-foreground">{moves}手 / 最小{minMoves}手</p>
          <div className="flex gap-3">
            <Button onClick={() => init(discCount)} className="rounded-full px-8">もう一度</Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => init(discCount)} className="rounded-full">リセット</Button>
          <Button variant="outline" onClick={autoSolve} className="rounded-full">自動解法</Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">より大きい円盤を移動して、左から右に全部移そう！</p>
    </div>
  );
}
