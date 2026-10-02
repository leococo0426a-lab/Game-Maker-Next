import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Send } from "lucide-react";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { useGameHistory } from "@/context/GameHistoryContext";
import InviteModal from "@/components/InviteModal";

const SHIPS = [5,4,3,3,2];
type Cell = { ship: boolean; hit: boolean };
type Board = Cell[][];

function empty(): Board { return Array(10).fill(null).map(()=>Array(10).fill(null).map(()=>({ship:false,hit:false}))); }

function placeRandom(): Board {
  const board = empty();
  for(const size of SHIPS){
    let placed=false;
    while(!placed){
      const horiz=Math.random()<0.5;
      const r=Math.floor(Math.random()*(horiz?10:11-size));
      const c=Math.floor(Math.random()*(horiz?11-size:10));
      let ok=true;
      for(let i=0;i<size;i++){const nr=horiz?r:r+i,nc=horiz?c+i:c;if(board[nr][nc].ship){ok=false;break;}}
      if(ok){for(let i=0;i<size;i++){const nr=horiz?r:r+i,nc=horiz?c+i:c;board[nr][nc].ship=true;}placed=true;}
    }
  }
  return board;
}

function isDefeated(b:Board){return b.every(r=>r.every(c=>!c.ship||c.hit));}

export default function OnlineBattleship() {
  const [myBoard, setMyBoard] = useState(placeRandom);
  const [enemyBoard, setEnemyBoard] = useState(empty);
  const [myPlayer, setMyPlayer] = useState<1|2|null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [phase, setPhase] = useState<"setup"|"playing"|"done">("setup");
  const [result, setResult] = useState("");
  const [myReady, setMyReady] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const { addPlay } = useGameHistory();

  const handleMove = useCallback((data: unknown) => {
    const d = data as { type: string; r?: number; c?: number; hit?: boolean; sunk?: boolean };
    if(d.type==="ready"){
      setPhase(prev => {
        if(prev==="setup")return "setup";
        return "playing";
      });
    }
    if(d.type==="shoot"&&d.r!==undefined&&d.c!==undefined){
      setMyBoard(prev=>{
        const nb=prev.map(row=>row.map(cell=>({...cell})));
        nb[d.r!][d.c!].hit=true;
        const hit=nb[d.r!][d.c!].ship;
        setMessage(hit?"被弾！💥":"相手が外れた");
        if(isDefeated(nb)){setResult("相手の勝ち...");setPhase("done");addPlay("battleship");}
        return nb;
      });
      setIsMyTurn(true);
    }
  }, [addPlay]);

  const handleStart = useCallback((pid: string) => {
    setMyPlayer(pid==="1"?1:2); setIsMyTurn(pid==="1"); setPhase("setup");
    setMyBoard(placeRandom()); setEnemyBoard(empty()); setResult(""); setMyReady(false); setMessage("");
  }, []);

  const handleGameReset = useCallback(() => {
    setMyBoard(placeRandom()); setEnemyBoard(empty()); setPhase("setup");
    setResult(""); setMyReady(false); setMessage(""); setIsMyTurn(myPlayer===1);
  }, [myPlayer]);

  const { status, roomCode, joinInput, setJoinInput, error, createRoom, joinRoom, sendMove, sendReset, disconnect } = useMultiplayer({
    gameId: "battleship-online",
    onMove: handleMove, onStart: handleStart, onGameReset: handleGameReset,
  });

  const readyUp = () => {
    setMyReady(true); sendMove({ type: "ready" });
    setMessage("相手の準備を待っています...");
    setPhase("playing");
  };

  const shoot = (r: number, c: number) => {
    if(!isMyTurn||phase!=="playing"||enemyBoard[r][c].hit||result) return;
    const nb=enemyBoard.map(row=>row.map(cell=>({...cell})));
    nb[r][c].hit=true;
    setEnemyBoard(nb);
    sendMove({type:"shoot",r,c});
    const hit=nb[r][c].ship;
    setMessage(hit?"命中！💥":"外れ...");
    if(isDefeated(nb)){setResult("あなたの勝ち！");setPhase("done");addPlay("battleship");}
    else setIsMyTurn(false);
  };

  const renderBoard = (board: Board, isEnemy: boolean) => (
    <div className="grid gap-0.5" style={{gridTemplateColumns:"repeat(10,1fr)"}}>
      {board.map((row,r)=>row.map((cell,c)=>{
        let bg="bg-blue-100 hover:bg-blue-200";
        if(cell.hit&&cell.ship)bg="bg-red-500";
        else if(cell.hit)bg="bg-slate-300";
        else if(!isEnemy&&cell.ship)bg="bg-slate-600";
        return <button key={`${r}-${c}`} onClick={()=>isEnemy&&shoot(r,c)}
          className={`w-6 h-6 rounded-sm border border-blue-200 text-xs flex items-center justify-center transition-colors ${bg} ${isEnemy&&!cell.hit&&phase==="playing"&&isMyTurn&&!result?"cursor-crosshair":""}`}>
          {cell.hit&&cell.ship&&"💥"}{cell.hit&&!cell.ship&&"·"}
        </button>;
      }))}
    </div>
  );

  if(status==="idle"||status==="error") return (
    <div className="flex flex-col items-center space-y-6 max-w-sm mx-auto p-4">
      <div className="text-4xl">🚢</div>
      <h2 className="text-2xl font-black">オンライン海戦</h2>
      {error&&<div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-sm text-destructive font-bold w-full text-center">{error}</div>}
      <Button onClick={createRoom} className="w-full rounded-full py-5 font-bold">ルームを作成</Button>
      <div className="flex gap-2 w-full">
        <Input value={joinInput} onChange={e=>setJoinInput(e.target.value.toUpperCase())} placeholder="ルームコード" maxLength={6} className="rounded-xl font-mono text-center text-lg font-bold"/>
        <Button onClick={()=>joinRoom(joinInput)} disabled={joinInput.length<4} className="rounded-xl px-4">参加</Button>
      </div>
    </div>
  );

  if(status==="connecting") return <div className="text-center py-10 font-bold animate-pulse">接続中...</div>;

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
      {inviteOpen && <InviteModal roomCode={roomCode} gameName="オンライン海戦" onClose={() => setInviteOpen(false)} />}
    </div>
  );

  if(status==="ended") return (
    <div className="flex flex-col items-center space-y-4 p-4 text-center">
      <h3 className="text-xl font-black">相手が切断しました</h3>
      <Button onClick={disconnect} className="rounded-full px-8">戻る</Button>
    </div>
  );

  return (
    <div className="flex flex-col items-center space-y-3">
      <p className={`font-black ${result.includes("勝ち")?"text-green-600":result.includes("負")?"text-red-600":"text-foreground"}`}>
        {result||message||(isMyTurn&&phase==="playing"?"敵の海域を攻撃！":"相手のターン...")}
      </p>
      <div className="flex gap-6 flex-wrap justify-center">
        <div className="space-y-1"><p className="text-xs font-black text-muted-foreground uppercase text-center">自陣</p>{renderBoard(myBoard,false)}</div>
        {phase!=="setup"&&<div className="space-y-1"><p className="text-xs font-black text-muted-foreground uppercase text-center">敵陣{isMyTurn&&phase==="playing"&&!result?" ←攻撃":""}</p>{renderBoard(enemyBoard,true)}</div>}
      </div>
      {phase==="setup"&&!myReady&&(
        <div className="flex gap-3">
          <Button variant="outline" onClick={()=>setMyBoard(placeRandom())} className="rounded-full">配置変更</Button>
          <Button onClick={readyUp} className="rounded-full">準備完了！</Button>
        </div>
      )}
      {phase==="done"&&<Button onClick={()=>{sendReset();handleGameReset();}} className="rounded-full px-8">もう一度</Button>}
      <Button variant="outline" size="sm" onClick={disconnect} className="rounded-full">終了</Button>
    </div>
  );
}
