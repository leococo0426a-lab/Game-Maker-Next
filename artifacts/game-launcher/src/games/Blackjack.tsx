import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

type Card = { suit: string; value: string; num: number };
const SUITS = ["♠","♥","♦","♣"];
const VALUES = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const NUMS = [11,2,3,4,5,6,7,8,9,10,10,10,10];

function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) for (let i = 0; i < VALUES.length; i++) deck.push({ suit, value: VALUES[i], num: NUMS[i] });
  return deck.sort(() => Math.random() - 0.5);
}

function calcHand(hand: Card[]): number {
  let total = hand.reduce((s, c) => s + c.num, 0);
  let aces = hand.filter(c => c.value === "A").length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function CardDisplay({ card, hidden }: { card: Card; hidden?: boolean }) {
  const red = card.suit === "♥" || card.suit === "♦";
  if (hidden) return (
    <div className="w-16 h-24 bg-blue-600 border-2 border-border rounded-xl flex items-center justify-center text-white text-2xl shadow-md">🂠</div>
  );
  return (
    <div className={`w-16 h-24 bg-white border-2 border-border rounded-xl flex flex-col items-start justify-start p-1.5 shadow-md ${red ? "text-red-500" : "text-slate-800"}`}>
      <span className="text-sm font-black leading-none">{card.value}</span>
      <span className="text-sm leading-none">{card.suit}</span>
      <span className="flex-1 flex items-center justify-center w-full text-2xl">{card.suit}</span>
    </div>
  );
}

export default function Blackjack() {
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [phase, setPhase] = useState<"bet" | "playing" | "dealer" | "done">("bet");
  const [result, setResult] = useState("");
  const [coins, setCoins] = useState(100);
  const [bet, setBet] = useState(10);
  const [dealerRevealed, setDealerRevealed] = useState(false);
  const { addPlay } = useGameHistory();

  const deal = useCallback(() => {
    if (coins < bet) return;
    const d = makeDeck();
    const ph = [d[0], d[2]];
    const dh = [d[1], d[3]];
    setDeck(d.slice(4));
    setPlayerHand(ph);
    setDealerHand(dh);
    setDealerRevealed(false);
    setCoins(c => c - bet);
    if (calcHand(ph) === 21) {
      setDealerRevealed(true);
      const dTotal = calcHand(dh);
      if (dTotal === 21) { setResult("引き分け！"); setCoins(c => c + bet); }
      else { setResult("ブラックジャック！"); setCoins(c => c + bet * 2.5); }
      setPhase("done"); addPlay("blackjack", bet);
    } else { setPhase("playing"); }
  }, [bet, coins, addPlay]);

  const hit = useCallback(() => {
    const card = deck[0];
    const newDeck = deck.slice(1);
    const newHand = [...playerHand, card];
    setDeck(newDeck);
    setPlayerHand(newHand);
    if (calcHand(newHand) > 21) { setResult("バスト！"); setDealerRevealed(true); setPhase("done"); addPlay("blackjack", 0); }
  }, [deck, playerHand, addPlay]);

  const stand = useCallback(() => {
    setDealerRevealed(true);
    setPhase("dealer");
    let dHand = [...dealerHand];
    let d = deck.slice();
    while (calcHand(dHand) < 17) { dHand.push(d.shift()!); }
    setDealerHand(dHand);
    setDeck(d);
    const p = calcHand(playerHand);
    const dv = calcHand(dHand);
    if (dv > 21 || p > dv) { setResult("プレイヤーの勝ち！"); setCoins(c => c + bet * 2); addPlay("blackjack", bet); }
    else if (p === dv) { setResult("引き分け！"); setCoins(c => c + bet); addPlay("blackjack", 0); }
    else { setResult("ディーラーの勝ち..."); addPlay("blackjack", 0); }
    setPhase("done");
  }, [dealerHand, deck, playerHand, bet, addPlay]);

  const playerTotal = calcHand(playerHand);
  const dealerTotal = calcHand(dealerHand);

  return (
    <div className="flex flex-col items-center space-y-5 max-w-sm mx-auto p-4">
      <div className="flex justify-between w-full items-center">
        <div className="text-xl font-black text-foreground">💰 {coins}</div>
        {phase === "bet" && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-muted-foreground">ベット:</span>
            {[5,10,25,50].map(b => (
              <button key={b} onClick={() => setBet(b)} className={`w-10 h-10 rounded-full text-xs font-black border-2 transition-colors ${bet === b ? "bg-primary text-white border-primary" : "bg-white border-border hover:border-primary"}`}>{b}</button>
            ))}
          </div>
        )}
      </div>

      <div className="w-full bg-green-800 rounded-2xl p-4 space-y-4 min-h-[280px]">
        {(phase === "playing" || phase === "dealer" || phase === "done") && (
          <>
            <div className="space-y-2">
              <p className="text-xs text-green-300 font-bold">ディーラー {dealerRevealed ? `(${dealerTotal})` : ""}</p>
              <div className="flex gap-2">
                {dealerHand.map((c, i) => <CardDisplay key={i} card={c} hidden={i === 1 && !dealerRevealed} />)}
              </div>
            </div>
            <div className="border-t border-green-700" />
            <div className="space-y-2">
              <p className="text-xs text-green-300 font-bold">あなた ({playerTotal})</p>
              <div className="flex gap-2 flex-wrap">
                {playerHand.map((c, i) => <CardDisplay key={i} card={c} />)}
              </div>
            </div>
          </>
        )}
        {phase === "bet" && (
          <div className="flex items-center justify-center h-48 text-green-400 text-center">
            <div>
              <p className="text-5xl mb-2">🂠</p>
              <p className="font-bold text-sm">ベットして始めましょう！</p>
            </div>
          </div>
        )}
      </div>

      {result && <div className={`text-xl font-black ${result.includes("勝ち") ? "text-green-600" : result.includes("引き") ? "text-yellow-600" : "text-red-600"}`}>{result}</div>}

      <div className="flex gap-3 w-full">
        {phase === "bet" && <Button onClick={deal} disabled={coins < bet} className="flex-1 rounded-full font-bold">ディール ({bet}コイン)</Button>}
        {phase === "playing" && (
          <>
            <Button onClick={hit} variant="outline" className="flex-1 rounded-full">ヒット</Button>
            <Button onClick={stand} className="flex-1 rounded-full">スタンド</Button>
          </>
        )}
        {phase === "done" && <Button onClick={() => { setPhase("bet"); setResult(""); }} className="w-full rounded-full">{coins > 0 ? "もう一度" : "終了（コイン不足）"}</Button>}
      </div>
    </div>
  );
}
