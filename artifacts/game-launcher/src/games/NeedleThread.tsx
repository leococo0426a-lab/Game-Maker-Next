import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

// ── 定数 ──────────────────────────────────────────────────
const SPEEDS = [
  { label: "ゆっくり", degPerSec: 40,  color: "#22c55e" },
  { label: "ふつう",   degPerSec: 90,  color: "#3b82f6" },
  { label: "はやい",   degPerSec: 160, color: "#f97316" },
  { label: "激速",     degPerSec: 260, color: "#ef4444" },
];

const DIFFICULTIES = [
  { label: "簡単", desc: "右回りのみ",       color: "#6366f1" },
  { label: "ムズイ", desc: "右↔左 切り替わる", color: "#ec4899" },
];

// ムズイ時の方向切り替え間隔 (ms)
const SWITCH_MIN_MS = 1200;
const SWITCH_MAX_MS = 2800;

const W = 300;
const H = 420;
const CX = W / 2;
const CY = 145;
const DISC_R    = 85;
const PIN_SHAFT = 36;
const HEAD_R    = 5;
const MIN_GAP_DEG = (HEAD_R * 2 * 360) / (2 * Math.PI * (DISC_R + PIN_SHAFT * 0.5)) * 2.4;
const SHOOT_MS  = 120;

// ── ユーティリティ ───────────────────────────────────────
function norm(a: number) { return ((a % 360) + 360) % 360; }
function angDiff(a: number, b: number) {
  const d = Math.abs(norm(a) - norm(b));
  return Math.min(d, 360 - d);
}
function toXY(deg: number, r: number, cx = CX, cy = CY) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function randBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

type Phase = "ready" | "playing" | "shooting" | "gameover";

// ── コンポーネント ───────────────────────────────────────
export default function NeedleThread() {
  const [phase,         setPhase]         = useState<Phase>("ready");
  const [speedIdx,      setSpeedIdx]      = useState(1);
  const [diffIdx,       setDiffIdx]       = useState(0);
  const [displayAngle,  setDisplayAngle]  = useState(0);
  const [displayDir,    setDisplayDir]    = useState(1);   // 表示用: 1=右, -1=左
  const [pins,          setPins]          = useState<number[]>([]);
  const [score,         setScore]         = useState(0);
  const [shootProgress, setShootProgress] = useState(1);
  const [hitPin,        setHitPin]        = useState(false);
  const [bestScore,     setBestScore]     = useState(
    () => parseInt(localStorage.getItem("pinwheel_best") || "0")
  );
  const { addPlay } = useGameHistory();

  // rAF 用 ref
  const discAngleRef   = useRef(0);
  const directionRef   = useRef(1);        // 1=右回り / -1=左回り
  const nextSwitchRef  = useRef(0);        // ムズイ時の次の切替タイムスタンプ
  const pinsRef        = useRef<number[]>([]);
  const phaseRef       = useRef<Phase>("ready");
  const speedIdxRef    = useRef(1);
  const diffIdxRef     = useRef(0);
  const animRef        = useRef<number | null>(null);
  const lastTsRef      = useRef<number | null>(null);
  const shootTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── アニメーションループ ──────────────────────────────
  const stopAnim = useCallback(() => {
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = null; }
  }, []);

  const startAnim = useCallback(() => {
    lastTsRef.current = null;
    const loop = (ts: number) => {
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const dt = Math.min((ts - lastTsRef.current) / 1000, 0.1);
      lastTsRef.current = ts;

      // ムズイ: 方向切り替え
      if (diffIdxRef.current === 1 && ts >= nextSwitchRef.current) {
        directionRef.current *= -1;
        setDisplayDir(directionRef.current);
        nextSwitchRef.current = ts + randBetween(SWITCH_MIN_MS, SWITCH_MAX_MS);
      }

      discAngleRef.current = norm(
        discAngleRef.current + SPEEDS[speedIdxRef.current].degPerSec * dt * directionRef.current
      );
      setDisplayAngle(discAngleRef.current);
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
  }, []);

  // ── ゲーム開始 ─────────────────────────────────────────
  const startGame = useCallback(() => {
    discAngleRef.current  = 0;
    directionRef.current  = 1;
    nextSwitchRef.current = performance.now() + randBetween(SWITCH_MIN_MS, SWITCH_MAX_MS);
    pinsRef.current       = [];
    phaseRef.current      = "playing";
    setPins([]);
    setScore(0);
    setDisplayAngle(0);
    setDisplayDir(1);
    setHitPin(false);
    setShootProgress(1);
    setPhase("playing");
    stopAnim();
    startAnim();
  }, [stopAnim, startAnim]);

  // ── 針を発射 ───────────────────────────────────────────
  const shoot = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    phaseRef.current = "shooting";
    setPhase("shooting");
    setShootProgress(0);

    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / SHOOT_MS, 1);
      setShootProgress(t);
      if (t < 1) {
        shootTimerRef.current = setTimeout(() => tick(performance.now()), 8);
      } else {
        const relAngle = norm(180 - discAngleRef.current);
        const collide  = pinsRef.current.some(p => angDiff(relAngle, p) < MIN_GAP_DEG);
        if (collide) {
          phaseRef.current = "gameover";
          setPhase("gameover");
          setHitPin(true);
          stopAnim();
          const s = pinsRef.current.length;
          setBestScore(prev => {
            const next = Math.max(prev, s);
            localStorage.setItem("pinwheel_best", String(next));
            return next;
          });
          addPlay("needlethread", s);
        } else {
          pinsRef.current = [...pinsRef.current, relAngle];
          setPins([...pinsRef.current]);
          setScore(pinsRef.current.length);
          phaseRef.current = "playing";
          setPhase("playing");
          setShootProgress(1);
        }
      }
    };
    tick(performance.now());
  }, [stopAnim, addPlay]);

  // ref 同期
  useEffect(() => { speedIdxRef.current = speedIdx; }, [speedIdx]);
  useEffect(() => { diffIdxRef.current  = diffIdx;  }, [diffIdx]);

  // スペースキー
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); shoot(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shoot]);

  // クリーンアップ
  useEffect(() => () => {
    stopAnim();
    if (shootTimerRef.current) clearTimeout(shootTimerRef.current);
  }, [stopAnim]);

  // ── 描画用 ────────────────────────────────────────────
  const spd  = SPEEDS[speedIdx];
  const diff = DIFFICULTIES[diffIdx];
  const NEEDLE_START_Y = H - 30;
  const NEEDLE_END_Y   = CY + DISC_R + PIN_SHAFT;
  const needleY = NEEDLE_START_Y - (NEEDLE_START_Y - NEEDLE_END_Y) * shootProgress;

  // 方向矢印: 円盤上に小さな弧矢印を描く
  const ArrowArc = ({ dir, color }: { dir: number; color: string }) => {
    const r = 22;
    // 弧: 30°〜150° (右回り) or 150°〜30° (左回り)
    const startDeg = dir === 1 ? 40  : 140;
    const endDeg   = dir === 1 ? 140 : 40;
    const s = toXY(startDeg, r);
    const e = toXY(endDeg,   r);
    const largeArc = 0;
    const sweep    = dir === 1 ? 1 : 0;
    // 矢印の頭
    const arrowAngle = (endDeg - 90) * (Math.PI / 180);
    const perpAngle  = arrowAngle + (dir === 1 ? -Math.PI / 2 : Math.PI / 2);
    const ax = e.x + 5 * Math.cos(arrowAngle);
    const ay = e.y + 5 * Math.sin(arrowAngle);
    const lx = e.x + 5 * Math.cos(perpAngle + 0.5);
    const ly = e.y + 5 * Math.sin(perpAngle + 0.5);
    const rx2 = e.x + 5 * Math.cos(perpAngle - 0.5);
    const ry2 = e.y + 5 * Math.sin(perpAngle - 0.5);
    return (
      <g opacity={0.7}>
        <path
          d={`M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${e.x} ${e.y}`}
          fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round"
        />
        <polygon points={`${ax},${ay} ${lx},${ly} ${rx2},${ry2}`} fill={color} />
      </g>
    );
  };

  // 速度ピッカー
  const SpeedPicker = () => (
    <div className="flex flex-col items-center gap-1 w-full">
      <p className="text-xs font-bold text-muted-foreground">速さ</p>
      <div className="flex gap-2 flex-wrap justify-center">
        {SPEEDS.map((s, i) => (
          <button key={i} onClick={() => setSpeedIdx(i)}
            className="px-3 py-1 rounded-full text-sm font-bold border-2 transition-all"
            style={speedIdx === i
              ? { backgroundColor: s.color, borderColor: s.color, color: "#fff" }
              : { backgroundColor: "#fff", borderColor: "#e2e8f0", color: "#475569" }}>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );

  // 難易度ピッカー
  const DiffPicker = () => (
    <div className="flex flex-col items-center gap-1 w-full">
      <p className="text-xs font-bold text-muted-foreground">難易度</p>
      <div className="flex gap-3 justify-center">
        {DIFFICULTIES.map((d, i) => (
          <button key={i} onClick={() => setDiffIdx(i)}
            className="px-4 py-1.5 rounded-full text-sm font-bold border-2 transition-all flex flex-col items-center leading-tight"
            style={diffIdx === i
              ? { backgroundColor: d.color, borderColor: d.color, color: "#fff" }
              : { backgroundColor: "#fff", borderColor: "#e2e8f0", color: "#475569" }}>
            <span>{d.label}</span>
            <span className="text-[10px] opacity-70">{d.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Ready ─────────────────────────────────────────────
  if (phase === "ready") {
    return (
      <div className="text-center flex flex-col items-center gap-4">
        <div className="text-6xl">📍</div>
        <h2 className="text-2xl font-black">まち針ゲーム</h2>
        <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
          回転する円盤に<strong>下から針を刺そう！</strong><br />
          クリック・タップ・スペースキーで発射。<br />
          前の針に当たったらゲームオーバー！
        </p>
        {bestScore > 0 && (
          <p className="text-amber-600 font-bold text-sm">🏆 最高記録: {bestScore}本</p>
        )}
        <SpeedPicker />
        <DiffPicker />
        <Button onClick={startGame} className="rounded-full px-10 text-lg font-bold">
          スタート
        </Button>
      </div>
    );
  }

  // ── Game Over ─────────────────────────────────────────
  if (phase === "gameover") {
    return (
      <div className="text-center flex flex-col items-center gap-4">
        <div className="text-6xl animate-bounce">💥</div>
        <h2 className="text-2xl font-black">当たった！</h2>
        <div className="flex items-baseline gap-1 justify-center">
          <span className="text-6xl font-black text-red-500">{score}</span>
          <span className="text-2xl font-bold text-red-400">本</span>
        </div>
        {score > 0 && score >= bestScore && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl px-5 py-2">
            <p className="text-amber-700 font-bold">🏆 新記録！</p>
          </div>
        )}
        <p className="text-sm text-muted-foreground">最高記録: {bestScore}本</p>
        <SpeedPicker />
        <DiffPicker />
        <Button onClick={startGame} className="rounded-full px-10 font-bold">もう一度</Button>
      </div>
    );
  }

  // ── Playing / Shooting ────────────────────────────────
  const isPlaying = phase === "playing" || phase === "shooting";

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      {/* HUD */}
      <div className="flex items-center justify-between w-full max-w-xs px-2">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">刺した針</p>
          <p className="text-2xl font-black">{score}<span className="text-sm ml-0.5">本</span></p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="text-xs font-bold px-3 py-0.5 rounded-full text-white"
            style={{ backgroundColor: spd.color }}>{spd.label}</div>
          <div className="text-xs font-bold px-3 py-0.5 rounded-full text-white"
            style={{ backgroundColor: diff.color }}>
            {diffIdx === 1
              ? (displayDir === 1 ? "→ 右回り" : "← 左回り")
              : "簡単"}
          </div>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">最高</p>
          <p className="text-2xl font-black">{bestScore}<span className="text-sm ml-0.5">本</span></p>
        </div>
      </div>

      {/* ゲームボード */}
      <svg
        width={W} height={H}
        onClick={shoot}
        onTouchEnd={e => { e.preventDefault(); shoot(); }}
        className="cursor-pointer touch-none"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        {/* 外周グロー */}
        <circle cx={CX} cy={CY} r={DISC_R + PIN_SHAFT + HEAD_R + 14}
          fill="none" stroke="#f1f5f9" strokeWidth={14} />

        {/* 円盤本体 */}
        <circle cx={CX} cy={CY} r={DISC_R}
          fill="#f8fafc"
          stroke={hitPin ? "#fca5a5" : "#cbd5e1"}
          strokeWidth={3} />

        {/* 目盛り */}
        {Array.from({ length: 12 }).map((_, i) => {
          const a = i * 30 + displayAngle;
          const inner = toXY(a, DISC_R - 10);
          const outer = toXY(a, DISC_R - 3);
          return <line key={i}
            x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
            stroke="#cbd5e1" strokeWidth={i % 3 === 0 ? 2 : 1} />;
        })}

        {/* 方向矢印（ムズイ時） */}
        {diffIdx === 1 && (
          <ArrowArc dir={displayDir} color={diff.color} />
        )}

        {/* 中心 */}
        <circle cx={CX} cy={CY} r={7} fill="#94a3b8" />
        <circle cx={CX} cy={CY} r={3} fill="#fff" />

        {/* 刺さった針（円盤と一緒に回転） */}
        {pins.map((rel, i) => {
          const absAngle = rel + displayAngle;
          const edge = toXY(absAngle, DISC_R);
          const tip  = toXY(absAngle, DISC_R + PIN_SHAFT);
          const head = toXY(absAngle, DISC_R + PIN_SHAFT + HEAD_R);
          return (
            <g key={i}>
              <line x1={edge.x} y1={edge.y} x2={tip.x} y2={tip.y}
                stroke="#334155" strokeWidth={2} strokeLinecap="round" />
              <circle cx={head.x} cy={head.y} r={HEAD_R}
                fill="#ef4444" stroke="#b91c1c" strokeWidth={1.2} />
            </g>
          );
        })}

        {/* 狙い位置マーカー */}
        {phase === "playing" && (() => {
          const marker = toXY(180, DISC_R + PIN_SHAFT + HEAD_R + 2);
          return <circle cx={marker.x} cy={marker.y} r={3}
            fill="none" stroke={spd.color} strokeWidth={2} opacity={0.6} />;
        })()}

        {/* 射出レール（破線） */}
        <line
          x1={CX} y1={CY + DISC_R + PIN_SHAFT + HEAD_R + 2}
          x2={CX} y2={H - 30 - PIN_SHAFT - HEAD_R}
          stroke="#e2e8f0" strokeWidth={1.5} strokeDasharray="4 4"
        />

        {/* 飛んでいく針 */}
        {isPlaying && (
          <g>
            <line x1={CX} y1={needleY + HEAD_R} x2={CX} y2={needleY + HEAD_R + PIN_SHAFT}
              stroke="#334155" strokeWidth={2} strokeLinecap="round" />
            <circle cx={CX} cy={needleY} r={HEAD_R}
              fill={spd.color} stroke="#1e293b" strokeWidth={1.5} />
          </g>
        )}

        {/* 射出台 */}
        <rect x={CX - 18} y={H - 22} width={36} height={12} rx={6} fill="#e2e8f0" />
        <rect x={CX - 3}  y={H - 32} width={6}  height={12} rx={3} fill="#94a3b8" />
      </svg>

      <p className="text-xs text-muted-foreground">タップ / クリック / スペース で発射</p>
    </div>
  );
}
