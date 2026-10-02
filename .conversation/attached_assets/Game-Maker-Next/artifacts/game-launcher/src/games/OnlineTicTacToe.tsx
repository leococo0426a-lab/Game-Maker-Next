import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { useGameHistory } from "@/context/GameHistoryContext";
import { Copy, Check, Send } from "lucide-react";
import InviteModal from "@/components/InviteModal";

type Player = "X" | "O" | null;
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function checkWinner(board: Player[]): Player {
  for (const [a,b,c] of LINES) if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  return null;
}
function getWinLine(board: Player[]): number[] | null {
  for (const line of LINES) { const [a,b,c] = line; if (board[a] && board[a] === board[b] && board[a] === board[c]) return line; }
  return null;
}

export default function OnlineTicTacToe() {
  const [board, setBoard] = useState<Player[]>(Array(9).fill(null));
  const [mySymbol, setMySymbol] = useState<"X" | "O" | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [winner, setWinner] = useState<Player>(null);
  const [isDraw, setIsDraw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const { addPlay } = useGameHistory();

  const handleMove = useCallback((data: unknown) => {
    const { index } = data as { index: number };
    setBoard(prev => {
      const nb = [...prev];
      nb[index] = mySymbol === "X" ? "O" : "X";
      const w = checkWinner(nb);
      if (w) { setWinner(w); addPlay("tictactoe"); }
      else if (!nb.includes(null)) setIsDraw(true);
      return nb;
    });
    setIsMyTurn(true);
  }, [mySymbol, addPlay]);

  const handleStart = useCallback((pid: string, _code: string) => {
    const sym = pid === "1" ? "X" : "O";
    setMySymbol(sym);
    setIsMyTurn(pid === "1");
    setBoard(Array(9).fill(null));
    setWinner(null);
    setIsDraw(false);
  }, []);

  const handleOpponentLeft = useCallback(() => {
    setWinner(null);
  }, []);

  const handleGameReset = useCallback(() => {
    setBoard(Array(9).fill(null));
    setWinner(null);
    setIsDraw(false);
    setIsMyTurn(mySymbol === "X");
  }, [mySymbol]);

  const { status, roomCode, joinInput, setJoinInput, error, createRoom, joinRoom, sendMove, sendReset, disconnect } = useMultiplayer({
    gameId: "tictactoe",
    onMove: handleMove,
    onStart: handleStart,
    onOpponentLeft: handleOpponentLeft,
    onGameReset: handleGameReset,
  });

  const handleClick = (i: number) => {
    if (!isMyTurn || board[i] || winner || isDraw || status !== "playing") return;
    const nb = [...board]; nb[i] = mySymbol!;
    setBoard(nb);
    sendMove({ index: i });
    const w = checkWinner(nb);
    if (w) { setWinner(w); addPlay("tictactoe"); }
    else if (!nb.includes(null)) setIsDraw(true);
    else setIsMyTurn(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const winLine = winner ? getWinLine(board) : null;

  if (status === "idle" || status === "error") {
    return (
      <div className="flex flex-col items-center space-y-6 max-w-sm mx-auto p-4">
        <div className="text-center">
          <h2 className="text-2xl font-black text-foreground">オンライン三目並べ</h2>
          <p className="text-sm text-muted-foreground mt-1">友達と遠隔対戦！</p>
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
        {inviteOpen && <InviteModal roomCode={roomCode} gameName="オンライン三目並べ" onClose={() => setInviteOpen(false)} />}
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
    <div className="flex flex-col items-center space-y-5 max-w-sm mx-auto p-4">
      <div className="text-center">
        <h2 className="text-xl font-black text-foreground">オンライン三目並べ</h2>
        <p className="text-sm text-muted-foreground">あなた: <span className="font-black text-primary">{mySymbol}</span></p>
      </div>

      <div className="bg-muted/50 rounded-xl px-4 py-2 text-center">
        {winner ? (
          <p className={`font-black ${(winner === mySymbol) ? "text-green-600" : "text-destructive"}`}>
            {winner === mySymbol ? "あなたの勝ち！" : "相手の勝ち..."}
          </p>
        ) : isDraw ? (
          <p className="font-black text-muted-foreground">引き分け！</p>
        ) : (
          <p className={`font-bold text-sm ${isMyTurn ? "text-green-600" : "text-muted-foreground"}`}>
            {isMyTurn ? "あなたのターン" : "相手のターン..."}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 w-64 h-64">
        {board.map((cell, i) => (
          <button key={i} onClick={() => handleClick(i)} disabled={!isMyTurn || !!cell || !!winner || isDraw}
            className={`
              flex items-center justify-center text-4xl font-black rounded-xl transition-all
              ${winLine?.includes(i) ? "bg-primary/20 border-2 border-primary scale-105" : "bg-muted hover:bg-secondary border-2 border-border"}
              ${!cell && isMyTurn && !winner ? "hover:scale-105 cursor-pointer" : "cursor-default"}
              ${cell === "X" ? "text-primary" : "text-destructive"}
            `}>
            {cell}
          </button>
        ))}
      </div>

      {(winner || isDraw) && (
        <Button onClick={() => { sendReset(); handleGameReset(); }} className="rounded-full px-8">もう一度</Button>
      )}
      <Button variant="outline" size="sm" onClick={disconnect} className="rounded-full">終了</Button>
    </div>
  );
}
