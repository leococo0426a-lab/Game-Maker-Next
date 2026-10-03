import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { useGameHistory } from "@/context/GameHistoryContext";
import { Copy, Check, Users } from "lucide-react";
import InviteModal from "@/components/InviteModal";

// ── ワードリスト ──────────────────────────────────────────
const WORDS_ALL: string[][] = [
  ["CAT","DOG","SUN","SEA","RUN","FLY","RED","MAP","CUP","GUN",
   "ICE","JAM","KEY","LOG","NET","OAK","PIG","RAT","TAX","VAN",
   "WAX","ZAP","BIG","BOX","BUS"],
  ["FISH","BIRD","STAR","MOON","TREE","RAIN","FIRE","WAVE","JUMP",
   "KICK","LOCK","MILK","NECK","OPEN","PARK","QUIZ","RING","SHIP",
   "TANK","UNIT","VOTE","WOLF","YARN","ZERO","BAKE","BONE","CAMP"],
  ["SMILE","CLOCK","DANCE","NIGHT","DREAM","STONE","BRAVE","CLEAN",
   "FLOOR","GLOOM","HAPPY","INPUT","JOINT","KNIFE","LIGHT","MAGIC",
   "NURSE","OCEAN","PIZZA","QUEEN","RIVER","SPORT","TOWEL","URBAN"],
  ["SCHOOL","SUMMER","FRIEND","ORANGE","BANANA","BRIDGE","CASTLE",
   "DRAGON","EMPIRE","FOREST","GARDEN","HUNTER","ISLAND","JUNGLE",
   "KITCHEN","LEATHER","MORNING","NERVOUS","OUTSIDE","PAINTER"],
];

function getWord(passes: number, exclude = ""): string {
  const lvl  = Math.min(Math.floor(passes / 3), WORDS_ALL.length - 1);
  const pool = WORDS_ALL[lvl].filter(w => w !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

// 15秒スタート → 2パスごとに1秒減、最低3秒
function timeLimit(passes: number): number {
  return Math.max(15 - Math.floor(passes / 2), 3);
}

function aiCharDelay(): number { return 100 + Math.random() * 160; }

// ── 型 ────────────────────────────────────────────────────
type Phase    = "lobby" | "playing" | "won" | "lost";
type GameMode = "online" | "ai";
type Move     =
  | { type: "bomb_pass";       word: string; passes: number }
  | { type: "exploded" }
  | { type: "typing_progress"; typedLen: number }
  | { type: "typing_mistake" };

const AI_NAMES = [
  "kenta0721","riku_game","haruhi99","shou_play",
  "misaki333","daiki_456","yuika_g","ren2008",
];
function randAIName() { return AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)]; }

// ═══════════════════════════════════════════════════════════
export default function TypingBomb() {
  const [phase,       setPhase]      = useState<Phase>("lobby");
  const [gameMode,    setGameMode]   = useState<GameMode>("online");
  const [oppName,     setOppName]    = useState("");
  const [iHaveBomb,   setIHaveBomb]  = useState(false);
  const [word,        setWord]       = useState("");
  const [typed,       setTyped]      = useState("");
  const [flashRed,    setFlashRed]   = useState(false);
  const [oppWord,     setOppWord]    = useState("");
  const [oppTyped,    setOppTyped]   = useState(0);
  const [oppFlash,    setOppFlash]   = useState(false);
  const [oppTimeLeft, setOppTimeLeft]= useState(0);
  const [passes,      setPasses]     = useState(0);
  const [timeLeft,    setTimeLeft]   = useState(15);
  const [shaking,     setShaking]    = useState(false);
  // "none" | "to-opp" | "to-me"  ── 爆弾が飛ぶ方向
  const [bombFlying,  setBombFlying] = useState<"none"|"to-opp"|"to-me">("none");
  const [inviteOpen,  setInviteOpen] = useState(false);
  const [copied,      setCopied]     = useState(false);
  const { addPlay }                  = useGameHistory();

  // ── refs ──────────────────────────────────────────────
  const iHaveBombRef    = useRef(false);
  const passesRef       = useRef(0);
  const wordRef         = useRef("");
  const typedRef        = useRef("");
  const flashRef        = useRef(false);
  const dangerRolledRef = useRef(false); // 6秒ルーレットは1回だけ
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const oppTimerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const aiSeqRef        = useRef<ReturnType<typeof setTimeout>[]>([]);
  const flashTimerRef   = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const flyTimerRef     = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const phaseRef        = useRef<Phase>("lobby");
  const gameModeRef     = useRef<GameMode>("online");
  const sendMoveRef     = useRef<((d: unknown) => void) | null>(null);

  // ── ユーティリティ ────────────────────────────────────
  const stopTimer    = useCallback(() => { if (timerRef.current)    { clearInterval(timerRef.current); timerRef.current = null; } }, []);
  const stopOppTimer = useCallback(() => { if (oppTimerRef.current) { clearInterval(oppTimerRef.current); oppTimerRef.current = null; } }, []);
  const stopAI       = useCallback(() => {
    aiSeqRef.current.forEach(t => clearTimeout(t));
    aiSeqRef.current = [];
  }, []);

  // ── 爆弾フライトアニメーション ───────────────────────
  const triggerFly = useCallback((dir: "to-opp"|"to-me") => {
    if (flyTimerRef.current) clearTimeout(flyTimerRef.current);
    setBombFlying(dir);
    flyTimerRef.current = setTimeout(() => setBombFlying("none"), 650);
  }, []);

  // ── 自分のタイマー（6秒以下で50%爆発） ──────────────
  const startTimer = useCallback((p: number) => {
    stopTimer();
    dangerRolledRef.current = false;
    const limit = timeLimit(p);
    let current = limit;
    setTimeLeft(limit);
    setShaking(false);
    timerRef.current = setInterval(() => {
      current -= 1;
      setTimeLeft(current);
      if (current <= 4) setShaking(true);

      if (current <= 0) {
        stopTimer();
        if (phaseRef.current !== "playing") return;
        phaseRef.current = "lost";
        setPhase("lost");
        if (gameModeRef.current === "online") {
          sendMoveRef.current?.({ type: "exploded" } satisfies Move);
        }
        addPlay("typingbomb", passesRef.current);
      }
    }, 1000);
  }, [stopTimer, addPlay]);

  // ── 相手のタイマー表示 ────────────────────────────────
  const startOppTimer = useCallback((p: number) => {
    stopOppTimer();
    const limit = timeLimit(p);
    let current = limit;
    setOppTimeLeft(limit);
    oppTimerRef.current = setInterval(() => {
      current -= 1;
      setOppTimeLeft(current);
      if (current <= 0) stopOppTimer();
    }, 1000);
  }, [stopOppTimer]);

  const startTimerRef = useRef<((p: number) => void) | null>(null);
  useEffect(() => { startTimerRef.current = startTimer; }, [startTimer]);

  // ── AI タイピングシミュレーション ────────────────────
  const simulateAITyping = useCallback((
    aiWord: string, aiPasses: number,
    onPass: (nextWord: string, newPasses: number) => void,
  ) => {
    stopAI();
    setOppWord(aiWord);
    setOppTyped(0);
    setOppFlash(false);

    const limit      = timeLimit(aiPasses) * 1000;
    // 最初から50%でパニック確定（間違いを繰り返してタイムオーバー）
    const willPanic  = Math.random() < 0.5;
    const hasMistake = !willPanic && Math.random() < 0.30;
    const mistakeAt  = hasMistake ? Math.floor(Math.random() * aiWord.length) : -1;

    let elapsed     = 0;
    let charIndex   = 0;
    let mistakeDone = false;

    // ─ パニックモード：間違いを繰り返してタイムオーバー ─
    const panicLoop = () => {
      if (phaseRef.current !== "playing") return;
      if (elapsed >= limit - 100) {
        stopOppTimer();
        setOppTimeLeft(0);
        phaseRef.current = "won";
        setPhase("won");
        addPlay("typingbomb", passesRef.current);
        return;
      }
      // 少し打ってミス → リセット → 繰り返し
      const partialChars = Math.floor(Math.random() * (aiWord.length - 1));
      setOppTyped(partialChars);
      const mistakeDelay = partialChars * aiCharDelay() + 200;
      const t = setTimeout(() => {
        if (phaseRef.current !== "playing") return;
        setOppFlash(true);
        const t2 = setTimeout(() => {
          if (phaseRef.current !== "playing") return;
          setOppFlash(false);
          setOppTyped(0);
          charIndex = 0;
          const nextDelay = 300 + Math.random() * 400;
          elapsed += 500 + nextDelay;
          const t3 = setTimeout(panicLoop, nextDelay);
          aiSeqRef.current.push(t3);
        }, 500);
        aiSeqRef.current.push(t2);
      }, mistakeDelay);
      aiSeqRef.current.push(t);
      elapsed += mistakeDelay;
    };

    const typeNext = () => {
      if (phaseRef.current !== "playing") return;

      if (charIndex === mistakeAt && !mistakeDone) {
        mistakeDone = true;
        setOppFlash(true);
        const t = setTimeout(() => {
          setOppFlash(false);
          charIndex = 0;
          setOppTyped(0);
          const delay = aiCharDelay();
          elapsed += delay + 500;
          const t2 = setTimeout(typeNext, delay);
          aiSeqRef.current.push(t2);
        }, 500);
        aiSeqRef.current.push(t);
        elapsed += 500;
        return;
      }

      charIndex++;
      setOppTyped(charIndex);

      if (charIndex >= aiWord.length) {
        const newPasses = aiPasses + 1;
        const nextWord  = getWord(newPasses, aiWord);
        setTimeout(() => {
          if (phaseRef.current !== "playing") return;
          onPass(nextWord, newPasses);
        }, 200);
        return;
      }

      const delay = aiCharDelay();
      elapsed += delay;
      const t = setTimeout(typeNext, delay);
      aiSeqRef.current.push(t);
    };

    const firstDelay = 600 + Math.random() * 600;
    elapsed += firstDelay;
    const t0 = setTimeout(willPanic ? panicLoop : typeNext, firstDelay);
    aiSeqRef.current.push(t0);
  }, [stopAI, stopOppTimer, addPlay]);

  // ── 爆弾を受け取る（自分） ───────────────────────────
  const receiveBomb = useCallback((newWord: string, newPasses: number) => {
    stopOppTimer();
    dangerRolledRef.current = false;
    passesRef.current    = newPasses;
    wordRef.current      = newWord;
    iHaveBombRef.current = true;
    typedRef.current     = "";
    setPasses(newPasses);
    setWord(newWord);
    setTyped("");
    setFlashRed(false);
    setShaking(false);
    setIHaveBomb(true);
    triggerFly("to-me");
    startTimerRef.current?.(newPasses);
  }, [stopOppTimer, triggerFly]);

  // ── 爆弾を渡す（自分 → 相手） ───────────────────────
  const passBomb = useCallback(() => {
    stopTimer();
    setShaking(false);
    const newPasses = passesRef.current + 1;
    const nextWord  = getWord(newPasses, wordRef.current);
    passesRef.current    = newPasses;
    iHaveBombRef.current = false;
    typedRef.current     = "";
    setPasses(newPasses);
    setTyped("");
    setIHaveBomb(false);
    setWord("💨 渡した！");
    triggerFly("to-opp");

    if (gameModeRef.current === "ai") {
      startOppTimer(newPasses);
      simulateAITyping(nextWord, newPasses, (nw, np) => receiveBomb(nw, np));
    } else {
      startOppTimer(newPasses);
      sendMoveRef.current?.({ type: "bomb_pass", word: nextWord, passes: newPasses } satisfies Move);
    }
  }, [stopTimer, triggerFly, startOppTimer, simulateAITyping, receiveBomb]);

  // ── キーボードリスナー ───────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phaseRef.current !== "playing") return;
      if (!iHaveBombRef.current) return;
      if (flashRef.current) return;
      const key = e.key.toUpperCase();
      if (!/^[A-Z]$/.test(key)) return;

      const current = typedRef.current;
      const target  = wordRef.current;

      if (key === target[current.length]) {
        const next = current + key;
        typedRef.current = next;
        setTyped(next);
        sendMoveRef.current?.({ type: "typing_progress", typedLen: next.length } satisfies Move);
        if (next.length === target.length) passBomb();
      } else {
        flashRef.current = true;
        setFlashRed(true);
        sendMoveRef.current?.({ type: "typing_mistake" } satisfies Move);
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        flashTimerRef.current = setTimeout(() => {
          flashRef.current = false;
          setFlashRed(false);
          typedRef.current = "";
          setTyped("");
        }, 500);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [passBomb]);

  // ── オンライン：受信 ──────────────────────────────────
  const handleMove = useCallback((raw: unknown) => {
    const msg = raw as Move;
    if (msg.type === "bomb_pass") { stopOppTimer(); stopAI(); receiveBomb(msg.word, msg.passes); }
    if (msg.type === "exploded")  { stopTimer(); stopOppTimer(); stopAI(); phaseRef.current = "won"; setPhase("won"); addPlay("typingbomb", passesRef.current); }
    if (msg.type === "typing_progress") setOppTyped(msg.typedLen);
    if (msg.type === "typing_mistake")  { setOppFlash(true); setTimeout(() => { setOppFlash(false); setOppTyped(0); }, 500); }
  }, [stopTimer, stopOppTimer, stopAI, addPlay, receiveBomb]);

  const handleStart = useCallback((pid: string) => {
    phaseRef.current     = "playing";
    passesRef.current    = 0;
    iHaveBombRef.current = pid === "1";
    typedRef.current     = "";
    dangerRolledRef.current = false;
    setPhase("playing"); setPasses(0);
    setTyped(""); setFlashRed(false); setShaking(false);
    setOppTyped(0); setOppFlash(false);
    if (pid === "1") {
      const fw = getWord(0); wordRef.current = fw;
      setWord(fw); setIHaveBomb(true);
      setOppWord("⏳ 爆弾を待っています");
    } else {
      wordRef.current = ""; setWord("💣 爆弾が来るまで待て…");
      setIHaveBomb(false); setOppWord("⏳ 爆弾を待っています");
    }
  }, []);

  const handleOpponentLeft = useCallback(() => { stopTimer(); stopOppTimer(); stopAI(); }, [stopTimer, stopOppTimer, stopAI]);

  const { status, roomCode, playerId, joinInput, setJoinInput,
          error, createRoom, joinRoom, sendMove, disconnect } =
    useMultiplayer({ gameId: "typingbomb", onMove: handleMove, onStart: handleStart, onOpponentLeft: handleOpponentLeft });

  useEffect(() => { sendMoveRef.current = sendMove; }, [sendMove]);
  useEffect(() => { gameModeRef.current = gameMode; }, [gameMode]);

  useEffect(() => {
    if (status === "playing" && playerId === "1" && phase === "playing" && iHaveBomb) {
      startTimerRef.current?.(0);
    }
  }, [status, playerId, phase, iHaveBomb]);

  const startAiGame = useCallback(() => {
    disconnect();
    stopTimer();
    stopOppTimer();
    stopAI();
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    if (flyTimerRef.current) clearTimeout(flyTimerRef.current);
    flashTimerRef.current = null;
    flyTimerRef.current = null;

    const firstWord = getWord(0);
    gameModeRef.current = "ai";
    phaseRef.current = "playing";
    passesRef.current = 0;
    iHaveBombRef.current = true;
    wordRef.current = firstWord;
    typedRef.current = "";
    flashRef.current = false;
    dangerRolledRef.current = false;

    setGameMode("ai");
    setOppName(randAIName());
    setPhase("playing");
    setPasses(0);
    setIHaveBomb(true);
    setWord(firstWord);
    setTyped("");
    setFlashRed(false);
    setOppWord("⏳ 爆弾を待っています");
    setOppTyped(0);
    setOppFlash(false);
    setOppTimeLeft(15);
    setShaking(false);
    setBombFlying("none");
    startTimer(0);
  }, [disconnect, stopTimer, stopOppTimer, stopAI, startTimer]);

  useEffect(() => () => {
    stopTimer(); stopOppTimer(); stopAI();
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    if (flyTimerRef.current)   clearTimeout(flyTimerRef.current);
  }, [stopTimer, stopOppTimer, stopAI]);

  const copyCode = () => { navigator.clipboard.writeText(roomCode); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  // ── リング計算 ────────────────────────────────────────
  const activeLimit = iHaveBomb ? timeLimit(passes) : timeLimit(passes);
  const activeFrac  = iHaveBomb
    ? Math.max(timeLeft / activeLimit, 0)
    : Math.max(oppTimeLeft / activeLimit, 0);
  const activeTime  = iHaveBomb ? timeLeft : oppTimeLeft;
  const BR = 46, Bcirc = 2 * Math.PI * BR; // big ring for central bomb
  const SR = 26, Scirc = 2 * Math.PI * SR; // small ring for cards

  const colorOf = (t: number) => t <= 3 ? "#ef4444" : t <= 6 ? "#f97316" : "#22c55e";
  const myColor  = colorOf(timeLeft);
  const oppColor = colorOf(oppTimeLeft);
  const bombColor = iHaveBomb ? myColor : oppColor;

  // ═══════════════════════════════════════════════════════
  // ロビー
  // ═══════════════════════════════════════════════════════
  const isLobby = (gameMode === "online" && (status === "idle" || status === "connecting" || status === "error")) || phase === "lobby";
  if (isLobby) {
    return (
      <div className="flex flex-col items-center gap-6 text-center max-w-sm mx-auto">
        <div className="text-6xl">💣</div>
        <h2 className="text-2xl font-black">タイピング爆弾</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          お題の文字をキーボードで打って爆弾を送れ！<br />
          タイマーが切れたら爆発💥　持ってるほうが負け！<br />
          <span className="text-xs text-orange-500 font-bold">最初15秒・パスするたびに1秒減っていく…</span>
        </p>
        {error && <p className="text-sm text-destructive font-bold bg-destructive/10 px-4 py-2 rounded-xl">{error}</p>}
        <Button onClick={startAiGame}
          className="w-full rounded-full py-5 text-base font-black bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0">
          🤖 AIと対戦
        </Button>
        <div className="relative w-full">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center"><span className="bg-background px-3 text-xs text-muted-foreground">または友達と</span></div>
        </div>
        <div className="flex flex-col gap-3 w-full">
          <Button onClick={() => { setGameMode("online"); createRoom(); }} variant="outline" className="rounded-full py-4 font-bold">🏠 ルームを作る</Button>
          <div className="flex gap-2">
            <Input placeholder="ルームコード（6文字）" value={joinInput}
              onChange={e => setJoinInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && joinInput.length === 6 && joinRoom(joinInput)}
              maxLength={6} className="rounded-xl font-mono text-center tracking-widest" />
            <Button onClick={() => joinRoom(joinInput)} disabled={joinInput.length !== 6} className="rounded-xl shrink-0">参加</Button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // 待機中
  // ═══════════════════════════════════════════════════════
  if (status === "waiting") {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="text-6xl animate-bounce">💣</div>
        <h2 className="text-2xl font-black">待機中…</h2>
        <p className="text-muted-foreground text-sm">友達がルームコードを入力するまで待とう</p>
        <div className="flex items-center gap-2 bg-primary/10 border-2 border-primary/30 rounded-2xl px-6 py-4">
          <span className="font-mono text-3xl font-black tracking-widest text-primary">{roomCode}</span>
          <button onClick={copyCode} className="text-primary hover:text-primary/70 ml-2">
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
        <Button variant="outline" className="rounded-full gap-2" onClick={() => setInviteOpen(true)}><Users className="w-4 h-4" />友達を招待</Button>
        {inviteOpen && <InviteModal roomCode={roomCode} gameName="タイピング爆弾" onClose={() => setInviteOpen(false)} />}
      </div>
    );
  }

  if (status === "ended" && gameMode === "online") {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="text-5xl">👋</div>
        <h2 className="text-2xl font-black text-muted-foreground">相手が切断しました</h2>
        <Button onClick={disconnect} className="rounded-full px-8">ロビーへ戻る</Button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // 結果
  // ═══════════════════════════════════════════════════════
  if (phase === "won" || phase === "lost") {
    const handleRetry = () => {
      stopTimer(); stopOppTimer(); stopAI();
      setPhase("lobby"); phaseRef.current = "lobby";
      setPasses(0); setTyped(""); setShaking(false); setFlashRed(false);
      setOppTyped(0); setOppFlash(false); setBombFlying("none");
      if (gameMode === "online") disconnect();
    };
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="text-7xl">{phase === "won" ? "🏆" : "💥"}</div>
        <h2 className="text-3xl font-black">{phase === "won" ? "勝ち！！" : "爆発した…"}</h2>
        <p className="text-muted-foreground text-sm">合計 <span className="font-black text-foreground">{passes}</span> 回 爆弾を渡した</p>
        <Button onClick={handleRetry} className="rounded-full px-8 font-bold">もう一度</Button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // プレイ中
  // ═══════════════════════════════════════════════════════

  const CharBlock = ({ ch, state }: { ch: string; state: "correct"|"wrong"|"pending" }) => (
    <span className={`flex items-center justify-center rounded-lg font-black border-2 transition-all duration-100 text-base w-8 h-9 ${
      state === "correct" ? "bg-green-100 border-green-400 text-green-700 scale-105"
      : state === "wrong" ? "bg-red-100 border-red-400 text-red-600 scale-95"
      : "bg-muted border-border text-muted-foreground"
    }`}>{ch}</span>
  );

  const dangerZone = activeTime <= 6;

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-2xl mx-auto select-none relative">

      {/* ── 爆弾フライトオーバーレイ ── */}
      {bombFlying !== "none" && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
          <div
            className="absolute top-1/2 -translate-y-1/2 text-5xl"
            style={{ animation: `${bombFlying === "to-opp" ? "flyRight" : "flyLeft"} 0.65s ease-in-out forwards` }}
          >
            💣
          </div>
        </div>
      )}

      {/* ── HUD ── */}
      <div className="flex items-center justify-between w-full px-2 text-sm">
        <span className="font-bold text-muted-foreground">パス <span className="text-foreground text-lg font-black">{passes}</span></span>
        <span className="font-bold text-muted-foreground">次の制限 <span className="text-foreground font-black">{timeLimit(passes + 1)}s</span></span>
      </div>

      {/* ── 中央 爆弾 + タイマーリング ── */}
      <div className="flex flex-col items-center gap-1">
        <div className="relative flex items-center justify-center">
          {/* 外側のグロー（危険ゾーン） */}
          {dangerZone && (
            <div className="absolute w-36 h-36 rounded-full animate-ping"
              style={{ backgroundColor: bombColor, opacity: 0.15 }} />
          )}
          {/* タイマーリングSVG */}
          <svg width={120} height={120} className="-rotate-90">
            <circle cx={60} cy={60} r={BR} fill="none" stroke="#e2e8f0" strokeWidth={8} />
            <circle cx={60} cy={60} r={BR} fill="none"
              stroke={bombColor} strokeWidth={8}
              strokeDasharray={`${activeFrac * Bcirc} ${Bcirc}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.9s linear, stroke 0.3s" }}
            />
          </svg>
          {/* 爆弾絵文字 */}
          <div className={`absolute text-5xl transition-transform
            ${shaking && iHaveBomb ? "animate-[bombShake_0.12s_infinite]" : ""}
            ${iHaveBomb ? "scale-110" : "scale-90 opacity-70"}`}>
            💣
          </div>
          {/* タイマー数字（爆弾の上に重ねる） */}
          <div className={`absolute text-xl font-black tabular-nums`}
            style={{
              color: bombColor,
              textShadow: "0 0 8px white, 0 0 4px white",
              marginTop: 4,
              animation: dangerZone ? "pulse 0.5s infinite" : "none",
            }}>
            {activeTime}
          </div>
        </div>
        {/* 誰が持ってるか */}
        <p className="text-xs font-black" style={{ color: bombColor }}>
          {iHaveBomb
            ? dangerZone ? "⚠️ 危険！早くタイプしろ！！" : "💣 あなたが持ってる！"
            : `🙏 ${gameMode === "ai" ? oppName : "相手"}がタイプ中…`}
        </p>
      </div>

      {/* ── 2カラム ── */}
      <div className="grid grid-cols-2 gap-3 w-full">

        {/* あなたのカード */}
        <div className={`rounded-2xl border-2 p-3 transition-colors duration-100 ${
          iHaveBomb
            ? flashRed ? "bg-red-50 border-red-400" : dangerZone ? "bg-orange-50 border-orange-400 shadow-md" : "bg-white border-primary shadow-md"
            : "bg-muted/30 border-border opacity-60"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-muted-foreground">あなた</span>
            {/* 小リング（自分が持ってないときも残り時間が分かる） */}
            {iHaveBomb && (
              <div className="relative w-10 h-10 flex items-center justify-center">
                <svg width={40} height={40} className="-rotate-90">
                  <circle cx={20} cy={20} r={SR} fill="none" stroke="#e2e8f0" strokeWidth={4}/>
                  <circle cx={20} cy={20} r={SR} fill="none" stroke={myColor} strokeWidth={4}
                    strokeDasharray={`${Math.max(timeLeft/timeLimit(passes),0)*Scirc} ${Scirc}`}
                    strokeLinecap="round"
                    style={{transition:"stroke-dasharray 0.9s linear,stroke 0.3s"}}/>
                </svg>
                <span className="absolute text-xs font-black" style={{color:myColor}}>{timeLeft}</span>
              </div>
            )}
          </div>
          {iHaveBomb ? (
            <>
              <p className="text-xs text-muted-foreground mb-2 font-bold text-center">⌨️ タイプして渡せ！</p>
              <div className="flex gap-1 flex-wrap justify-center">
                {word.split("").map((ch, i) => (
                  <CharBlock key={i} ch={ch} state={flashRed ? "wrong" : i < typed.length ? "correct" : "pending"} />
                ))}
              </div>
              <p className="text-xs text-center mt-1 text-muted-foreground">{typed.length}/{word.length}</p>
            </>
          ) : (
            <div className="text-center py-2">
              <p className="text-sm font-bold text-muted-foreground">{word}</p>
            </div>
          )}
        </div>

        {/* 相手のカード */}
        <div className={`rounded-2xl border-2 p-3 transition-colors duration-100 ${
          !iHaveBomb
            ? oppFlash ? "bg-red-50 border-red-400" : oppTimeLeft <= 6 ? "bg-orange-50 border-orange-400 shadow-md" : "bg-white border-orange-400 shadow-md"
            : "bg-muted/30 border-border opacity-60"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-muted-foreground truncate">{gameMode === "ai" ? oppName : "相手"}</span>
            {!iHaveBomb && oppWord?.match(/^[A-Z]+$/) && (
              <div className="relative w-10 h-10 flex items-center justify-center">
                <svg width={40} height={40} className="-rotate-90">
                  <circle cx={20} cy={20} r={SR} fill="none" stroke="#e2e8f0" strokeWidth={4}/>
                  <circle cx={20} cy={20} r={SR} fill="none" stroke={oppColor} strokeWidth={4}
                    strokeDasharray={`${Math.max(oppTimeLeft/timeLimit(passes),0)*Scirc} ${Scirc}`}
                    strokeLinecap="round"
                    style={{transition:"stroke-dasharray 0.9s linear,stroke 0.3s"}}/>
                </svg>
                <span className="absolute text-xs font-black" style={{color:oppColor}}>{oppTimeLeft}</span>
              </div>
            )}
          </div>
          {oppWord?.match(/^[A-Z]+$/) ? (
            <>
              <p className="text-xs text-muted-foreground mb-2 font-bold text-center">🔥 タイプ中…</p>
              <div className="flex gap-1 flex-wrap justify-center">
                {oppWord.split("").map((ch, i) => (
                  <CharBlock key={i} ch={ch} state={oppFlash ? "wrong" : i < oppTyped ? "correct" : "pending"} />
                ))}
              </div>
              <p className="text-xs text-center mt-1 text-muted-foreground">{oppTyped}/{oppWord.length}</p>
            </>
          ) : (
            <div className="text-center py-2">
              <p className="text-sm font-bold text-muted-foreground">{oppWord || "待機中…"}</p>
            </div>
          )}
        </div>
      </div>

      {/* ミス表示 */}
      {iHaveBomb && flashRed && (
        <p className="text-xs text-red-500 font-black animate-pulse">❌ ミス！最初からやり直し</p>
      )}

      <style>{`
        @keyframes bombShake {
          0%,100% { transform: translateX(0) scale(1.1) rotate(0deg); }
          25%      { transform: translateX(-5px) scale(1.1) rotate(-5deg); }
          75%      { transform: translateX(5px) scale(1.1) rotate(5deg); }
        }
        @keyframes flyRight {
          0%   { left: 10%;  opacity: 0; transform: translateY(-50%) scale(0.8); }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { left: 90%; opacity: 0; transform: translateY(-50%) scale(1.3); }
        }
        @keyframes flyLeft {
          0%   { left: 90%; opacity: 0; transform: translateY(-50%) scale(0.8); }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { left: 10%; opacity: 0; transform: translateY(-50%) scale(1.3); }
        }
        @keyframes pulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
