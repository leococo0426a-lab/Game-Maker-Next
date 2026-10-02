import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const MAP_SIZE = 8;
const TILES = ["森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森", "森"];

function generateMap() {
  const map = Array(MAP_SIZE).fill(null).map(() => Array(MAP_SIZE).fill("森"));
  let x = 0, y = 0;
  map[y][x] = "目";
  for (let i = 0; i < 20; i++) {
    const dir = Math.random() < 0.5 ? (Math.random() < 0.5 ? [1,0] : [-1,0]) : (Math.random() < 0.5 ? [0,1] : [0,-1]);
    x = Math.max(0, Math.min(MAP_SIZE - 1, x + dir[0]));
    y = Math.max(0, Math.min(MAP_SIZE - 1, y + dir[1]));
    map[y][x] = "道";
  }
  map[y][x] = "宝";
  map[0][0] = "目";

  for (let i = 0; i < 5; i++) {
    const rx = Math.floor(Math.random() * MAP_SIZE);
    const ry = Math.floor(Math.random() * MAP_SIZE);
    if (map[ry][rx] === "森") map[ry][rx] = "敵";
  }
  for (let i = 0; i < 3; i++) {
    const rx = Math.floor(Math.random() * MAP_SIZE);
    const ry = Math.floor(Math.random() * MAP_SIZE);
    if (map[ry][rx] === "森") map[ry][rx] = "薬";
  }
  return map;
}

export default function Dungeon() {
  const [map, setMap] = useState(() => generateMap());
  const [player, setPlayer] = useState({ x: 0, y: 0 });
  const [hp, setHp] = useState(100);
  const [gold, setGold] = useState(0);
  const [message, setMessage] = useState("ダンジョンの宝を探せ！");
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set(["0,0"]));
  const { addPlay } = useGameHistory();

  const reveal = useCallback((x: number, y: number) => {
    setRevealed(prev => new Set([...prev, `${x},${y}`]));
  }, []);

  const move = (dx: number, dy: number) => {
    if (gameOver || won) return;
    const nx = player.x + dx, ny = player.y + dy;
    if (nx < 0 || nx >= MAP_SIZE || ny < 0 || ny >= MAP_SIZE) return;

    const tile = map[ny][nx];
    reveal(nx, ny);

    if (tile === "敵") {
      const damage = Math.floor(Math.random() * 20) + 10;
      setHp(h => {
        const nh = h - damage;
        if (nh <= 0) { setGameOver(true); setMessage("敵に倒された..."); addPlay("dungeon", gold); }
        return nh;
      });
      setMessage(`敵に攻撃された！ -${damage}HP`);
      const newMap = map.map(r => [...r]);
      newMap[ny][nx] = "道";
      setMap(newMap);
      setGold(g => g + 20);
    } else if (tile === "薬") {
      setHp(h => Math.min(100, h + 30));
      setMessage("回復薬を見つけた！ +30HP");
      const newMap = map.map(r => [...r]);
      newMap[ny][nx] = "道";
      setMap(newMap);
    } else if (tile === "宝") {
      setGold(g => g + 100);
      setWon(true);
      setMessage("🎉 宝を見つけた！");
      addPlay("dungeon", gold + 100);
    } else {
      setMessage("前進した...");
    }

    setPlayer({ x: nx, y: ny });
  };

  const reset = () => {
    const newMap = generateMap();
    setMap(newMap);
    setPlayer({ x: 0, y: 0 });
    setHp(100);
    setGold(0);
    setMessage("ダンジョンの宝を探せ！");
    setGameOver(false);
    setWon(false);
    setRevealed(new Set(["0,0"]));
  };

  const tileEmoji: Record<string, string> = { "森": "🌳", "道": "🟩", "目": "👁️", "宝": "💎", "敵": "👹", "薬": "🧪" };

  return (
    <div className="flex flex-col items-center space-y-4 max-w-sm mx-auto">
      <div className="flex justify-between w-full px-2">
        <div className="text-center"><p className="text-xs text-muted-foreground font-bold">HP</p><p className={`text-2xl font-black ${hp < 30 ? "text-red-600" : ""}`}>{hp}</p></div>
        <div className="text-center"><p className="text-xs text-muted-foreground font-bold">金</p><p className="text-2xl font-black text-amber-600">{gold}</p></div>
      </div>
      <p className="font-bold text-sm text-center">{message}</p>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${MAP_SIZE}, 1fr)` }}>
        {map.map((row, y) => row.map((tile, x) => {
          const isPlayer = player.x === x && player.y === y;
          const isRevealed = revealed.has(`${x},${y}`);
          return (
            <div key={`${x}-${y}`} className={`w-8 h-8 rounded-md flex items-center justify-center text-sm border ${isPlayer ? "bg-primary text-primary-foreground border-primary" : isRevealed ? "bg-green-100 border-green-300" : "bg-slate-800 border-slate-700"}`}>
              {isPlayer ? "🧙" : isRevealed ? tileEmoji[tile] || "🟩" : "❓"}
            </div>
          );
        }))}
      </div>
      <div className="grid grid-cols-3 gap-1 w-32">
        <div />
        <Button onClick={() => move(0, -1)} className="rounded-lg h-10 w-10 p-0">↑</Button>
        <div />
        <Button onClick={() => move(-1, 0)} className="rounded-lg h-10 w-10 p-0">←</Button>
        <Button onClick={() => move(0, 1)} className="rounded-lg h-10 w-10 p-0">↓</Button>
        <Button onClick={() => move(1, 0)} className="rounded-lg h-10 w-10 p-0">→</Button>
      </div>
      {won && <p className="text-xl font-black text-green-600">クリア！</p>}
      <Button variant="outline" onClick={reset} className="rounded-full">リセット</Button>
      <p className="text-xs text-muted-foreground">矢印で移動して、宝を探そう！敵に気をつけよ！</p>
    </div>
  );
}
