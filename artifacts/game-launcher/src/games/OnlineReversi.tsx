import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Send } from "lucide-react";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { useGameHistory } from "@/context/GameHistoryContext";
import InviteModal from "@/components/InviteModal";

type Cell = 0 | 1 | 2;
type Board = Cell[][];
const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

function empty(): Board {
  const b: Board = Array(8).fill(null).map(() => Array(8).fill(0));
  b[3][3]=2; b[4][4]=2; b[3][4]=1; b[4][3]=1; return b;
}

function flip(board: Board, r: number, c: number, player: 1|2): Board | null {
  const opp = player===1?2:1; const toFlip: [number,number][] = [];
  for(const[dr,dc]of DIRS){const line:[number,number][]=[];let nr=r+dr,nc=c+dc;while(nr>=0&&nr<8&&nc>=0&&nc<8&&board[nr][nc]===opp){line.push([nr,nc]);nr+=dr;nc+=dc;}if(line.length&&nr>=0&&nr<8&&nc>=0&&nc<8&&board[nr][nc]===player)toFlip.push(...line);}
  if(!toFlip.length)return null;
  const nb=board.map(row=>[...row])as Board; nb[r][c]=player; toFlip.forEach(([fr,fc])=>{nb[fr][fc]=player;}); return nb;
}

function validMoves(board:Board,player:1|2):[number,number][]{
  const moves:[number,number][]=[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(!board[r][c]&&flip(board,r,c,player))moves.push([r,c]);
  return moves;
}

function count(board:Board):[number,number]{let b=0,w=0;board.forEach(row=>row.forEach(c=>{if(c===1)b++;if(c===2)w++;}));return[b,w];}

export default function OnlineReversi() {
  const [board, setBoard] = useState(empty);
  const [myPlayer, setMyPlayer] = useState<1|2|null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [validHints, setValidHints] = useState<[number,number][]>([]);
  const [copied, setCopied] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const { addPlay } = useGameHistory();

  const handleMove = useCallback((data: unknown) => {
    const { r, c, player } = data as { r:number; c:number; player:1|2 };
    setBoard(prev => {
      const nb = flip(prev, r, c, player); if (!nb) return prev;
      const opp = player===1?2:1;
      const myMoves = myPlayer ? validMoves(nb, myPlayer as 1|2) : [];
      const oppMoves = validMoves(nb, opp);
      if(!myMoves.length&&!oppMoves.length){setGameOver(true);addPlay("reversi");}
      else if(myMoves.length){setValidHints(myMoves);}
      return nb;
    });
    setIsMyTurn(true);
  }, [myPlayer, addPlay]);

  const handleStart = useCallback((pid: string) => {
    const p = pid==="1"?1:2;
    setMyPlayer(p); setIsMyTurn(pid==="1");
    setBoard(empty()); setGameOver(false);
    if(pid==="1")setValidHints(validMoves(empty(),1)); else setValidHints([]);
  }, []);

  const handleGameReset = useCallback(() => {
    setBoard(empty()); setGameOver(false); setIsMyTurn(myPlayer===1);
    if(myPlayer===1)setValidHints(validMoves(empty(),1)); else setValidHints([]);
  }, [myPlayer]);

  const { status, roomCode, joinInput, setJoinInput, error, createRoom, joinRoom, sendMove, sendReset, disconnect } = useMultiplayer({
    gameId: "reversi-online",
    onMove: handleMove, onStart: handleStart, onGameReset: handleGameReset,
  });

  const handleClick = (r: number, c: number) => {
    if(!isMyTurn||gameOver||status!=="playing"||!myPlayer) return;
    const nb = flip(board, r, c, myPlayer); if(!nb) return;
    setBoard(nb);
    sendMove({r, c, player: myPlayer});
    const oppMoves = validMoves(nb, myPlayer===1?2:1);
    const myMoves = validMoves(nb, myPlayer as 1|2);
    if(!oppMoves.length&&!myMoves.length){setGameOver(true);addPlay("reversi");}
    else if(!oppMoves.length){setValidHints(validMoves(nb,myPlayer as 1|2));}
    else{setValidHints([]);setIsMyTurn(false);}
  };

  const [black, white] = count(board);

  if(status==="idle"||status==="error") return (
    <div className="flex flex-col items-center space-y-6 max-w-sm mx-auto p-4">
      <h2 className="text-2xl font-black">オンラインリバーシ</h2>
      {error&&<div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-sm text-destructive font-bold w-full text-center">{error}</div>}
      <Button onClick={createRoom} className="w-full rounded-full py-5 font-bold">ルームを作成（黒⚫）</Button>
      <div className="flex gap-2 w-full">
        <Input value={joinInput} onChange={e=>setJoinInput(e.target.value.toUpperCase())} placeholder="ルームコード" maxLength={6} className="rounded-xl font-mono text-center text-lg font-bold"/>
        <Button onClick={()=>joinRoom(joinInput)} disabled={joinInput.length<4} className="rounded-xl px-4">参加（白⚪）</Button>
      </div>
    </div>
  );

  if(status==="connecting") return <div className="text-center py-10 text-muted-foreground font-bold animate-pulse">接続中...</div>;

  if(status==="waiting") return (
    <div className="flex flex-col items-center space-y-5 max-w-sm mx-auto p-4 text-center">
      <div className="text-5xl animate-bounce">⏳</div>
      <h3 className="text-xl font-black">友達を待っています...</h3>
      <div className="flex items-center gap-2 bg-primary/10 border-2 border-primary/30 rounded-xl px-6 py-4">
        <span className="text-3xl font-black font-mono tracking-widest text-primary">{roomCode}</span>
        <button onClick={()=>{navigator.clipboard.writeText(roomCode);setCopied(true);setTimeout(()=>setCopied(false),2000);}} className="ml-2 text-primary">
          {copied?<Check className="w-5 h-5"/>:<Copy className="w-5 h-5"/>}
        </button>
      </div>
      <Button variant="outline" onClick={() => setInviteOpen(true)} className="rounded-full flex items-center gap-2">
        <Send className="w-4 h-4" />友達を招待
      </Button>
      <Button variant="outline" onClick={disconnect} className="rounded-full">キャンセル</Button>
      {inviteOpen && <InviteModal roomCode={roomCode} gameName="オンラインリバーシ" onClose={() => setInviteOpen(false)} />}
    </div>
  );

  if(status==="ended") return (
    <div className="flex flex-col items-center space-y-4 p-4 text-center">
      <h3 className="text-xl font-black">相手が切断しました</h3>
      <Button onClick={disconnect} className="rounded-full px-8">戻る</Button>
    </div>
  );

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex justify-between w-full max-w-xs px-2">
        <div className="text-center"><div className="w-6 h-6 rounded-full bg-slate-900 mx-auto mb-1"/><p className="font-black">{black}</p></div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">{myPlayer===1?"あなた=黒":"あなた=白"}</p>
          {gameOver?<p className={`font-black text-sm ${(myPlayer===1?black>white:white>black)?"text-green-600":"text-red-600"}`}>{(myPlayer===1?black>white:white>black)?"勝ち！":"負け..."}</p>
            :<p className={`font-bold text-sm ${isMyTurn?"text-green-600":"text-muted-foreground"}`}>{isMyTurn?"あなたのターン":"相手のターン..."}</p>}
        </div>
        <div className="text-center"><div className="w-6 h-6 rounded-full bg-white border-2 border-border mx-auto mb-1"/><p className="font-black">{white}</p></div>
      </div>
      <div className="bg-green-700 p-1.5 rounded-2xl">
        <div className="grid grid-cols-8 gap-0.5">
          {board.map((row,r)=>row.map((cell,c)=>{
            const hint=validHints.some(([hr,hc])=>hr===r&&hc===c);
            return <button key={`${r}-${c}`} onClick={()=>handleClick(r,c)}
              className={`w-10 h-10 bg-green-600 rounded-sm flex items-center justify-center hover:bg-green-500 ${hint?"ring-1 ring-white/40":""}`}>
              {cell===1&&<div className="w-8 h-8 rounded-full bg-slate-900"/>}
              {cell===2&&<div className="w-8 h-8 rounded-full bg-white"/>}
              {!cell&&hint&&<div className="w-3 h-3 rounded-full bg-white/30"/>}
            </button>;
          }))}
        </div>
      </div>
      {gameOver&&<Button onClick={()=>{sendReset();handleGameReset();}} className="rounded-full px-8">もう一度</Button>}
      <Button variant="outline" size="sm" onClick={disconnect} className="rounded-full">終了</Button>
    </div>
  );
}
