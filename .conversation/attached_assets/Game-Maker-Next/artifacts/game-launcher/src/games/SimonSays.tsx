import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const COLORS = [
  { id: 0, color: "bg-green-500", active: "bg-green-300", label: "グリーン" },
  { id: 1, color: "bg-red-500", active: "bg-red-300", label: "レッド" },
  { id: 2, color: "bg-yellow-400", active: "bg-yellow-200", label: "イエロー" },
  { id: 3, color: "bg-blue-500", active: "bg-blue-300", label: "ブルー" },
];

export default function SimonSays() {
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerSeq, setPlayerSeq] = useState<number[]>([]);
  const [activeColor, setActiveColor] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "showing" | "input" | "gameover">("idle");
  const [level, setLevel] = useState(0);
  const [bestLevel, setBestLevel] = useState(() => parseInt(localStorage.getItem("simon_best") || "0"));
  const { addPlay } = useGameHistory();
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = () => timeouts.current.forEach(clearTimeout);

  const showSequence = useCallback((seq: number[]) => {
    setPhase("showing");
    setPlayerSeq([]);
    const base = 600 - Math.min(seq.length * 15, 400);
    seq.forEach((color, i) => {
      const t1 = setTimeout(() => setActiveColor(color), i * base);
      const t2 = setTimeout(() => setActiveColor(null), i * base + base * 0.5);
      timeouts.current.push(t1, t2);
    });
    const t3 = setTimeout(() => setPhase("input"), seq.length * base + 200);
    timeouts.current.push(t3);
  }, []);

  const start = useCallback(() => {
    clear();
    const first = Math.floor(Math.random() * 4);
    const seq = [first];
    setSequence(seq);
    setLevel(1);
    setTimeout(() => showSequence(seq), 500);
  }, [showSequence]);

  const handlePress = useCallback((id: number) => {
    if (phase !== "input") return;
    setActiveColor(id);
    setTimeout(() => setActiveColor(null), 200);
    const newSeq = [...playerSeq, id];
    const idx = newSeq.length - 1;
    if (newSeq[idx] !== sequence[idx]) {
      const lv = sequence.length;
      const best = Math.max(lv - 1, parseInt(localStorage.getItem("simon_best") || "0"));
      localStorage.setItem("simon_best", String(best));
      setBestLevel(best);
      addPlay("simonsays", lv - 1);
      setPhase("gameover");
      return;
    }
    if (newSeq.length === sequence.length) {
      const nextSeq = [...sequence, Math.floor(Math.random() * 4)];
      setSequence(nextSeq);
      setLevel(nextSeq.length);
      setTimeout(() => showSequence(nextSeq), 800);
    } else {
      setPlayerSeq(newSeq);
    }
  }, [phase, playerSeq, sequence, showSequence, addPlay]);

  useEffect(() => () => clear(), []);

  return (
    <div className="flex flex-col items-center space-y-6 max-w-xs mx-auto">
      <div className="flex gap-6 text-center">
        <div><p className="text-xs text-muted-foreground font-bold uppercase">レベル</p><p className="text-3xl font-black text-foreground">{level}</p></div>
        <div><p className="text-xs text-muted-foreground font-bold uppercase">最高</p><p className="text-3xl font-black text-foreground">{bestLevel}</p></div>
      </div>

      <div className="relative w-64 h-64">
        <div className="absolute inset-0 rounded-full border-4 border-gray-200 bg-gray-100" />
        <div className="absolute inset-4 rounded-full bg-gray-800 z-10 flex items-center justify-center">
          <span className="text-white text-xs font-bold">{phase === "showing" ? "見て！" : phase === "input" ? "タップ！" : phase === "gameover" ? "ミス！" : ""}</span>
        </div>
        {COLORS.map((c, i) => {
          const positions = ["-top-1 -left-1", "-top-1 -right-1", "-bottom-1 -left-1", "-bottom-1 -right-1"];
          const rounds = ["rounded-tl-full", "rounded-tr-full", "rounded-bl-full", "rounded-br-full"];
          return (
            <button key={c.id} onClick={() => handlePress(c.id)}
              className={`absolute w-32 h-32 ${positions[i]} ${rounds[i]} transition-all duration-150
                ${activeColor === c.id ? c.active + " scale-105" : c.color}
                ${phase === "input" ? "cursor-pointer hover:brightness-110" : "cursor-default"}
              `} />
          );
        })}
      </div>

      {phase === "idle" && (
        <Button onClick={start} size="lg" className="rounded-full px-10 font-black">スタート！</Button>
      )}
      {phase === "gameover" && (
        <div className="text-center space-y-3">
          <p className="text-xl font-black text-destructive">レベル {level} でミス！</p>
          <Button onClick={start} className="rounded-full px-8">もう一度</Button>
        </div>
      )}
    </div>
  );
}
