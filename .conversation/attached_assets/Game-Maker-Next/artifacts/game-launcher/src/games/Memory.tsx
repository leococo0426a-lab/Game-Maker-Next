import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const EMOJIS = ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮"];

type Card = { id: number; emoji: string; isFlipped: boolean; isMatched: boolean };

function createDeck() {
  return [...EMOJIS, ...EMOJIS]
    .sort(() => Math.random() - 0.5)
    .map((emoji, i) => ({ id: i, emoji, isFlipped: false, isMatched: false }));
}

export default function Memory() {
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [revealing, setRevealing] = useState(true);
  const [countdown, setCountdown] = useState(5);
  const [locked, setLocked] = useState(false);
  const { addPlay } = useGameHistory();
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const initGame = () => {
    const deck = createDeck();
    setCards(deck.map(c => ({ ...c, isFlipped: true })));
    setFlipped([]);
    setMoves(0);
    setMatches(0);
    setRevealing(true);
    setCountdown(5);
    setLocked(true);
  };

  useEffect(() => {
    initGame();
  }, []);

  useEffect(() => {
    if (!revealing) return;
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timerRef.current);
          setCards(prev => prev.map(card => ({ ...card, isFlipped: false })));
          setRevealing(false);
          setLocked(false);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [revealing]);

  const handleCardClick = (index: number) => {
    if (locked || flipped.length === 2 || cards[index].isFlipped || cards[index].isMatched) return;

    const newCards = [...cards];
    newCards[index] = { ...newCards[index], isFlipped: true };
    setCards(newCards);

    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setLocked(true);
      setMoves(m => m + 1);
      const [a, b] = newFlipped;
      if (newCards[a].emoji === newCards[b].emoji) {
        setTimeout(() => {
          setCards(prev => prev.map((c, i) => i === a || i === b ? { ...c, isMatched: true } : c));
          setFlipped([]);
          setLocked(false);
          setMatches(m => {
            const nm = m + 1;
            if (nm === EMOJIS.length) addPlay("memory", moves + 1);
            return nm;
          });
        }, 400);
      } else {
        setTimeout(() => {
          setCards(prev => prev.map((c, i) => i === a || i === b ? { ...c, isFlipped: false } : c));
          setFlipped([]);
          setLocked(false);
        }, 900);
      }
    }
  };

  const won = matches === EMOJIS.length;

  return (
    <div className="flex flex-col items-center space-y-5 max-w-lg mx-auto p-4">
      <div className="flex justify-between items-center w-full">
        <h2 className="text-2xl font-black text-foreground">Memory</h2>
        <div className="flex gap-3">
          <div className="bg-muted border border-border px-4 py-2 rounded-xl text-center">
            <p className="text-xs text-muted-foreground font-bold uppercase">手数</p>
            <p className="text-xl font-black text-foreground">{moves}</p>
          </div>
          <div className="bg-muted border border-border px-4 py-2 rounded-xl text-center">
            <p className="text-xs text-muted-foreground font-bold uppercase">ペア</p>
            <p className="text-xl font-black text-foreground">{matches}/{EMOJIS.length}</p>
          </div>
        </div>
      </div>

      {revealing && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl px-6 py-2 text-center">
          <p className="text-sm font-bold text-primary">カードを暗記してください！ <span className="text-2xl font-black">{countdown}</span> 秒</p>
        </div>
      )}

      <div className="grid grid-cols-6 gap-2 w-full">
        {cards.map((card, i) => (
          <div
            key={card.id}
            data-testid={`card-memory-${i}`}
            onClick={() => handleCardClick(i)}
            className={`
              aspect-square flex items-center justify-center rounded-xl cursor-pointer
              transition-all duration-200 select-none border-2
              ${card.isMatched
                ? "bg-green-100 border-green-300 scale-95"
                : card.isFlipped
                ? "bg-white border-primary shadow-md"
                : "bg-primary/80 border-primary hover:bg-primary hover:scale-105"}
            `}
          >
            <span className={`text-2xl transition-all duration-200 ${card.isFlipped || card.isMatched ? "opacity-100" : "opacity-0"}`}>
              {card.emoji}
            </span>
          </div>
        ))}
      </div>

      {won && (
        <div className="bg-green-50 border-2 border-green-300 p-6 rounded-2xl text-center w-full shadow-lg">
          <h3 className="text-2xl font-black text-green-700 mb-1">クリア！</h3>
          <p className="text-muted-foreground mb-4">{moves} 手でクリア！</p>
          <Button onClick={initGame} size="lg" className="w-full rounded-full">もう一度</Button>
        </div>
      )}

      {!won && !revealing && (
        <Button variant="outline" onClick={initGame} className="rounded-full">リセット</Button>
      )}
    </div>
  );
}
