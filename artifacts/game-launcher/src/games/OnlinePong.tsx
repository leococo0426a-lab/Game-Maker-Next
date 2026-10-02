import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { useGameHistory } from "@/context/GameHistoryContext";
import { Copy, Check, Send } from "lucide-react";
import InviteModal from "@/components/InviteModal";

const W = 600, H = 400;
const PAD_W = 12, PAD_H = 80, BALL_R = 8, PAD_SPEED = 6;
const MAX_SCORE = 7;

type GameState = {
  bx: number; by: number;
  bdx: number; bdy: number;
  p1y: number; p2y: number;
  p1s: number; p2s: number;
};

export default function OnlinePong() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [myPaddleY, setMyPaddleY] = useState(H / 2 - PAD_H / 2);
  const [oppPaddleY, setOppPaddleY] = useState(H / 2 - PAD_H / 2);
  const [ball, setBall] = useState({ x: W / 2, y: H / 2 });
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<"me" | "opponent" | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const animRef = useRef<number>(0);
  const keysRef = useRef({ up: false, down: false });
  const stateRef = useRef<GameState>({
    bx: W / 2, by: H / 2,
    bdx: 5, bdy: 4,
    p1y: H / 2 - PAD_H / 2,
    p2y: H / 2 - PAD_H / 2,
    p1s: 0, p2s: 0,
  });
  const { addPlay } = useGameHistory();

  const drawFrame = useCallback((ctx: CanvasRenderingContext2D) => {
    const s = stateRef.current;

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, W, H);

    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
    ctx.setLineDash([]);

    // Paddles
    ctx.fillStyle = "#6366f1";
    ctx.beginPath(); ctx.roundRect(20, s.p1y, PAD_W, PAD_H, 6); ctx.fill();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath(); ctx.roundRect(W - 20 - PAD_W, s.p2y, PAD_W, PAD_H, 6); ctx.fill();

    // Ball
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(s.bx, s.by, BALL_R, 0, Math.PI * 2); ctx.fill();

    // Scores
    ctx.fillStyle = "#6366f1";
    ctx.font = "bold 40px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(String(s.p1s), W / 2 - 20, 50);
    ctx.fillStyle = "#ef4444";
    ctx.textAlign = "left";
    ctx.fillText(String(s.p2s), W / 2 + 20, 50);
  }, []);

  const handleMove = useCallback((data: unknown) => {
    const d = data as { type: string; p1y?: number; p2y?: number; bx?: number; by?: number; bdx?: number; bdy?: number; p1s?: number; p2s?: number };
    if (d.type === "paddle" && d.p1y !== undefined) {
      stateRef.current.p1y = d.p1y;
      setMyPaddleY(d.p1y);
    }
    if (d.type === "paddle" && d.p2y !== undefined) {
      stateRef.current.p2y = d.p2y;
      setOppPaddleY(d.p2y);
    }
    if (d.type === "state") {
      if (d.bx !== undefined) { stateRef.current.bx = d.bx; setBall(prev => ({ ...prev, x: d.bx! })); }
      if (d.by !== undefined) { stateRef.current.by = d.by; setBall(prev => ({ ...prev, y: d.by! })); }
      if (d.bdx !== undefined) stateRef.current.bdx = d.bdx;
      if (d.bdy !== undefined) stateRef.current.bdy = d.bdy;
      if (d.p1y !== undefined) { stateRef.current.p1y = d.p1y; setMyPaddleY(d.p1y); }
      if (d.p2y !== undefined) { stateRef.current.p2y = d.p2y; setOppPaddleY(d.p2y); }
      if (d.p1s !== undefined) { stateRef.current.p1s = d.p1s; setMyScore(d.p1s); }
      if (d.p2s !== undefined) { stateRef.current.p2s = d.p2s; setOppScore(d.p2s); }
    }
  }, []);

  const handleStart = useCallback((pid: string, _code: string) => {
    const host = pid === "1";
    setIsHost(host);
    stateRef.current = {
      bx: W / 2, by: H / 2,
      bdx: host ? 5 : 0,
      bdy: host ? (Math.random() - 0.5) * 6 : 0,
      p1y: H / 2 - PAD_H / 2,
      p2y: H / 2 - PAD_H / 2,
      p1s: 0, p2s: 0,
    };
    setMyPaddleY(H / 2 - PAD_H / 2);
    setOppPaddleY(H / 2 - PAD_H / 2);
    setBall({ x: W / 2, y: H / 2 });
    setMyScore(0); setOppScore(0);
    setGameOver(false); setWinner(null);
  }, []);

  const handleOpponentLeft = useCallback(() => {
    setWinner(null);
  }, []);

  const handleGameReset = useCallback(() => {
    const host = isHost;
    stateRef.current = {
      bx: W / 2, by: H / 2,
      bdx: host ? 5 : 0,
      bdy: host ? (Math.random() - 0.5) * 6 : 0,
      p1y: H / 2 - PAD_H / 2,
      p2y: H / 2 - PAD_H / 2,
      p1s: 0, p2s: 0,
    };
    setMyPaddleY(H / 2 - PAD_H / 2);
    setOppPaddleY(H / 2 - PAD_H / 2);
    setBall({ x: W / 2, y: H / 2 });
    setMyScore(0); setOppScore(0);
    setGameOver(false); setWinner(null);
  }, [isHost]);

  const { status, roomCode, joinInput, setJoinInput, error, createRoom, joinRoom, sendMove, sendReset, disconnect } = useMultiplayer({
    gameId: "pong",
    onMove: handleMove,
    onStart: handleStart,
    onOpponentLeft: handleOpponentLeft,
    onGameReset: handleGameReset,
  });

  // Keyboard input
  useEffect(() => {
    if (status !== "playing") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") { keysRef.current.up = true; e.preventDefault(); }
      if (e.key === "ArrowDown") { keysRef.current.down = true; e.preventDefault(); }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") keysRef.current.up = false;
      if (e.key === "ArrowDown") keysRef.current.down = false;
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [status]);

  // Game loop
  useEffect(() => {
    if (status !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const s = stateRef.current;
    let frame = 0;

    const loop = () => {
      animRef.current = requestAnimationFrame(loop);
      frame++;

      // Update own paddle
      if (isHost) {
        if (keysRef.current.up && s.p1y > 0) s.p1y -= PAD_SPEED;
        if (keysRef.current.down && s.p1y < H - PAD_H) s.p1y += PAD_SPEED;
      } else {
        if (keysRef.current.up && s.p2y > 0) s.p2y -= PAD_SPEED;
        if (keysRef.current.down && s.p2y < H - PAD_H) s.p2y += PAD_SPEED;
      }

      // Send paddle position (throttled to ~20fps)
      if (frame % 3 === 0) {
        if (isHost) {
          sendMove({ type: "paddle", p1y: s.p1y });
        } else {
          sendMove({ type: "paddle", p2y: s.p2y });
        }
      }

      // Host handles ball physics
      if (isHost) {
        s.bx += s.bdx; s.by += s.bdy;

        // Wall bounce
        if (s.by < BALL_R || s.by > H - BALL_R) s.bdy = -s.bdy;

        // Paddle bounce
        if (s.bx < PAD_W + 20 + BALL_R && s.by > s.p1y && s.by < s.p1y + PAD_H && s.bdx < 0) {
          s.bdx = Math.abs(s.bdx) * 1.03;
          s.bdy += (s.by - (s.p1y + PAD_H / 2)) * 0.1;
        }
        if (s.bx > W - PAD_W - 20 - BALL_R && s.by > s.p2y && s.by < s.p2y + PAD_H && s.bdx > 0) {
          s.bdx = -Math.abs(s.bdx) * 1.03;
          s.bdy += (s.by - (s.p2y + PAD_H / 2)) * 0.1;
        }
        s.bdx = Math.max(-10, Math.min(10, s.bdx));
        s.bdy = Math.max(-8, Math.min(8, s.bdy));

        // Score
        if (s.bx < 0) {
          s.p2s++;
          setOppScore(s.p2s);
          if (s.p2s >= MAX_SCORE) {
            setWinner("opponent");
            setGameOver(true);
            addPlay("pong");
            return;
          }
          s.bx = W / 2; s.by = H / 2; s.bdx = 5; s.bdy = (Math.random() - 0.5) * 6;
        }
        if (s.bx > W) {
          s.p1s++;
          setMyScore(s.p1s);
          if (s.p1s >= MAX_SCORE) {
            setWinner("me");
            setGameOver(true);
            addPlay("pong");
            return;
          }
          s.bx = W / 2; s.by = H / 2; s.bdx = -5; s.bdy = (Math.random() - 0.5) * 6;
        }

        // Send game state every frame (throttled)
        if (frame % 2 === 0) {
          sendMove({
            type: "state",
            bx: s.bx, by: s.by, bdx: s.bdx, bdy: s.bdy,
            p1y: s.p1y, p2y: s.p2y, p1s: s.p1s, p2s: s.p2s,
          });
        }
      }

      drawFrame(ctx);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [status, isHost, sendMove, drawFrame, addPlay]);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (status === "idle" || status === "error") {
    return (
      <div className="flex flex-col items-center space-y-6 max-w-sm mx-auto p-4">
        <div className="text-center">
          <h2 className="text-2xl font-black text-foreground">オンラインPong</h2>
          <p className="text-sm text-muted-foreground mt-1">友達とリアルタイム卓球対戦！</p>
        </div>
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-sm text-destructive font-bold w-full text-center">{error}</div>
        )}
        <Button onClick={createRoom} className="w-full rounded-full py-5 text-base font-bold">ルームを作成</Button>
        <div className="text-muted-foreground text-sm font-bold">または</div>
        <div className="flex gap-2 w-full">
          <Input value={joinInput} onChange={e => setJoinInput(e.target.value.toUpperCase())}
            placeholder="ルームコードを入力" maxLength={6} className="rounded-xl font-mono text-center text-lg font-bold" />
          <Button onClick={() => joinRoom(joinInput)} disabled={joinInput.length < 4} className="rounded-xl px-4">参加</Button>
        </div>
      </div>
    );
  }

  if (status === "connecting") {
    return <div className="text-center py-10 text-muted-foreground font-bold animate-pulse">接続中...</div>;
  }

  if (status === "waiting") {
    return (
      <div className="flex flex-col items-center space-y-5 max-w-sm mx-auto p-4 text-center">
        <div className="text-5xl animate-bounce">⏳</div>
        <h3 className="text-xl font-black text-foreground">友達を待っています...</h3>
        <p className="text-sm text-muted-foreground">このコードを友達に教えてください</p>
        <div className="flex items-center gap-2 bg-primary/10 border-2 border-primary/30 rounded-xl px-6 py-4">
          <span className="text-3xl font-black font-mono tracking-widest text-primary">{roomCode}</span>
          <button onClick={copyCode} className="ml-2 text-primary hover:text-primary/70 transition-colors">
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
        <Button variant="outline" onClick={() => setInviteOpen(true)} className="rounded-full flex items-center gap-2">
          <Send className="w-4 h-4" />友達を招待
        </Button>
        <Button variant="outline" onClick={disconnect} className="rounded-full">キャンセル</Button>
        {inviteOpen && <InviteModal roomCode={roomCode} gameName="オンラインPong" onClose={() => setInviteOpen(false)} />}
      </div>
    );
  }

  if (status === "ended") {
    return (
      <div className="flex flex-col items-center space-y-4 max-w-sm mx-auto p-4 text-center">
        <div className="text-5xl">😢</div>
        <h3 className="text-xl font-black text-foreground">相手が切断しました</h3>
        <Button onClick={disconnect} className="rounded-full px-8">戻る</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex gap-12 text-sm font-bold text-foreground">
        <span className="text-indigo-600">
          {isHost ? "あなた（左・矢印キー）" : "あなた（右・矢印キー）"}
        </span>
        <span className="text-destructive">{isHost ? "相手（右）" : "相手（左）"}</span>
      </div>
      <div className="relative">
        <canvas ref={canvasRef} width={W} height={H} className="border-2 border-border rounded-xl shadow-md" />
        {gameOver && (
          <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center rounded-xl">
            <h2 className={`text-3xl font-black mb-2 ${winner === "me" ? "text-primary" : "text-destructive"}`}>
              {winner === "me" ? "あなたの勝ち！" : "相手の勝ち..."}
            </h2>
            <p className="text-lg text-muted-foreground mb-6">{myScore} - {oppScore}</p>
            <div className="flex gap-2">
              <Button onClick={() => { sendReset(); handleGameReset(); }} size="lg" className="rounded-full px-8">もう一度</Button>
              <Button variant="outline" onClick={disconnect} className="rounded-full px-6">終了</Button>
            </div>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        ↑↓ キーでパドルを操作 / 先に {MAX_SCORE} 点取ったら勝ち！
      </p>
      {!gameOver && (
        <Button variant="outline" size="sm" onClick={disconnect} className="rounded-full">終了</Button>
      )}
    </div>
  );
}
