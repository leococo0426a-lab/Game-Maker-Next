import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Send } from "lucide-react";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { useGameHistory } from "@/context/GameHistoryContext";
import InviteModal from "@/components/InviteModal";

const ROWS = 6, COLS = 7;
type Cell = 0 | 1 | 2;
type Board = Cell[][];

function emptyBoard(): Board { return Array(ROWS).fill(null).map(() => Array(COLS).fill(0)); }

function dropPiece(board: Board, col: number, player: 1 | 2): Board | null {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (!board[r][col]) { const nb = board.map(row => [...row]) as Board; nb[r][col] = player; return nb; }
  }
  return null;
}

function checkWin(board: Board, player: Cell): [boolean, [number, number][] | null] {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (board[r][c] !== player) continue;
    for (const [dr, dc] of dirs) {
      const cells: [number,number][] = [[r,c]];
      for (let i = 1; i < 4; i++) { const nr=r+dr*i,nc=c+dc*i; if(nr<0||nr>=ROWS||nc<0||nc>=COLS||board[nr][nc]!==player)break; cells.push([nr,nc]); }
      if (cells.length === 4) return [true, cells];
    }
  }
  return [false, null];
}

export default function OnlineConnectFour() {
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [myPlayer, setMyPlayer] = useState<1 | 2 | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [winLine, setWinLine] = useState<[number,number][] | null>(null);
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const { addPlay } = useGameHistory();

  const handleMove = useCallback((data: unknown) => {
    const { col, player } = data as { col: number; player: 1 | 2 };
    setBoard(prev => {
      const nb = dropPiece(prev, col, player);
      if (!nb) return prev;
      const [w, line] = checkWin(nb, player);
      if (w) { setWinLine(line); setWinner(player); addPlay("connect4"); }
      return nb;
    });
    setIsMyTurn(true);
  }, [addPlay]);

  const handleStart = useCallback((pid: string) => {
    const p = pid === "1" ? 1 : 2;
    setMyPlayer(p);
    setIsMyTurn(pid === "1");
    setBoard(emptyBoard()); setWinLine(null); setWinner(null);
  }, []);

  const handleGameReset = useCallback(() => {
    setBoard(emptyBoard()); setWinLine(null); setWinner(null);
    setIsMyTurn(myPlayer === 1);
  }, [myPlayer]);

  const { status, roomCode, joinInput, setJoinInput, error, createRoom, joinRoom, sendMove, sendReset, disconnect } = useMultiplayer({
    gameId: "connectfour-online",
    onMove: handleMove, onStart: handleStart, onGameReset: handleGameReset,
  });

  const handleDrop = (col: number) => {
    if (!isMyTurn || winner || status !== "playing" || !myPlayer) return;
    const nb = dropPiece(board, col, myPlayer); if (!nb) return;
    setBoard(nb);
    sendMove({ col, player: myPlayer });
    const [w, line] = checkWin(nb, myPlayer);
    if (w) { setWinLine(line); setWinner(myPlayer); addPlay("connect4"); }
    else setIsMyTurn(false);
  };

  const myColor = myPlayer === 1 ? "🔴" : "🟡";

  if (status === "idle" || status === "error") return (
    <div className="flex flex-col items-center space-y-6 max-w-sm mx-auto p-4">
      <h2 className="text-2xl font-black text-foreground">オンライン四目並べ</h2>
      {error && <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-sm text-destructive font-bold w-full text-center">{error}</div>}
      <Button onClick={createRoom} className="w-full rounded-full py-5 text-base font-bold">ルームを作成（先手🔴）</Button>
      <div className="flex gap-2 w-full">
        <Input value={joinInput} onChange={e => setJoinInput(e.target.value.toUpperCase())} placeholder="ルームコード" maxLength={6} className="rounded-xl font-mono text-center text-lg font-bold" />
        <Button onClick={() => joinRoom(joinInput)} disabled={joinInput.length < 4} className="rounded-xl px-4">参加（後手🟡）</Button>
      </div>
    </div>
  );

  if (status === "connecting") return <div className="text-center py-10 text-muted-foreground font-bold animate-pulse">接続中...</div>;

  if (status === "waiting") return (
    <div className="flex flex-col items-center space-y-5 max-w-sm mx-auto p-4 text-center">
      <div className="text-5xl animate-bounce">⏳</div>
      <h3 className="text-xl font-black">友達を待っています...</h3>
      <div className="flex items-center gap-2 bg-primary/10 border-2 border-primary/30 rounded-xl px-6 py-4">
        <span className="text-3xl font-black font-mono tracking-widest text-primary">{roomCode}</span>
        <button onClick={() => { navigator.clipboard.writeText(roomCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="ml-2 text-primary">
          {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
        </button>
      </div>
      <Button variant="outline" onClick={() => setInviteOpen(true)} className="rounded-full flex items-center gap-2">
        <Send className="w-4 h-4" />友達を招待
      </Button>
      <Button variant="outline" onClick={disconnect} className="rounded-full">キャンセル</Button>
      {inviteOpen && <InviteModal roomCode={roomCode} gameName="オンライン四目並べ" onClose={() => setInviteOpen(false)} />}
    </div>
  );

  if (status === "ended") return (
    <div className="flex flex-col items-center space-y-4 p-4 text-center">
      <h3 className="text-xl font-black">相手が切断しました</h3>
      <Button onClick={disconnect} className="rounded-full px-8">戻る</Button>
    </div>
  );

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="text-center">
        <p className="font-bold text-sm text-muted-foreground">あなた: {myColor} ({myPlayer === 1 ? "先手" : "後手"})</p>
        {winner ? <p className={`font-black text-lg ${winner === myPlayer ? "text-green-600" : "text-red-600"}`}>{winner === myPlayer ? "あなたの勝ち！" : "相手の勝ち..."}</p>
          : <p className={`font-bold text-sm ${isMyTurn ? "text-green-600" : "text-muted-foreground"}`}>{isMyTurn ? "あなたのターン" : "相手のターン..."}</p>}
      </div>
      <div className="bg-blue-600 p-2 rounded-2xl shadow-xl">
        <div className="flex gap-1 mb-1">
          {Array(COLS).fill(null).map((_,c) => (
            <button key={c} className="w-10 h-5 flex items-center justify-center" onClick={() => handleDrop(c)} onMouseEnter={() => setHoverCol(c)} onMouseLeave={() => setHoverCol(null)}>
              {hoverCol === c && isMyTurn && !winner && <div className={`w-4 h-4 rounded-full ${myPlayer === 1 ? "bg-red-400" : "bg-yellow-400"}`} />}
            </button>
          ))}
        </div>
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${COLS},1fr)` }}>
          {Array(ROWS).fill(null).map((_,r) => Array(COLS).fill(null).map((_,c) => {
            const cell = board[r][c];
            const isWin = winLine?.some(([wr,wc]) => wr===r&&wc===c);
            return <div key={`${r}-${c}`} className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center cursor-pointer" onClick={() => handleDrop(c)}>
              {cell !== 0 && <div className={`w-9 h-9 rounded-full ${cell===1?"bg-red-500":"bg-yellow-400"} ${isWin?"ring-2 ring-white scale-110":""}`} />}
            </div>;
          }))}
        </div>
      </div>
      {winner && <Button onClick={() => { sendReset(); handleGameReset(); }} className="rounded-full px-8">もう一度</Button>}
      <Button variant="outline" size="sm" onClick={disconnect} className="rounded-full">終了</Button>
    </div>
  );
}
