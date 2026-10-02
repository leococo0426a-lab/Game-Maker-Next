import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const SECTIONS = [20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];

function getScore(x: number, y: number): { score: number; label: string } {
  const dist = Math.sqrt(x*x + y*y);
  if (dist <= 6.35) return { score: 50, label: "ブル！" };
  if (dist <= 15.9) return { score: 25, label: "アウターブル" };
  const angle = Math.atan2(y, x) * 180 / Math.PI;
  const normalized = ((angle + 99) % 360);
  const idx = Math.floor(normalized / 18) % 20;
  const section = SECTIONS[idx];
  if (dist <= 107) return { score: section * 3, label: `トリプル ${section}` };
  if (dist <= 120) return { score: section, label: `${section}` };
  if (dist <= 160) return { score: section * 2, label: `ダブル ${section}` };
  return { score: 0, label: "ミス" };
}

type Throw = { x: number; y: number; score: number; label: string };

export default function Darts() {
  const [throws, setThrows] = useState<Throw[]>([]);
  const [remaining, setRemaining] = useState(301);
  const [round, setRound] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [message, setMessage] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { addPlay } = useGameHistory();

  const RADIUS = 120;

  const drawBoard = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const cx = canvas.width / 2, cy = canvas.height / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const colors = ["#1a1a1a", "#f5f5dc"];
    SECTIONS.forEach((_, i) => {
      const a1 = (i * 18 - 99) * Math.PI / 180, a2 = ((i+1) * 18 - 99) * Math.PI / 180;
      [160, 120, 107].forEach((r, ri) => {
        ctx.fillStyle = ri % 2 === 0 ? colors[i%2===0?0:1] : (i%2===0?"#dc2626":"#16a34a");
        ctx.beginPath(); ctx.moveTo(cx, cy);
        const innerR = ri === 0 ? 0 : [107, 120][ri-1];
        if (innerR > 0) { ctx.arc(cx, cy, innerR, a2, a1, true); ctx.lineTo(cx + Math.cos(a1)*r, cy + Math.sin(a1)*r); }
        ctx.arc(cx, cy, r, a1, a2);
        ctx.closePath(); ctx.fill();
      });
    });

    ctx.fillStyle = "#16a34a"; ctx.beginPath(); ctx.arc(cx, cy, 15.9, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#dc2626"; ctx.beginPath(); ctx.arc(cx, cy, 6.35, 0, Math.PI*2); ctx.fill();

    ctx.strokeStyle = "#333"; ctx.lineWidth = 0.5;
    SECTIONS.forEach((_, i) => { const a = (i * 18 - 99) * Math.PI / 180; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a)*160, cy + Math.sin(a)*160); ctx.stroke(); });
    [6.35,15.9,107,120,160].forEach(r => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke(); });

    ctx.fillStyle = "#fff"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    SECTIONS.forEach((val, i) => {
      const a = ((i + 0.5) * 18 - 99) * Math.PI / 180;
      const r = 145;
      ctx.fillText(String(val), cx + Math.cos(a)*r, cy + Math.sin(a)*r);
    });

    throws.forEach(t => {
      ctx.fillStyle = "#ffdd00";
      ctx.strokeStyle = "#333"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx + t.x, cy + t.y, 4, 0, Math.PI*2);
      ctx.fill(); ctx.stroke();
    });
  }, [throws]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameOver) return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const px = (e.clientX - rect.left) * (canvas.width / rect.width);
    const py = (e.clientY - rect.top) * (canvas.height / rect.height);
    const x = px - cx, y = py - cy;

    const jitter = (Math.random() - 0.5) * 6;
    const fx = x + jitter, fy = y + jitter;

    const { score, label } = getScore(fx, fy);
    const newRemaining = remaining - score;

    if (newRemaining < 0 || newRemaining === 1) { setMessage(`無効！（残り${remaining}）`); return; }
    if (newRemaining === 0) {
      setThrows(prev => [...prev, { x: fx, y: fy, score, label }]);
      setWon(true); setGameOver(true); addPlay("darts", round);
      setMessage(`クリア！ ${round}ラウンドで301!`);
      return;
    }

    const newThrows = [...throws, { x: fx, y: fy, score, label }];
    setThrows(newThrows);
    setRemaining(newRemaining);
    setMessage(`${label} +${score}点 → 残り ${newRemaining}`);
    if (newThrows.length % 3 === 0) setRound(r => r + 1);
  }, [gameOver, remaining, throws, round, addPlay]);

  const reset = () => { setThrows([]); setRemaining(301); setRound(1); setGameOver(false); setWon(false); setMessage(""); };

  return (
    <div className="flex flex-col items-center space-y-3 max-w-sm mx-auto">
      <div className="flex justify-between w-full px-2">
        <div className="text-center"><p className="text-xs text-muted-foreground font-bold">残り</p><p className="text-3xl font-black text-foreground">{remaining}</p></div>
        <div className="text-center"><p className="text-xs text-muted-foreground font-bold">ラウンド</p><p className="text-3xl font-black text-foreground">{round}</p></div>
        <div className="text-center"><p className="text-xs text-muted-foreground font-bold">投数</p><p className="text-3xl font-black text-foreground">{throws.length % 3}/3</p></div>
      </div>
      {message && <p className={`text-sm font-black ${message.includes("クリア") ? "text-green-600" : message.includes("無効") ? "text-red-600" : "text-foreground"}`}>{message}</p>}
      <canvas ref={el => { if (el) { (canvasRef as any).current = el; drawBoard(); } }} width={320} height={320} onClick={handleClick}
        className="rounded-full border-4 border-gray-700 shadow-2xl cursor-crosshair" />
      <p className="text-xs text-muted-foreground">ダーツボードをクリックして投げよう！301からゼロにするゲーム</p>
      <Button variant="outline" onClick={reset} className="rounded-full">リセット</Button>
    </div>
  );
}
