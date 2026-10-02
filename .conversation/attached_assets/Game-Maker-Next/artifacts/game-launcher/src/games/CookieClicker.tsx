import { useState, useEffect, useRef, useCallback } from "react";
import { useGameHistory } from "@/context/GameHistoryContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Upgrade = { id: string; name: string; emoji: string; cost: number; cps: number; count: number; desc: string };

const BASE_UPGRADES: Omit<Upgrade, "count">[] = [
  { id: "cursor", name: "カーソル", emoji: "👆", cost: 15, cps: 0.1, desc: "自動クリック" },
  { id: "grandma", name: "おばあちゃん", emoji: "👵", cost: 100, cps: 0.5, desc: "焼き菓子職人" },
  { id: "farm", name: "小麦畑", emoji: "🌾", cost: 500, cps: 4, desc: "大量生産" },
  { id: "mine", name: "鉱山", emoji: "⛏️", cost: 2000, cps: 10, desc: "地底のクッキー層" },
  { id: "factory", name: "工場", emoji: "🏭", cost: 8000, cps: 40, desc: "産業革命" },
  { id: "bank", name: "銀行", emoji: "🏦", cost: 30000, cps: 100, desc: "クッキー経済" },
  { id: "temple", name: "神殿", emoji: "⛩️", cost: 100000, cps: 400, desc: "神々のおやつ" },
  { id: "portal", name: "ポータル", emoji: "🌀", cost: 500000, cps: 1600, desc: "異次元の甘味" },
  { id: "time", name: "タイムマシン", emoji: "⏳", cost: 2000000, cps: 7000, desc: "過去のクッキーを回収" },
  { id: "lab", name: "錬金術ラボ", emoji: "⚗️", cost: 10000000, cps: 30000, desc: "クッキーを金に...逆だ" },
];

const ACHIEVEMENTS = [
  { total: 1, label: "初めての🍪", icon: "🌱" },
  { total: 100, label: "100枚達成！", icon: "🥉" },
  { total: 1000, label: "1,000枚達成！", icon: "🥈" },
  { total: 10000, label: "1万枚達成！", icon: "🥇" },
  { total: 100000, label: "10万枚達成！", icon: "💎" },
  { total: 1000000, label: "100万枚達成！", icon: "👑" },
  { total: 10000000, label: "1,000万枚達成！", icon: "🌟" },
  { total: 100000000, label: "1億枚達成！", icon: "🚀" },
  { total: 1000000000, label: "10億枚達成！", icon: "🌌" },
];

const NEWS_TICKER = [
  "ニュース：クッキー株が史上最高値を更新",
  "ニュース：地元のおばあちゃん、1日1万枚焼く",
  "ニュース：クッキー鉱山で大規模発見",
  "ニュース：ポータルから甘い香りが漂う",
  "ニュース：世界のクッキー消費量が急増",
  "ニュース：クッキー工場、24時間フル稼働",
  "ニュース：神殿でクッキーお供えが流行",
  "ニュース：クッキー銀行、金利0.5%/秒",
  "ニュース：タイムマシンで過去のレシピ発見",
  "ニュース：錬金術師「クッキーは黄金より尊い」",
];

function fmt(n: number) {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + "兆";
  if (n >= 1e8) return (n / 1e8).toFixed(2) + "億";
  if (n >= 1e4) return (n / 1e4).toFixed(1) + "万";
  return Math.floor(n).toLocaleString();
}

function getCost(base: number, count: number) {
  return Math.floor(base * Math.pow(1.15, count));
}

export default function CookieClicker() {
  const [cookies, setCookies] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem("clicker_save") || "{}"); return s.cookies || 0; } catch { return 0; }
  });
  const [total, setTotal] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem("clicker_save") || "{}"); return s.total || 0; } catch { return 0; }
  });
  const [upgrades, setUpgrades] = useState<Upgrade[]>(() => {
    try {
      const s = JSON.parse(localStorage.getItem("clicker_save") || "{}");
      if (s.upgrades) return BASE_UPGRADES.map((u, i) => ({ ...u, count: s.upgrades[i]?.count || 0 }));
    } catch {}
    return BASE_UPGRADES.map(u => ({ ...u, count: 0 }));
  });
  const [clicks, setClicks] = useState<{ id: number; x: number; y: number; val: string }[]>([]);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; vx: number; vy: number; emoji: string; life: number }[]>([]);
  const [goldenCookie, setGoldenCookie] = useState<{ x: number; y: number; id: number } | null>(null);
  const [clickScale, setClickScale] = useState(1);
  const [newsIdx, setNewsIdx] = useState(0);
  const [unlockedAch, setUnlockedAch] = useState<Set<number>>(new Set());
  const nextId = useRef(0);
  const prevTotal = useRef(total);
  const cookieBtnRef = useRef<HTMLButtonElement>(null);
  const { addPlay } = useGameHistory();

  const cps = upgrades.reduce((s, u) => s + u.cps * u.count, 0);
  const cpc = 1 + upgrades[0].count * 0.1;

  // Auto-save
  useEffect(() => {
    const t = setInterval(() => {
      localStorage.setItem("clicker_save", JSON.stringify({ cookies, total, upgrades: upgrades.map(u => ({ count: u.count })) }));
    }, 5000);
    return () => clearInterval(t);
  }, [cookies, total, upgrades]);

  // CPS tick
  useEffect(() => {
    if (cps === 0) return;
    const t = setInterval(() => { setCookies((c: number) => c + cps / 20); setTotal((tt: number) => tt + cps / 20); }, 50);
    return () => clearInterval(t);
  }, [cps]);

  // Achievements
  useEffect(() => {
    for (let i = ACHIEVEMENTS.length - 1; i >= 0; i--) {
      const ach = ACHIEVEMENTS[i];
      if (total >= ach.total && prevTotal.current < ach.total && !unlockedAch.has(i)) {
        setUnlockedAch(prev => new Set([...prev, i]));
        toast.success(`${ach.icon} ${ach.label}`, { duration: 4000, position: "top-center" });
        addPlay("clicker", Math.floor(total));
        break;
      }
    }
    prevTotal.current = total;
  }, [total, addPlay, unlockedAch]);

  // Golden cookie spawn
  useEffect(() => {
    const t = setInterval(() => {
      if (!goldenCookie && Math.random() < 0.3) {
        const id = nextId.current++;
        const x = 40 + Math.random() * 60;
        const y = 10 + Math.random() * 70;
        setGoldenCookie({ x, y, id });
        setTimeout(() => setGoldenCookie(gc => gc?.id === id ? null : gc), 7000);
      }
    }, 10000);
    return () => clearInterval(t);
  }, [goldenCookie]);

  // News ticker
  useEffect(() => {
    const t = setInterval(() => setNewsIdx(i => (i + 1) % NEWS_TICKER.length), 8000);
    return () => clearInterval(t);
  }, []);

  const spawnParticles = useCallback((x: number, y: number, count: number, emoji: string) => {
    const newParts = Array.from({ length: count }, () => ({
      id: nextId.current++,
      x, y,
      vx: (Math.random() - 0.5) * 8,
      vy: -Math.random() * 6 - 2,
      emoji,
      life: 1.0,
    }));
    setParticles(prev => [...prev, ...newParts]);
  }, []);

  useEffect(() => {
    if (particles.length === 0) return;
    const t = setInterval(() => {
      setParticles(prev => prev
        .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.3, life: p.life - 0.03 }))
        .filter(p => p.life > 0)
      );
    }, 50);
    return () => clearInterval(t);
  }, [particles.length]);

  const click = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const id = nextId.current++;
    const val = Math.floor(cpc);
    setCookies((c: number) => c + cpc); setTotal((tt: number) => tt + cpc);
    setClicks(prev => [...prev, { id, x, y, val: `+${val}` }]);
    setTimeout(() => setClicks(prev => prev.filter(c => c.id !== id)), 800);
    spawnParticles(x, y, 3 + Math.floor(Math.random() * 3), "🍪");
    setClickScale(0.88);
    setTimeout(() => setClickScale(1), 120);
  };

  const clickGolden = () => {
    if (!goldenCookie) return;
    const bonus = Math.max(500, Math.floor(cps * 60 + total * 0.05));
    setCookies((c: number) => c + bonus); setTotal((tt: number) => tt + bonus);
    setGoldenCookie(null);
    toast.success(`🌟 ゴールデンクッキー！ +${fmt(bonus)}`, { duration: 3000, position: "top-center" });
    if (cookieBtnRef.current) {
      const rect = cookieBtnRef.current.getBoundingClientRect();
      spawnParticles(rect.width / 2, rect.height / 2, 15, "⭐");
    }
  };

  const buy = (i: number) => {
    const cost = getCost(upgrades[i].cost, upgrades[i].count);
    if (cookies < cost) return;
    setCookies((c: number) => c - cost);
    setUpgrades(prev => prev.map((u, j) => j === i ? { ...u, count: u.count + 1 } : u));
    // Small feedback
    if (cookieBtnRef.current) {
      const rect = cookieBtnRef.current.getBoundingClientRect();
      spawnParticles(rect.width / 2, rect.height / 2, 5, upgrades[i].emoji);
    }
  };

  const resetSave = () => {
    if (!confirm("本当にリセットしますか？すべての進捗が消えます。")) return;
    localStorage.removeItem("clicker_save");
    setCookies(0); setTotal(0);
    setUpgrades(BASE_UPGRADES.map(u => ({ ...u, count: 0 })));
    setUnlockedAch(new Set());
    prevTotal.current = 0;
  };

  return (
    <div className="flex gap-4 max-w-3xl mx-auto w-full h-[520px]">
      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-3 relative overflow-hidden">
        {/* Golden cookie */}
        {goldenCookie && (
          <button
            onClick={clickGolden}
            className="absolute z-30 text-5xl animate-pulse cursor-pointer hover:scale-125 transition-transform"
            style={{ left: `${goldenCookie.x}%`, top: `${goldenCookie.y}%` }}
          >
            🌟
          </button>
        )}

        {/* Stats */}
        <div className="text-center mb-2 space-y-1">
          <p className="text-4xl font-black text-foreground drop-shadow-sm">{fmt(cookies)} 🍪</p>
          <p className="text-sm text-muted-foreground space-x-2">
            <span>合計: {fmt(total)}</span>
            <span>|</span>
            <span className="text-green-600 font-bold">{cps.toFixed(1)}/秒</span>
            <span>|</span>
            <span>クリック: +{cpc.toFixed(1)}</span>
          </p>
        </div>

        {/* Cookie */}
        <div className="relative">
          <button
            ref={cookieBtnRef}
            onClick={click}
            className="text-9xl hover:scale-95 active:scale-90 transition-all duration-100 cursor-pointer select-none filter hover:drop-shadow-2xl"
            style={{ transform: `scale(${clickScale})` }}
          >
            🍪
          </button>
          {clicks.map(c => (
            <div key={c.id} className="absolute text-lg font-black text-amber-600 pointer-events-none animate-float-up"
              style={{ left: c.x, top: c.y }}>
              {c.val}
            </div>
          ))}
          {particles.map(p => (
            <div key={p.id} className="absolute text-xl pointer-events-none"
              style={{ left: p.x, top: p.y, opacity: p.life, transform: `rotate(${p.life * 360}deg)` }}>
              {p.emoji}
            </div>
          ))}
        </div>

        {/* Achievements bar */}
        <div className="flex flex-wrap justify-center gap-1 mt-2 max-w-xs">
          {ACHIEVEMENTS.filter((_, i) => unlockedAch.has(i)).slice(-5).map((a, i) => (
            <span key={i} className="text-xl animate-bounce" title={a.label}>{a.icon}</span>
          ))}
        </div>

        {/* News ticker */}
        <div className="absolute bottom-0 left-0 right-0 bg-amber-50 border-t border-amber-200 px-3 py-1.5">
          <p className="text-xs text-amber-700 font-medium truncate animate-pulse">{NEWS_TICKER[newsIdx]}</p>
        </div>
      </div>

      {/* Upgrades panel */}
      <div className="w-56 overflow-y-auto space-y-1.5 py-1 pr-1 flex flex-col">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-black text-muted-foreground uppercase">アップグレード</p>
          <button onClick={resetSave} className="text-[10px] text-muted-foreground hover:text-destructive transition-colors">リセット</button>
        </div>
        {upgrades.map((u, i) => {
          const cost = getCost(u.cost, u.count);
          const canAfford = cookies >= cost;
          const eff = u.cps > 0 ? (cost / u.cps).toFixed(0) : "∞";
          return (
            <button key={u.id} onClick={() => buy(i)}
              className={`w-full flex items-center gap-2 p-2 rounded-xl border-2 transition-all text-left group
                ${canAfford ? "border-primary bg-primary/5 hover:bg-primary/15 hover:scale-[1.02]" : "border-border bg-muted/30 opacity-55 grayscale"}`}>
              <span className="text-2xl group-hover:scale-110 transition-transform">{u.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-foreground truncate">{u.name} <span className="text-muted-foreground font-normal">×{u.count}</span></p>
                <p className="text-[10px] text-muted-foreground">{fmt(cost)}🍪 | +{u.cps}/秒 | 効率:{eff}</p>
                <p className="text-[10px] text-muted-foreground/70">{u.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      <style>{`
        .animate-float-up { animation: floatUp 0.8s ease-out forwards; }
        @keyframes floatUp { 0% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(-60px) scale(1.3); } }
      `}</style>
    </div>
  );
}
