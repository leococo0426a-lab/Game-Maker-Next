import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";

const COLORS = [
  "#000000", "#ffffff", "#ef4444", "#f97316", "#f59e0b", "#84cc16",
  "#22c55e", "#06b6d4", "#3b82f6", "#6366f1", "#a855f7", "#ec4899",
  "#f43f5e", "#78716c", "#94a3b8", "#d97706",
];

export default function Painting() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState<"brush" | "eraser">("brush");
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const saveState = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(imageData);
      return newHistory.slice(-20);
    });
    setHistoryIndex(prev => Math.min(prev + 1, 19));
  }, [historyIndex]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo((e.clientX - rect.left) * (canvas.width / rect.width), (e.clientY - rect.top) * (canvas.height / rect.height));
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d")!;
    ctx.lineTo((e.clientX - rect.left) * (canvas.width / rect.width), (e.clientY - rect.top) * (canvas.height / rect.height));
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) { setIsDrawing(false); saveState(); }
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const newIndex = historyIndex - 1;
    ctx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);
  };

  const clear = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveState();
  };

  const download = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const link = document.createElement("a");
    link.download = "artwork.png"; link.href = canvas.toDataURL(); link.click();
  };

  return (
    <div className="flex flex-col items-center space-y-3 max-w-lg mx-auto">
      <div className="flex flex-wrap gap-1 justify-center">
        {COLORS.map(c => (
          <button key={c} onClick={() => { setColor(c); setTool("brush"); }}
            className={`w-8 h-8 rounded-full border-2 transition-all ${color === c && tool === "brush" ? "border-foreground scale-110" : "border-transparent"}`}
            style={{ backgroundColor: c }} />
        ))}
      </div>
      <div className="flex items-center gap-3 w-full justify-center">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">太さ</span>
          <input type="range" min="1" max="30" value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} className="w-24" />
          <span className="text-xs font-bold w-4">{brushSize}</span>
        </div>
        <Button variant={tool === "eraser" ? "default" : "outline"} size="sm" onClick={() => setTool("eraser")} className="rounded-full">消しゴム</Button>
        <Button variant="outline" size="sm" onClick={undo} className="rounded-full">戻る</Button>
        <Button variant="outline" size="sm" onClick={clear} className="rounded-full">クリア</Button>
        <Button variant="outline" size="sm" onClick={download} className="rounded-full">保存</Button>
      </div>
      <canvas
        ref={canvasRef}
        width={500}
        height={350}
        className="border-2 border-border rounded-xl shadow-md cursor-crosshair bg-white"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      <p className="text-xs text-muted-foreground">マウスで自由にお絵かきができます！</p>
    </div>
  );
}
