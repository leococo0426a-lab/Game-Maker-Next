import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const SUITS = ["♠️", "♥️", "♦️", "♣️"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function createDeck(): { rank: string; suit: string; color: string; faceUp: boolean }[] {
  const deck: { rank: string; suit: string; color: string; faceUp: boolean }[] = [];
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push({ rank: r, suit: s, color: s === "♠️" || s === "♣️" ? "black" : "red", faceUp: false });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

function rankValue(r: string) { return RANKS.indexOf(r); }

export default function Solitaire() {
  const [stock, setStock] = useState<{ rank: string; suit: string; color: string; faceUp: boolean }[]>([]);
  const [waste, setWaste] = useState<{ rank: string; suit: string; color: string; faceUp: boolean }[]>([]);
  const [tableau, setTableau] = useState<{ rank: string; suit: string; color: string; faceUp: boolean }[][]>([]);
  const [foundations, setFoundations] = useState<{ rank: string; suit: string; color: string; faceUp: boolean }[][]>([[], [], [], []]);
  const [selected, setSelected] = useState<{ col: number; row: number } | null>(null);
  const [selectedSource, setSelectedSource] = useState<"waste" | null>(null);
  const { addPlay } = useGameHistory();

  const init = useCallback(() => {
    const deck = createDeck();
    const tab: typeof tableau = [];
    let idx = 0;
    for (let c = 0; c < 7; c++) {
      tab[c] = [];
      for (let r = 0; r <= c; r++) {
        tab[c].push({ ...deck[idx++], faceUp: r === c });
      }
    }
    setTableau(tab);
    setStock(deck.slice(idx).map(c => ({ ...c, faceUp: false })));
    setWaste([]);
    setFoundations([[], [], [], []]);
    setSelected(null);
    setSelectedSource(null);
  }, []);

  const [initialized, setInitialized] = useState(false);
  if (!initialized) { init(); setInitialized(true); }

  const draw = () => {
    if (stock.length === 0) {
      if (waste.length === 0) return;
      setStock(waste.map(c => ({ ...c, faceUp: false })).reverse());
      setWaste([]);
      return;
    }
    const card = { ...stock[stock.length - 1], faceUp: true };
    setStock(prev => prev.slice(0, -1));
    setWaste(prev => [...prev, card]);
  };

  const canPlaceOnTableau = (card: typeof waste[0], target: typeof waste[0] | null) => {
    if (!target) return card.rank === "K";
    const tv = rankValue(target.rank);
    const cv = rankValue(card.rank);
    return cv === tv - 1 && card.color !== target.color;
  };

  const canPlaceOnFoundation = (card: typeof waste[0], pile: typeof waste[0][]) => {
    if (pile.length === 0) return card.rank === "A";
    const top = pile[pile.length - 1];
    return card.suit === top.suit && rankValue(card.rank) === rankValue(top.rank) + 1;
  };

  const isWon = foundations.every(p => p.length === 13);

  const clickWaste = () => {
    if (selectedSource === "waste") { setSelected(null); setSelectedSource(null); return; }
    if (waste.length === 0) return;
    setSelectedSource("waste");
    setSelected(null);
  };

  const clickTableau = (col: number, row: number) => {
    const card = tableau[col][row];
    if (!card.faceUp) return;
    if (selectedSource === "waste" && waste.length > 0) {
      const wc = waste[waste.length - 1];
      if (canPlaceOnTableau(wc, card)) {
        const nt = tableau.map((c, ci) => ci === col ? [...c, wc] : [...c]);
        setTableau(nt);
        setWaste(prev => prev.slice(0, -1));
        setSelected(null); setSelectedSource(null);
        if (isWon) addPlay("solitaire");
      }
      return;
    }
    if (selected && selected.col === col && selected.row === row) {
      setSelected(null); return;
    }
    if (selected) {
      const scard = tableau[selected.col][selected.row];
      if (canPlaceOnTableau(scard, card)) {
        const moving = tableau[selected.col].slice(selected.row);
        const nt = tableau.map((c, ci) => {
          if (ci === col) return [...c, ...moving];
          if (ci === selected.col) return c.slice(0, selected.row);
          return [...c];
        });
        const ns = nt.map((c, ci) => {
          if (ci === selected.col && c.length > 0 && !c[c.length - 1].faceUp) {
            return c.map((card, ri) => ri === c.length - 1 ? { ...card, faceUp: true } : card);
          }
          return c;
        });
        setTableau(ns);
        setSelected(null); setSelectedSource(null);
        if (isWon) addPlay("solitaire");
      }
      return;
    }
    setSelected({ col, row });
    setSelectedSource(null);
  };

  const clickFoundation = (fi: number) => {
    if (selectedSource === "waste" && waste.length > 0) {
      const wc = waste[waste.length - 1];
      if (canPlaceOnFoundation(wc, foundations[fi])) {
        const nf = foundations.map((p, pi) => pi === fi ? [...p, wc] : [...p]);
        setFoundations(nf);
        setWaste(prev => prev.slice(0, -1));
        setSelected(null); setSelectedSource(null);
        if (nf.every(p => p.length === 13)) addPlay("solitaire");
      }
      return;
    }
    if (selected) {
      const scard = tableau[selected.col][selected.row];
      if (selected.row === tableau[selected.col].length - 1 && canPlaceOnFoundation(scard, foundations[fi])) {
        const nf = foundations.map((p, pi) => pi === fi ? [...p, scard] : [...p]);
        const nt = tableau.map((c, ci) => ci === selected.col ? c.slice(0, -1) : [...c]);
        const ns = nt.map((c, ci) => {
          if (ci === selected.col && c.length > 0 && !c[c.length - 1].faceUp) {
            return c.map((card, ri) => ri === c.length - 1 ? { ...card, faceUp: true } : card);
          }
          return c;
        });
        setFoundations(nf);
        setTableau(ns);
        setSelected(null); setSelectedSource(null);
        if (nf.every(p => p.length === 13)) addPlay("solitaire");
      }
    }
  };

  const clickEmptyTableau = (col: number) => {
    if (selectedSource === "waste" && waste.length > 0) {
      const wc = waste[waste.length - 1];
      if (wc.rank === "K") {
        const nt = tableau.map((c, ci) => ci === col ? [wc] : [...c]);
        setTableau(nt);
        setWaste(prev => prev.slice(0, -1));
        setSelected(null); setSelectedSource(null);
      }
      return;
    }
    if (selected) {
      const scard = tableau[selected.col][selected.row];
      if (scard.rank === "K") {
        const moving = tableau[selected.col].slice(selected.row);
        const nt = tableau.map((c, ci) => {
          if (ci === col) return [...moving];
          if (ci === selected.col) return c.slice(0, selected.row);
          return [...c];
        });
        const ns = nt.map((c, ci) => {
          if (ci === selected.col && c.length > 0 && !c[c.length - 1].faceUp) {
            return c.map((card, ri) => ri === c.length - 1 ? { ...card, faceUp: true } : card);
          }
          return c;
        });
        setTableau(ns);
        setSelected(null); setSelectedSource(null);
      }
    }
  };

  return (
    <div className="flex flex-col items-center space-y-3 max-w-4xl mx-auto">
      <div className="flex gap-2 w-full justify-between items-start">
        <div className="flex gap-2">
          <button onClick={draw} className="w-14 h-20 bg-green-800 rounded-lg border-2 border-green-600 flex items-center justify-center text-xl hover:bg-green-700 transition-colors">
            {stock.length > 0 ? "🔄" : waste.length > 0 ? "↩️" : ""}
          </button>
          <button onClick={clickWaste} className={`w-14 h-20 rounded-lg border-2 flex items-center justify-center text-xl transition-all ${selectedSource === "waste" ? "ring-2 ring-primary scale-105" : "border-border bg-white"}`}>
            {waste.length > 0 ? (
              <span className={waste[waste.length - 1].color === "red" ? "text-red-600" : "text-slate-900"}>
                {waste[waste.length - 1].rank}{waste[waste.length - 1].suit}
              </span>
            ) : ""}
          </button>
        </div>
        <div className="flex gap-2">
          {foundations.map((pile, fi) => (
            <button key={fi} onClick={() => clickFoundation(fi)}
              className="w-14 h-20 rounded-lg border-2 border-dashed border-border bg-muted/30 flex items-center justify-center text-xl hover:bg-muted/50">
              {pile.length > 0 ? (
                <span className={pile[pile.length - 1].color === "red" ? "text-red-600" : "text-slate-900"}>
                  {pile[pile.length - 1].rank}{pile[pile.length - 1].suit}
                </span>
              ) : (
                <span className="text-muted-foreground text-xs">{SUITS[fi]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1">
        {tableau.map((col, ci) => (
          <div key={ci} className="w-14 min-h-[80px]" onClick={() => col.length === 0 && clickEmptyTableau(ci)}>
            {col.map((card, ri) => {
              const isSel = selected?.col === ci && selected?.row === ri;
              return (
                <button key={ri} onClick={(e) => { e.stopPropagation(); clickTableau(ci, ri); }}
                  className={`w-14 h-20 rounded-lg border border-border flex items-center justify-center text-lg font-bold transition-all absolute
                    ${card.faceUp ? (card.color === "red" ? "text-red-600 bg-white" : "text-slate-900 bg-white") : "bg-blue-800 text-white"}
                    ${isSel ? "ring-2 ring-primary z-10" : ""}`}
                  style={{ marginTop: ri === 0 ? 0 : -45, position: "relative", zIndex: isSel ? 10 : ri }}>
                  {card.faceUp ? `${card.rank}${card.suit}` : "🂠"}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {foundations.every(p => p.length === 13) && (
        <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-4 text-center">
          <p className="text-xl font-black text-green-700">🎉 クリア！おめでとう！</p>
          <Button onClick={init} className="rounded-full px-8 mt-2">もう一度</Button>
        </div>
      )}
      <Button variant="outline" onClick={init} className="rounded-full">新しいゲーム</Button>
    </div>
  );
}
