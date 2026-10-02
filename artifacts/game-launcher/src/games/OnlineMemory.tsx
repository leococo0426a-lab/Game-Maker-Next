import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { Copy, Check, Send } from "lucide-react";
import InviteModal from "@/components/InviteModal";

const EMOJIS = ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮"];

type Card = { id: number; emoji: string; isFlipped: boolean; isMatched: boolean };

function createDeck() {
  return [...EMOJIS, ...EMOJIS].sort(() => Math.random() - 0.5)
    .map((emoji, i) => ({ id: i, emoji, isFlipped: false, isMatched: false }));
}

export default function OnlineMemory() {
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [playerId, setPlayerId] = useState<"1" | "2" | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [locked, setLocked] = useState(true);
  const [copied, setCopied] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const startReveal = useCallback((deck: Card[]) => {
    setCards(deck.map(c => ({ ...c, isFlipped: true })));
    setRevealing(true);
    setCountdown(5);
    let ct = 5;
    timerRef.current = setInterval(() => {
      ct--;
      setCountdown(ct);
      if (ct <= 0) {
        clearInterval(timerRef.current);
        setCards(deck.map(c => ({ ...c, isFlipped: false })));
        setRevealing(false);
        setLocked(false);
      }
    }, 1000);
  }, []);

  const handleMove = useCallback((data: unknown) => {
    const { index, result } = data as { index: number; result?: "match" | "miss"; matched?: number[] };
    setCards(prev => {
      const nb = prev.map(c => ({ ...c }));
      if (result === "match" && (data as { matched: number[] }).matched) {
        (data as { matched: number[] }).matched.forEach(i => { nb[i].isMatched = true; nb[i].isFlipped = true; });
        setOppScore(s => s + 1);
      } else {
        nb[index].isFlipped = true;
        setTimeout(() => {
          setCards(pp => pp.map((c, i) => i === index || (data as { flipped: number[] }).flipped?.includes(i) ? { ...c, isFlipped: false } : c));
          setIsMyTurn(true);
        }, 900);
      }
      return nb;
    });
    if (result === "match") setIsMyTurn(true);
  }, []);

  const handleStart = useCallback((pid: string, _code: string) => {
    setPlayerId(pid as "1" | "2");
    setIsMyTurn(pid === "1");
    setMyScore(0); setOppScore(0);
    const deck = createDeck();
    startReveal(deck);
  }, [startReveal]);

  const { status, roomCode, joinInput, setJoinInput, error, createRoom, joinRoom, sendMove, disconnect } = useMultiplayer({
    gameId: "memory",
    onMove: handleMove,
    onStart: handleStart,
  });

  const handleCardClick = (i: number) => {
    if (!isMyTurn || locked || flipped.length >= 2 || cards[i].isFlipped || cards[i].isMatched) return;
    const nb = cards.map(c => ({ ...c }));
    nb[i].isFlipped = true;
    setCards(nb);

    const nf = [...flipped, i];
    setFlipped(nf);

    if (nf.length === 2) {
      setLocked(true);
      const [a, b] = nf;
      if (nb[a].emoji === nb[b].emoji) {
        setTimeout(() => {
          setCards(pp => pp.map((c, ci) => ci === a || ci === b ? { ...c, isMatched: true } : c));
          setMyScore(s => s + 1);
          setFlipped([]);
          setLocked(false);
          sendMove({ index: i, result: "match", matched: [a, b] });
        }, 400);
      } else {
        setTimeout(() => {
          setCards(pp => pp.map((c, ci) => ci === a || ci === b ? { ...c, isFlipped: false } : c));
          setFlipped([]);
          setIsMyTurn(false);
          setLocked(false);
          sendMove({ index: i, result: "miss", flipped: [a, b] });
        }, 900);
      }
    }
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const copyCode = () => { navigator.clipboard.writeText(roomCode); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const totalMatches = cards.filter(c => c.isMatched).length / 2;
  const gameOver = totalMatches === EMOJIS.length;

  if (status === "idle" || status === "error") {
    return (
      <div className="flex flex-col items-center space-y-6 max-w-sm mx-auto p-4">
        <div className="text-center">
          <h2 className="text-2xl font-black text-foreground">オンライン Memory</h2>
          <p className="text-sm text-muted-foreground mt-1">友達と対戦！多くペアを揃えた方が勝ち</p>
        </div>
        {error && <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-sm text-destructive font-bold w-full text-center">{error}</div>}
        <Button onClick={createRoom} className="w-full rounded-full py-5 text-base font-bold">ルームを作成</Button>
        <div className="text-muted-foreground text-sm font-bold">または</div>
        <div className="flex gap-2 w-full">
          <Input value={joinInput} onChange={e => setJoinInput(e.target.value.toUpperCase())} placeholder="ルームコード" maxLength={6} className="rounded-xl font-mono text-center text-lg font-bold" />
          <Button onClick={() => joinRoom(joinInput)} disabled={joinInput.length < 4} className="rounded-xl px-4">参加</Button>
        </div>
      </div>
    );
  }

  if (status === "waiting") {
    return (
      <div className="flex flex-col items-center space-y-5 max-w-sm mx-auto p-4 text-center">
        <div className="text-5xl animate-bounce">⏳</div>
        <h3 className="text-xl font-black text-foreground">友達を待っています...</h3>
        <div className="flex items-center gap-2 bg-primary/10 border-2 border-primary/30 rounded-xl px-6 py-4">
          <span className="text-3xl font-black font-mono tracking-widest text-primary">{roomCode}</span>
          <button onClick={copyCode} className="ml-2 text-primary">
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
        <Button variant="outline" onClick={() => setInviteOpen(true)} className="rounded-full flex items-center gap-2">
          <Send className="w-4 h-4" />友達を招待
        </Button>
        <Button variant="outline" onClick={disconnect} className="rounded-full">キャンセル</Button>
        {inviteOpen && <InviteModal roomCode={roomCode} gameName="オンラインMemory" onClose={() => setInviteOpen(false)} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4 max-w-lg mx-auto p-4">
      <div className="flex justify-between w-full">
        <div className="text-center bg-primary/10 rounded-xl px-4 py-2 border border-primary/30">
          <p className="text-xs font-bold text-primary uppercase">あなた</p>
          <p className="text-2xl font-black text-foreground">{myScore}</p>
        </div>
        {revealing && <div className="text-center"><p className="text-sm font-bold text-muted-foreground">暗記中</p><p className="text-2xl font-black text-primary">{countdown}s</p></div>}
        {!revealing && <div className="text-center"><p className="text-xs text-muted-foreground font-bold">{isMyTurn ? "あなたのターン" : "相手のターン"}</p></div>}
        <div className="text-center bg-muted rounded-xl px-4 py-2 border border-border">
          <p className="text-xs font-bold text-muted-foreground uppercase">相手</p>
          <p className="text-2xl font-black text-foreground">{oppScore}</p>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-1.5 w-full">
        {cards.map((card, i) => (
          <div key={card.id} onClick={() => handleCardClick(i)}
            className={`
              aspect-square flex items-center justify-center rounded-lg cursor-pointer transition-all border-2 select-none
              ${card.isMatched ? "bg-green-100 border-green-300" : card.isFlipped ? "bg-white border-primary shadow" : isMyTurn && !locked ? "bg-primary/70 border-primary hover:bg-primary hover:scale-105" : "bg-muted border-border"}
            `}>
            <span className={`text-xl transition-opacity ${card.isFlipped || card.isMatched ? "opacity-100" : "opacity-0"}`}>{card.emoji}</span>
          </div>
        ))}
      </div>

      {gameOver && (
        <div className={`border-2 rounded-2xl p-5 text-center w-full ${myScore > oppScore ? "bg-green-50 border-green-300" : myScore < oppScore ? "bg-red-50 border-red-300" : "bg-muted border-border"}`}>
          <h3 className={`text-2xl font-black mb-1 ${myScore > oppScore ? "text-green-700" : myScore < oppScore ? "text-destructive" : "text-foreground"}`}>
            {myScore > oppScore ? "あなたの勝ち！" : myScore < oppScore ? "相手の勝ち..." : "引き分け！"}
          </h3>
          <p className="text-muted-foreground">{myScore} vs {oppScore}</p>
        </div>
      )}
      <Button variant="outline" size="sm" onClick={disconnect} className="rounded-full">終了</Button>
    </div>
  );
}
