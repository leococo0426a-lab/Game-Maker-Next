import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const TILE_COLORS: Record<number, { bg: string; text: string; fontSize: string }> = {
  2:    { bg: "#eee4da", text: "#776e65", fontSize: "2rem" },
  4:    { bg: "#ede0c8", text: "#776e65", fontSize: "2rem" },
  8:    { bg: "#f2b179", text: "#f9f6f2", fontSize: "2rem" },
  16:   { bg: "#f59563", text: "#f9f6f2", fontSize: "2rem" },
  32:   { bg: "#f67c5f", text: "#f9f6f2", fontSize: "2rem" },
  64:   { bg: "#f65e3b", text: "#f9f6f2", fontSize: "2rem" },
  128:  { bg: "#edcf72", text: "#f9f6f2", fontSize: "1.75rem" },
  256:  { bg: "#edcc61", text: "#f9f6f2", fontSize: "1.75rem" },
  512:  { bg: "#edc850", text: "#f9f6f2", fontSize: "1.75rem" },
  1024: { bg: "#edc53f", text: "#f9f6f2", fontSize: "1.5rem" },
  2048: { bg: "#edc22e", text: "#f9f6f2", fontSize: "1.5rem" },
  4096: { bg: "#3c3a32", text: "#f9f6f2", fontSize: "1.5rem" },
  8192: { bg: "#3c3a32", text: "#f9f6f2", fontSize: "1.5rem" },
};

const getTileStyle = (val: number) => {
  const style = TILE_COLORS[val];
  if (style) return style;
  return { bg: "#3c3a32", text: "#f9f6f2", fontSize: "1.25rem" };
};

export default function Game2048() {
  const [grid, setGrid] = useState<number[][]>(() => Array(4).fill(null).map(() => Array(4).fill(0)));
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => parseInt(localStorage.getItem("2048_best") || "0"));
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [newTiles, setNewTiles] = useState<Set<string>>(new Set());
  const [mergedTiles, setMergedTiles] = useState<Set<string>>(new Set());
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { addPlay } = useGameHistory();

  const reset = useCallback(() => {
    let newGrid = Array(4).fill(null).map(() => Array(4).fill(0));
    newGrid = addRandomTile(newGrid);
    newGrid = addRandomTile(newGrid);
    setGrid(newGrid);
    setScore(0);
    setGameOver(false);
    setWon(false);
    setNewTiles(new Set());
    setMergedTiles(new Set());
  }, []);

  // Initialize
  useEffect(() => {
    reset();
  }, [reset]);

  const addRandomTile = (currentGrid: number[][]) => {
    let emptyCells: { r: number; c: number }[] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (currentGrid[r][c] === 0) emptyCells.push({ r, c });
      }
    }
    if (emptyCells.length === 0) return currentGrid;
    const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const newGrid = currentGrid.map(row => [...row]);
    newGrid[r][c] = Math.random() < 0.9 ? 2 : 4;
    return newGrid;
  };

  const moveLeft = (currentGrid: number[][]): { newGrid: number[][]; moved: boolean; scoreIncrease: number; merged: Set<string> } => {
    let moved = false;
    let scoreIncrease = 0;
    const merged = new Set<string>();
    const newGrid = currentGrid.map((row, ri) => {
      let newRow = row.filter(val => val !== 0);
      for (let i = 0; i < newRow.length - 1; i++) {
        if (newRow[i] === newRow[i + 1]) {
          newRow[i] *= 2;
          scoreIncrease += newRow[i];
          merged.add(`${ri}-${i}`);
          newRow.splice(i + 1, 1);
        }
      }
      while (newRow.length < 4) newRow.push(0);
      if (newRow.join(",") !== row.join(",")) moved = true;
      return newRow;
    });
    return { newGrid, moved, scoreIncrease, merged };
  };

  const rotateRight = (matrix: number[][]) => {
    const result = [];
    for (let c = 0; c < 4; c++) {
      const newRow = [];
      for (let r = 3; r >= 0; r--) newRow.push(matrix[r][c]);
      result.push(newRow);
    }
    return result;
  };

  const handleMove = useCallback((direction: string) => {
    if (gameOver) return;

    let resultGrid = grid;
    let moved = false;
    let scoreIncrease = 0;
    let merged = new Set<string>();

    if (direction === "left") {
      const res = moveLeft(grid);
      resultGrid = res.newGrid; moved = res.moved; scoreIncrease = res.scoreIncrease; merged = res.merged;
    } else if (direction === "right") {
      let g = rotateRight(rotateRight(grid));
      const res = moveLeft(g);
      resultGrid = rotateRight(rotateRight(res.newGrid));
      moved = res.moved; scoreIncrease = res.scoreIncrease;
    } else if (direction === "up") {
      let g = rotateRight(rotateRight(rotateRight(grid)));
      const res = moveLeft(g);
      resultGrid = rotateRight(res.newGrid);
      moved = res.moved; scoreIncrease = res.scoreIncrease;
    } else if (direction === "down") {
      let g = rotateRight(grid);
      const res = moveLeft(g);
      resultGrid = rotateRight(rotateRight(rotateRight(res.newGrid)));
      moved = res.moved; scoreIncrease = res.scoreIncrease;
    }

    if (moved) {
      const nextGrid = addRandomTile(resultGrid);
      setGrid(nextGrid);
      const newScore = score + scoreIncrease;
      setScore(newScore);
      if (newScore > bestScore) {
        setBestScore(newScore);
        localStorage.setItem("2048_best", String(newScore));
      }

      // Check for 2048 win
      let has2048 = false;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (nextGrid[r][c] === 2048) has2048 = true;
        }
      }
      if (has2048 && !won) {
        setWon(true);
        addPlay("2048", newScore);
      }

      // Check game over
      let canMove = false;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (nextGrid[r][c] === 0) canMove = true;
          if (c < 3 && nextGrid[r][c] === nextGrid[r][c + 1]) canMove = true;
          if (r < 3 && nextGrid[r][c] === nextGrid[r + 1][c]) canMove = true;
        }
      }
      if (!canMove) {
        setGameOver(true);
        addPlay("2048", newScore);
      }
    }
  }, [grid, gameOver, score, bestScore, won, addPlay]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        const map: Record<string, string> = {
          ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down"
        };
        handleMove(map[e.key]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleMove]);

  const handleTouchStart = useRef<{ x: number; y: number } | null>(null);

  return (
    <div className="flex flex-col items-center justify-center space-y-5 max-w-md mx-auto p-4 select-none">
      {/* Header */}
      <div className="flex justify-between items-center w-full">
        <div>
          <h2 className="text-5xl font-black text-[#776e65] tracking-tight">2048</h2>
          <p className="text-sm text-[#776e65]">矢印キーでタイルを合体させよう</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-[#bbada0] px-3 py-2 rounded-md text-center min-w-[70px]">
            <p className="text-[11px] text-[#eee4da] uppercase tracking-wider font-bold">SCORE</p>
            <p className="text-xl font-black text-white leading-none">{score}</p>
          </div>
          <div className="bg-[#bbada0] px-3 py-2 rounded-md text-center min-w-[70px]">
            <p className="text-[11px] text-[#eee4da] uppercase tracking-wider font-bold">BEST</p>
            <p className="text-xl font-black text-white leading-none">{bestScore}</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-between w-full">
        <Button size="sm" onClick={reset} className="rounded-md bg-[#8f7a66] hover:bg-[#7f6a56] text-white font-bold text-sm px-4">
          新しいゲーム
        </Button>
      </div>

      {/* Board */}
      <div
        className="relative bg-[#bbada0] p-3 rounded-lg w-full aspect-square touch-none"
        onTouchStart={(e) => {
          const touch = e.touches[0];
          handleTouchStart.current = { x: touch.clientX, y: touch.clientY };
        }}
        onTouchEnd={(e) => {
          if (!handleTouchStart.current) return;
          const touch = e.changedTouches[0];
          const dx = touch.clientX - handleTouchStart.current.x;
          const dy = touch.clientY - handleTouchStart.current.y;
          const minSwipe = 30;
          if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > minSwipe) {
            handleMove(dx > 0 ? "right" : "left");
          } else if (Math.abs(dy) > minSwipe) {
            handleMove(dy > 0 ? "down" : "up");
          }
          handleTouchStart.current = null;
        }}
      >
        {/* Background grid cells */}
        <div className="grid grid-cols-4 gap-3 w-full h-full">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={`bg-${i}`} className="bg-[#cdc1b4] rounded-md aspect-square" />
          ))}
        </div>

        {/* Tiles overlay */}
        <div className="absolute inset-3 grid grid-cols-4 gap-3">
          {grid.map((row, r) =>
            row.map((cell, c) => {
              if (cell === 0) return <div key={`${r}-${c}`} className="aspect-square" />;
              const style = getTileStyle(cell);
              return (
                <div
                  key={`${r}-${c}`}
                  className="flex items-center justify-center rounded-md aspect-square font-black shadow-sm transition-all duration-100"
                  style={{
                    backgroundColor: style.bg,
                    color: style.text,
                    fontSize: style.fontSize,
                    animation: newTiles.has(`${r}-${c}`) ? "pop 0.15s ease-out" : undefined,
                  }}
                >
                  {cell}
                </div>
              );
            })
          )}
        </div>

        {/* Game Over overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-[#f9f6f2]/85 flex flex-col items-center justify-center rounded-lg z-10">
            <h3 className="text-4xl font-black text-[#776e65] mb-2">ゲームオーバー</h3>
            <p className="text-lg text-[#776e65] mb-2">スコア: {score}</p>
            <Button size="lg" onClick={reset} className="rounded-md bg-[#8f7a66] hover:bg-[#7f6a56] text-white font-bold px-6">
              もう一度プレイ
            </Button>
          </div>
        )}

        {/* Win overlay */}
        {won && !gameOver && (
          <div className="absolute inset-0 bg-[#f9f6f2]/75 flex flex-col items-center justify-center rounded-lg z-10">
            <h3 className="text-4xl font-black text-[#edc22e] mb-2">2048 達成！</h3>
            <p className="text-lg text-[#776e65] mb-4">スコア: {score}</p>
            <div className="flex gap-2">
              <Button size="lg" onClick={reset} className="rounded-md bg-[#8f7a66] hover:bg-[#7f6a56] text-white font-bold px-6">
                新しいゲーム
              </Button>
              <Button size="lg" variant="outline" onClick={() => setWon(false)} className="rounded-md font-bold px-6">
                続ける
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Touch controls for mobile */}
      <div className="flex flex-col items-center gap-1 md:hidden">
        <button onClick={() => handleMove("up")} className="w-16 h-16 bg-[#8f7a66] text-white rounded-xl text-2xl font-bold active:bg-[#7f6a56]">↑</button>
        <div className="flex gap-1">
          <button onClick={() => handleMove("left")} className="w-16 h-16 bg-[#8f7a66] text-white rounded-xl text-2xl font-bold active:bg-[#7f6a56]">←</button>
          <button onClick={() => handleMove("down")} className="w-16 h-16 bg-[#8f7a66] text-white rounded-xl text-2xl font-bold active:bg-[#7f6a56]">↓</button>
          <button onClick={() => handleMove("right")} className="w-16 h-16 bg-[#8f7a66] text-white rounded-xl text-2xl font-bold active:bg-[#7f6a56]">→</button>
        </div>
      </div>

      <p className="text-[#776e65] text-sm text-center">
        <kbd className="bg-[#cdc1b4] px-2 py-1 rounded text-xs font-bold text-[#776e65]">←↑→↓</kbd> でタイルを移動 / 同じ数字で合体！
      </p>

      <style>{`
        @keyframes pop {
          0% { transform: scale(0); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
