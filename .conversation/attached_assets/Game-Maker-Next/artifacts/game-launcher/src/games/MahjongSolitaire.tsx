import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const TILES = ["一","二","三","四","五","六","七","八","九","東","南","西","北","白","發","中"];

function createBoard() {
  const tiles: { id: number; text: string; layer: number; x: number; y: number; matched: boolean }[] = [];
  let id = 0;
  for (let layer = 0; layer < 3; layer++) {
    const offset = layer * 10;
    const rows = 6 - layer * 2;
    const cols = 10 - layer * 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        tiles.push({ id: id++, text: TILES[Math.floor(id / 4) % TILES.length], layer, x: offset + c * 40, y: offset + r * 50, matched: false });
      }
    }
  }
  return tiles.sort(() => Math.random() - 0.5);
}

export default function MahjongSolitaire() {
  const [board, setBoard] = useState(() => createBoard());
  const [selected, setSelected] = useState<number | null>(null);
  const [time, setTime] = useState(0);
  const [won, setWon] = useState(false);
  const { addPlay } = useGameHistory();

  const isFree = useCallback((tile: typeof board[0]) => {
    if (tile.matched) return false;
    const sameLayer = board.filter(t => t.layer === tile.layer && !t.matched && t.id !== tile.id);
    const leftBlocked = sameLayer.some(t => t.x === tile.x - 40 && t.y === tile.y);
    const rightBlocked = sameLayer.some(t => t.x === tile.x + 40 && t.y === tile.y);
    const topBlocked = board.some(t => t.layer === tile.layer + 1 && !t.matched && Math.abs(t.x - tile.x) < 30 && Math.abs(t.y - tile.y) < 30);
    return (!leftBlocked || !rightBlocked) && !topBlocked;
  }, [board]);

  const handleClick = (tile: typeof board[0]) => {
    if (won || !isFree(tile)) return;
    if (selected === null) { setSelected(tile.id); return; }
    const other = board.find(t => t.id === selected);
    if (!other) { setSelected(tile.id); return; }
    if (other.id === tile.id) { setSelected(null); return; }
    if (other.text === tile.text) {
      setBoard(prev => prev.map(t => t.id === tile.id || t.id === selected ? { ...t, matched: true } : t));
      setSelected(null);
      if (board.filter(t => !t.matched).length <= 2) { setWon(true); addPlay("mahjong"); }
    } else {
      setSelected(tile.id);
    }
  };

  const reset = () => { setBoard(createBoard()); setSelected(null); setTime(0); setWon(false); };

  return (
    <div className="flex flex-col items-center space-y-4 max-w-lg mx-auto">
      <div className="flex justify-between w-full px-2">
        <div className="text-sm font-bold text-muted-foreground">残り: {board.filter(t => !t.matched).length}</div>
        <div className="text-sm font-bold text-muted-foreground">時間: {time}s</div>
      </div>
      <div className="relative bg-green-800 p-4 rounded-xl border-4 border-amber-700 shadow-xl" style={{ width: 420, height: 340 }}>
        {board.map(tile => {
          if (tile.matched) return null;
          const isSel = selected === tile.id;
          const free = isFree(tile);
          return (
            <button key={tile.id} onClick={() => handleClick(tile)}
              className={`absolute w-9 h-11 rounded-md border-2 flex items-center justify-center text-lg font-bold transition-all
                ${isSel ? "bg-amber-300 border-amber-500 scale-105 z-50" : free ? "bg-amber-100 border-amber-300 hover:bg-amber-200 z-10" : "bg-amber-50 border-amber-200 opacity-60 z-0"}`}
              style={{ left: tile.x, top: tile.y, zIndex: tile.layer * 100 + (isSel ? 50 : 0) }}>
              {tile.text}
            </button>
          );
        })}
      </div>
      {won ? (
        <div className="text-center space-y-2">
          <p className="text-2xl font-black text-green-600">クリア！🎉</p>
          <Button onClick={reset} className="rounded-full px-8">もう一度</Button>
        </div>
      ) : (
        <Button variant="outline" onClick={reset} className="rounded-full">シャッフル</Button>
      )}
      <p className="text-xs text-muted-foreground">同じ文字の牌をペアで消していこう！取れる牌は左右に棒がないか、上に重なっていない牌</p>
    </div>
  );
}
