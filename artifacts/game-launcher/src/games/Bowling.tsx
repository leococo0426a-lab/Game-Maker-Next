import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

type Pin = { x: number; y: number; standing: boolean };

function createPins(): Pin[] {
  const pins: Pin[] = [];
  const startX = 250, startY = 100, spacing = 18;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col <= row; col++) {
      pins.push({
        x: startX - (row * spacing / 2) + col * spacing,
        y: startY + row * spacing * 0.866,
        standing: true
      });
    }
  }
  return pins;
}

export default function Bowling() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pins, setPins] = useState<Pin[]>(createPins);
  const [ballX, setBallX] = useState(250);
  const [ballSpeed, setBallSpeed] = useState(0);
  const [angle, setAngle] = useState(0);
  const [phase, setPhase] = useState<"aim" | "roll" | "result">("aim");
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [frame, setFrame] = useState(1);
  const [throwCount, setThrowCount] = useState(0);
  const [message, setMessage] = useState("");
  const { addPlay } = useGameHistory();

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#d4a574"; ctx.fillRect(0, 0, 500, 300);
    ctx.fillStyle = "#c49a6c"; ctx.fillRect(0, 0, 500, 300);

    const laneGrad = ctx.createLinearGradient(0, 0, 0, 300);
    laneGrad.addColorStop(0, "#d4a574");
    laneGrad.addColorStop(1, "#8B6914");
    ctx.fillStyle = laneGrad;
    ctx.fillRect(150, 0, 200, 300);

    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(150, 0); ctx.lineTo(150, 300); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(350, 0); ctx.lineTo(350, 300); ctx.stroke();

    ctx.fillStyle = "#fff"; ctx.font = "12px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("△", 250, 20);

    pins.forEach(p => {
      if (!p.standing) return;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#c41e3a"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#c41e3a"; ctx.beginPath(); ctx.arc(p.x, p.y - 2, 2, 0, Math.PI * 2); ctx.fill();
    });

    if (phase === "aim") {
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ballX, 260); ctx.lineTo(ballX + Math.sin(angle) * 60, 200); ctx.stroke();
    }

    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(ballX, 260, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ballX - 3, 257, 3, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#333"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "left";
    ctx.fillText(`フレーム ${frame}/10`, 10, 20);
    ctx.textAlign = "right"; ctx.fillText(`合計: ${totalScore}`, 490, 20);
  }, [pins, ballX, angle, phase, frame, totalScore]);

  const roll = () => {
    if (phase !== "aim") return;
    setPhase("roll");
    setBallSpeed(8);
    setMessage("");

    let by = 260;
    const rollInterval = setInterval(() => {
      by -= ballSpeed;
      setBallX(prev => prev + Math.sin(angle) * 2);

      const newPins = pins.map(p => {
        if (!p.standing) return p;
        const dx = ballX - p.x;
        const dy = by - p.y;
        if (Math.sqrt(dx*dx + dy*dy) < 20) return { ...p, standing: false };
        return p;
      });
      setPins(newPins);

      if (by < 50) {
        clearInterval(rollInterval);
        const down = newPins.filter(p => !p.standing).length;
        const newScore = down * 10;
        setScore(newScore);
        setTotalScore(prev => prev + newScore);
        setThrowCount(tc => tc + 1);
        if (down === 10) setMessage("🎉 ストライク！");
        else if (down >= 7) setMessage("いい感じ！");
        else setMessage(`${down}本倒れた`);
        setPhase("result");
        if (frame >= 10 && throwCount >= 1) {
          addPlay("bowling", totalScore + newScore);
        }
      }
    }, 30);
  };

  const nextThrow = () => {
    if (throwCount >= 1 || pins.filter(p => p.standing).length === 0) {
      if (frame >= 10) {
        setMessage(`ゲーム終了！合計: ${totalScore}`);
        setPhase("aim");
        return;
      }
      setFrame(f => f + 1);
      setThrowCount(0);
      setPins(createPins());
    } else {
      setThrowCount(1);
    }
    setBallX(250);
    setAngle(0);
    setPhase("aim");
    setMessage("");
  };

  const reset = () => {
    setPins(createPins()); setBallX(250); setAngle(0); setPhase("aim");
    setScore(0); setTotalScore(0); setFrame(1); setThrowCount(0); setMessage("");
  };

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="flex justify-between w-full max-w-lg px-2">
        <div className="text-center"><p className="text-xs text-muted-foreground font-bold">フレーム</p><p className="text-2xl font-black">{frame}/10</p></div>
        <div className="text-center"><p className="text-xs text-muted-foreground font-bold">合計</p><p className="text-2xl font-black">{totalScore}</p></div>
        <div className="text-center"><p className="text-xs text-muted-foreground font-bold">投球</p><p className="text-2xl font-black">{throwCount + 1}/2</p></div>
      </div>
      {message && <p className="font-black text-lg text-primary">{message}</p>}
      <div className="relative">
        <canvas ref={canvasRef} width={500} height={300} className="border-2 border-border rounded-xl shadow-md" />
        {phase === "aim" && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
            <input type="range" min="-30" max="30" value={angle * 180 / Math.PI} onChange={e => setAngle(Number(e.target.value) * Math.PI / 180)} className="w-32" />
            <Button onClick={roll} className="rounded-full px-6">投球！</Button>
          </div>
        )}
      </div>
      {phase === "result" && (
        <Button onClick={nextThrow} className="rounded-full px-8">次へ →</Button>
      )}
      <Button variant="outline" onClick={reset} className="rounded-full">リセット</Button>
      <p className="text-xs text-muted-foreground">スライダーで角度を調整して投球しよう！</p>
    </div>
  );
}
