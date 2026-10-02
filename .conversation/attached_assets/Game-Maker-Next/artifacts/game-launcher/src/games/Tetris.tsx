import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const COLS = 10, ROWS = 20, CELL = 28;

// Classic Tetris colors
const COLORS = [
  "",
  "#00f0f0", // I - Cyan
  "#f0f000", // O - Yellow
  "#a000f0", // T - Purple
  "#00f000", // S - Green
  "#f00000", // Z - Red
  "#0000f0", // J - Blue
  "#f0a000", // L - Orange
];

const BORDER_COLORS = [
  "",
  "#00d0d0", "#d0d000", "#8000d0", "#00d000", "#d00000", "#0000d0", "#d09000",
];

const PIECES = [
  [],
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]], // O
  [[0,3,0],[3,3,3],[0,0,0]], // T
  [[0,4,4],[4,4,0],[0,0,0]], // S
  [[5,5,0],[0,5,5],[0,0,0]], // Z
  [[6,0,0],[6,6,6],[0,0,0]], // J
  [[0,0,7],[7,7,7],[0,0,0]], // L
];

const PIECE_NAMES = ["", "I", "O", "T", "S", "Z", "J", "L"];

function rotate(shape: number[][]): number[][] {
  const h = shape.length, w = shape[0].length;
  return Array.from({ length: w }, (_, i) =>
    Array.from({ length: h }, (_, j) => shape[h - 1 - j][i])
  );
}

function empty(): number[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function valid(board: number[][], shape: number[][], px: number, py: number) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nr = py + r, nc = px + c;
      if (nr >= ROWS || nc < 0 || nc >= COLS || (nr >= 0 && board[nr][nc])) return false;
    }
  }
  return true;
}

function place(board: number[][], shape: number[][], px: number, py: number): number[][] {
  const b = board.map(r => [...r]);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c] && py + r >= 0) b[py + r][px + c] = shape[r][c];
  return b;
}

function clearLines(board: number[][]): [number[][], number] {
  const kept = board.filter(r => r.some(c => !c));
  const cleared = ROWS - kept.length;
  const newRows = Array.from({ length: cleared }, () => Array(COLS).fill(0));
  return [[...newRows, ...kept], cleared];
}

function randPiece() { return PIECES[Math.floor(Math.random() * 7) + 1]; }

const SCORE_TABLE = [0, 100, 300, 500, 800];

function drawBeveledCell(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, borderColor: string) {
  const pad = 1;
  const s = size - pad * 2;
  // Main body
  ctx.fillStyle = color;
  ctx.fillRect(x + pad, y + pad, s, s);
  // Bevel highlight (top-left)
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillRect(x + pad, y + pad, s, 3);
  ctx.fillRect(x + pad, y + pad, 3, s);
  // Bevel shadow (bottom-right)
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(x + pad, y + pad + s - 3, s, 3);
  ctx.fillRect(x + pad + s - 3, y + pad, 3, s);
  // Inner bright
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(x + pad + 3, y + pad + 3, s - 6, s - 6);
}

function drawMiniPiece(ctx: CanvasRenderingContext2D, shape: number[][], x: number, y: number, cell: number) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        drawBeveledCell(ctx, x + c * cell, y + r * cell, cell, COLORS[shape[r][c]], BORDER_COLORS[shape[r][c]]);
      }
    }
  }
}

export default function Tetris() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [bestScore, setBestScore] = useState(() => parseInt(localStorage.getItem("tetris_hs") || "0"));
  const { addPlay } = useGameHistory();

  const startGame = useCallback(() => {
    setScore(0); setLines(0); setLevel(1); setGameOver(false); setStarted(true);
  }, []);

  useEffect(() => {
    if (!started || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    let board = empty();
    let shape = randPiece();
    let next = randPiece();
    let hold: number[][] | null = null;
    let canHold = true;
    let px = Math.floor((COLS - shape[0].length) / 2);
    let py = -shape.length;
    let totalScore = 0, totalLines = 0, lv = 1;
    let animId: number;
    let lastDrop = 0;
    const getSpeed = () => Math.max(80, 500 - (lv - 1) * 45);

    const drawBoard = () => {
      // Background
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Board border
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2;
      ctx.strokeRect(8, 8, COLS * CELL + 4, ROWS * CELL + 4);

      // Grid lines (subtle)
      ctx.strokeStyle = "rgba(148,163,184,0.15)";
      ctx.lineWidth = 1;
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath(); ctx.moveTo(10, 10 + r * CELL); ctx.lineTo(10 + COLS * CELL, 10 + r * CELL); ctx.stroke();
      }
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath(); ctx.moveTo(10 + c * CELL, 10); ctx.lineTo(10 + c * CELL, 10 + ROWS * CELL); ctx.stroke();
      }
    };

    const draw = () => {
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          if (board[r][c])
            drawBeveledCell(ctx, 10 + c * CELL, 10 + r * CELL, CELL, COLORS[board[r][c]], BORDER_COLORS[board[r][c]]);

      // Ghost piece
      let ghostY = py;
      while (valid(board, shape, px, ghostY + 1)) ghostY++;
      if (ghostY !== py) {
        for (let r = 0; r < shape.length; r++)
          for (let c = 0; c < shape[r].length; c++)
            if (shape[r][c] && ghostY + r >= 0) {
              ctx.fillStyle = "rgba(100,100,100,0.15)";
              ctx.fillRect(10 + (px + c) * CELL + 1, 10 + (ghostY + r) * CELL + 1, CELL - 2, CELL - 2);
              ctx.strokeStyle = "rgba(100,100,100,0.25)";
              ctx.lineWidth = 1;
              ctx.strokeRect(10 + (px + c) * CELL + 1, 10 + (ghostY + r) * CELL + 1, CELL - 2, CELL - 2);
            }
      }

      // Active piece
      for (let r = 0; r < shape.length; r++)
        for (let c = 0; c < shape[r].length; c++)
          if (shape[r][c] && py + r >= 0)
            drawBeveledCell(ctx, 10 + (px + c) * CELL, 10 + (py + r) * CELL, CELL, COLORS[shape[r][c]], BORDER_COLORS[shape[r][c]]);
    };

    const drawSidebar = () => {
      const sx = 10 + COLS * CELL + 20;
      const sw = 110;

      // Next piece box
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(sx, 10, sw, 90);
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, 10, sw, 90);
      ctx.fillStyle = "#475569";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("NEXT", sx + sw / 2, 26);
      drawMiniPiece(ctx, next, sx + sw / 2 - (next[0].length * 16) / 2, 36, 16);

      // Hold piece box
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(sx, 110, sw, 90);
      ctx.strokeRect(sx, 110, sw, 90);
      ctx.fillStyle = "#475569";
      ctx.fillText("HOLD", sx + sw / 2, 126);
      if (hold) {
        drawMiniPiece(ctx, hold, sx + sw / 2 - (hold[0].length * 16) / 2, 136, 16);
      } else {
        ctx.fillStyle = "#cbd5e1";
        ctx.font = "11px sans-serif";
        ctx.fillText("C to hold", sx + sw / 2, 156);
      }

      // Stats
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(sx, 210, sw, 140);
      ctx.strokeRect(sx, 210, sw, 140);
      const stats = [
        ["SCORE", totalScore.toLocaleString()],
        ["LINES", String(totalLines)],
        ["LEVEL", String(lv)],
        ["BEST", bestScore.toLocaleString()],
      ];
      stats.forEach(([label, val], i) => {
        const y = 232 + i * 32;
        ctx.fillStyle = "#64748b";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(label, sx + 8, y);
        ctx.fillStyle = "#1e293b";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(String(val), sx + sw - 8, y + 14);
      });
    };

    const render = (ts: number) => {
      animId = requestAnimationFrame(render);
      if (ts - lastDrop > getSpeed()) {
        lastDrop = ts;
        if (valid(board, shape, px, py + 1)) {
          py++;
        } else {
          if (py < 0) { cancelAnimationFrame(animId); addPlay("tetris", totalScore); setGameOver(true); setStarted(false); return; }
          board = place(board, shape, px, py);
          const [nb, cleared] = clearLines(board);
          board = nb;
          if (cleared) {
            const pts = SCORE_TABLE[cleared] * lv;
            totalScore += pts; totalLines += cleared;
            lv = Math.floor(totalLines / 10) + 1;
            setScore(totalScore); setLines(totalLines); setLevel(lv);
            if (totalScore > bestScore) {
              setBestScore(totalScore);
              localStorage.setItem("tetris_hs", String(totalScore));
            }
          }
          shape = next; next = randPiece();
          px = Math.floor((COLS - shape[0].length) / 2); py = -shape.length;
          canHold = true;
        }
      }

      drawBoard();
      draw();
      drawSidebar();
    };

    const onKey = (e: KeyboardEvent) => {
      const prevent = ["ArrowLeft","ArrowRight","ArrowDown","ArrowUp"," "];
      if (prevent.includes(e.key)) e.preventDefault();
      if (e.key === "ArrowLeft" && valid(board, shape, px - 1, py)) px--;
      if (e.key === "ArrowRight" && valid(board, shape, px + 1, py)) px++;
      if (e.key === "ArrowDown") { if (valid(board, shape, px, py + 1)) { py++; totalScore += 1; setScore(totalScore); } }
      if (e.key === "ArrowUp" || e.key === "x") {
        const t = rotate(shape);
        if (valid(board, t, px, py)) shape = t;
      }
      if (e.key === " ") { while (valid(board, shape, px, py + 1)) py++; lastDrop = ts - getSpeed(); }
      if (e.key.toLowerCase() === "c" && canHold) {
        if (!hold) {
          hold = shape;
          shape = next; next = randPiece();
        } else {
          const tmp = hold; hold = shape; shape = tmp;
        }
        px = Math.floor((COLS - shape[0].length) / 2); py = -shape.length;
        canHold = false;
      }
    };

    let ts = 0;
    document.addEventListener("keydown", onKey);
    animId = requestAnimationFrame((t) => { ts = t; render(t); });
    return () => { cancelAnimationFrame(animId); document.removeEventListener("keydown", onKey); };
  }, [started, gameOver, addPlay, bestScore]);

  const canvasWidth = 10 + COLS * CELL + 20 + 110 + 10;
  const canvasHeight = 10 + ROWS * CELL + 10;

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase font-bold">SCORE</p>
          <p className="text-2xl font-black text-slate-700 leading-none">{score.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase font-bold">LINES</p>
          <p className="text-2xl font-black text-blue-500 leading-none">{lines}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase font-bold">LEVEL</p>
          <p className="text-2xl font-black text-orange-500 leading-none">{level}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase font-bold">BEST</p>
          <p className="text-lg font-bold text-muted-foreground leading-none">{bestScore.toLocaleString()}</p>
        </div>
      </div>

      <div className="relative">
        <canvas ref={canvasRef} width={canvasWidth} height={canvasHeight} className="border-2 border-border rounded-xl shadow-lg" style={{ background: "#f8fafc" }} />
        {!started && (
          <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center rounded-xl">
            <div className="text-6xl mb-3">🔷</div>
            <h2 className="text-4xl font-black text-slate-800 mb-2">テトリス</h2>
            <div className="text-slate-500 text-sm mb-1 space-y-0.5 text-center">
              <p>←→ 移勘 / ↑ 回転 / ↓ ソフトドロップ</p>
              <p>スペース ハードドロップ / C ホールド</p>
            </div>
            <Button onClick={startGame} size="lg" className="rounded-full px-10 mt-4">スタート！</Button>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center rounded-xl">
            <div className="text-6xl mb-3">🔷</div>
            <h2 className="text-3xl font-black text-slate-800 mb-2">ゲームオーバー</h2>
            <p className="text-slate-600 text-xl font-bold mb-1">{score.toLocaleString()} pts</p>
            {score >= bestScore && score > 0 && <p className="text-yellow-500 font-bold mb-4">🌟 ハイスコア更新！</p>}
            <Button onClick={startGame} size="lg" className="rounded-full px-10">もう一度</Button>
          </div>
        )}
      </div>
    </div>
  );
}
