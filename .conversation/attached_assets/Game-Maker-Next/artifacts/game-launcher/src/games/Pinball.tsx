import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const W = 400, H = 600;

// Circle bumpers
type Bumper = { x: number; y: number; r: number; basePts: number; hits: number; flash: number };

// Wall segments
type Wall = { x1: number; y1: number; x2: number; y2: number };

// Flipper
type Flipper = {
  cx: number; cy: number; len: number; width: number;
  angle: number; targetAngle: number; speed: number;
  side: "left" | "right";
};

// Ball
type Ball = { x: number; y: number; vx: number; vy: number; r: number; active: boolean; stuck: boolean; super: number };

// Particle
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number };

// Popup
type Popup = { id: number; x: number; y: number; text: string; sub?: string; life: number; scale: number };

// Mission
type Mission = { id: string; desc: string; target: number; current: number; done: boolean; pts: number };

const WALLS: Wall[] = [
  { x1: 0, y1: 0, x2: 0, y2: H - 100 },
  { x1: 0, y1: H - 100, x2: 50, y2: H },
  { x1: W, y1: 0, x2: W, y2: H - 100 },
  { x1: W, y1: H - 100, x2: W - 50, y2: H },
  { x1: 0, y1: 0, x2: 80, y2: 60 },
  { x1: 80, y1: 60, x2: 200, y2: 100 },
  { x1: 200, y1: 100, x2: 320, y2: 60 },
  { x1: 320, y1: 60, x2: W, y2: 0 },
  { x1: W - 50, y1: 80, x2: W - 50, y2: H - 50 },
  { x1: 40, y1: 80, x2: 60, y2: 220 },
  { x1: W - 40, y1: 80, x2: W - 60, y2: 220 },
  { x1: 120, y1: 40, x2: 160, y2: 80 },
  { x1: 280, y1: 40, x2: 240, y2: 80 },
];

const BUMPERS: Bumper[] = [
  { x: 120, y: 180, r: 24, basePts: 100, hits: 0, flash: 0 },
  { x: 280, y: 180, r: 24, basePts: 100, hits: 0, flash: 0 },
  { x: 200, y: 100, r: 18, basePts: 200, hits: 0, flash: 0 },
  { x: 80, y: 300, r: 16, basePts: 50, hits: 0, flash: 0 },
  { x: 320, y: 300, r: 16, basePts: 50, hits: 0, flash: 0 },
  { x: 200, y: 280, r: 20, basePts: 150, hits: 0, flash: 0 },
];

const WORDS = [
  "猫", "犬", "鳥", "魚", "象", "うさぎ", "くま", "ライオン", "ペンギン", "カエル",
  "りんご", "寿司", "ラーメン", "ケーキ", "ハンバーガー", "ピザ", "たこ焼き", "カレー", "ドーナツ", "アイス",
  "車", "自転車", "飛行機", "家", "時計", "テレビ", "電話", "本", "椅子", "傘",
  "花", "木", "太陽", "月", "星", "山", "海", "桜", "虹", "雪",
  "ロボット", "忍者", "UFO", "恐竜", "おばけ", "王子様", "魔女", "海賊", "サンタ", "天使",
];

export default function Pinball() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedRef = useRef(false);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => parseInt(localStorage.getItem("pinball_hs") || "0"));
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [ballsLeft, setBallsLeft] = useState(3);
  const [multiplier, setMultiplier] = useState(1);
  const [combo, setCombo] = useState(0);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [launchAngle, setLaunchAngle] = useState(0);
  const [missions, setMissions] = useState<Mission[]>([
    { id: "bumper3", desc: "バンパーを3回当てる", target: 3, current: 0, done: false, pts: 500 },
    { id: "combo5", desc: "5連続コンボ", target: 5, current: 0, done: false, pts: 1000 },
    { id: "upper", desc: "上部エリアを通過", target: 1, current: 0, done: false, pts: 800 },
    { id: "multiball", desc: "マルチボール発動", target: 1, current: 0, done: false, pts: 2000 },
  ]);
  const [multiballActive, setMultiballActive] = useState(false);
  const { addPlay } = useGameHistory();

  const addPopup = useCallback((x: number, y: number, text: string, sub?: string) => {
    const id = Date.now() + Math.random();
    const p: Popup = { id, x, y, text, sub, life: 1.0, scale: 1 };
    setPopups(prev => [...prev, p]);
    setTimeout(() => setPopups(prev => prev.filter(pp => pp.id !== id)), 1200);
  }, []);

  const startGame = useCallback(() => {
    setScore(0);
    setBallsLeft(3);
    setStarted(true);
    startedRef.current = true;
    setGameOver(false);
    setCombo(0);
    setMultiplier(1);
    setLaunchAngle(0);
    setMultiballActive(false);
    setMissions([
      { id: "bumper3", desc: "バンパーを3回当てる", target: 3, current: 0, done: false, pts: 500 },
      { id: "combo5", desc: "5連続コンボ", target: 5, current: 0, done: false, pts: 1000 },
      { id: "upper", desc: "上部エリアを通過", target: 1, current: 0, done: false, pts: 800 },
      { id: "multiball", desc: "マルチボール発動", target: 1, current: 0, done: false, pts: 2000 },
    ]);
  }, []);

  // Main game loop - runs ONCE
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const s = {
      active: false,
      balls: [] as Ball[],
      bumpers: BUMPERS.map(b => ({ ...b })),
      flippers: [
        { cx: 65, cy: H - 55, len: 75, width: 14, angle: 0.35, targetAngle: 0.35, speed: 0.18, side: "left" as const },
        { cx: W - 65, cy: H - 55, len: 75, width: 14, angle: Math.PI - 0.35, targetAngle: Math.PI - 0.35, speed: 0.18, side: "right" as const },
      ],
      particles: [] as Particle[],
      score: 0,
      combo: 0,
      comboTimer: 0,
      multiplier: 1,
      ballsLeft: 3,
      bonusTimer: 0,
      multiballTimer: 0,
      missions: [
        { id: "bumper3", desc: "", target: 3, current: 0, done: false, pts: 500 },
        { id: "combo5", desc: "", target: 5, current: 0, done: false, pts: 1000 },
        { id: "upper", desc: "", target: 1, current: 0, done: false, pts: 800 },
        { id: "multiball", desc: "", target: 1, current: 0, done: false, pts: 2000 },
      ],
      lastBumperId: -1,
      bumperChain: 0,
      animId: 0,
      shake: 0,
      flashScreen: 0,
      launchAngle: 0,
    };

    let leftKey = false, rightKey = false;
    let lastTime = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "a" || key === "arrowleft") {
        leftKey = true;
        if (s.balls.some(b => b.stuck)) {
          s.launchAngle = Math.max(-0.8, s.launchAngle - 0.05);
          setLaunchAngle(s.launchAngle);
        }
      }
      if (key === "d" || key === "arrowright") {
        rightKey = true;
        if (s.balls.some(b => b.stuck)) {
          s.launchAngle = Math.min(0.8, s.launchAngle + 0.05);
          setLaunchAngle(s.launchAngle);
        }
      }
      if (key === " " && s.active) {
        s.balls.forEach(b => {
          if (b.stuck) {
            const power = 13 + Math.random() * 3;
            b.vx = Math.sin(s.launchAngle) * power * 0.4;
            b.vy = -Math.cos(s.launchAngle) * power;
            b.stuck = false;
          }
        });
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "a" || key === "arrowleft") leftKey = false;
      if (key === "d" || key === "arrowright") rightKey = false;
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);

    const spawnBall = (stuck = true) => {
      s.balls.push({ x: W - 30, y: H - 90, vx: 0, vy: 0, r: 7, active: true, stuck, super: 0 });
    };

    const spawnParticle = (x: number, y: number, color: string, count = 5, speed = 3) => {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        s.particles.push({
          x, y, color,
          vx: Math.cos(a) * speed * (0.5 + Math.random()),
          vy: Math.sin(a) * speed * (0.5 + Math.random()),
          life: 1.0, size: 2 + Math.random() * 3,
        });
      }
    };

    const addPoints = (pts: number, x: number, y: number, label?: string) => {
      const mult = s.multiplier;
      const total = Math.floor(pts * mult);
      s.score += total;
      setScore(s.score);
      addPopup(x, y, `+${total}`, label || `${mult}x`);
      s.flashScreen = 3;
    };

    const checkMission = (id: string) => {
      const m = s.missions.find(mm => mm.id === id);
      if (m && !m.done) {
        m.current++;
        if (m.current >= m.target) {
          m.done = true;
          addPoints(m.pts, 200, 250, "ミッション完了！");
          s.multiplier = Math.min(5, s.multiplier + 1);
          setMultiplier(s.multiplier);
          setMissions([...s.missions]);
        }
      }
    };

    const checkBumper = (b: Ball) => {
      s.bumpers.forEach((bu, i) => {
        const dx = b.x - bu.x, dy = b.y - bu.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bu.r + b.r) {
          const nx = dx / dist, ny = dy / dist;
          b.vx = nx * 7; b.vy = ny * 7;
          bu.hits++;
          bu.flash = 10;
          s.combo++; s.comboTimer = 60;
          s.shake = 4;
          setCombo(s.combo);

          if (s.lastBumperId === i) {
            s.bumperChain++;
          } else {
            s.bumperChain = 1;
            s.lastBumperId = i;
          }

          const chainMult = 1 + s.bumperChain * 0.5;
          const basePts = bu.basePts * chainMult;
          addPoints(basePts, bu.x, bu.y - 20);
          spawnParticle(bu.x, bu.y, bu.hits > 5 ? "#facc15" : "#f97316", 6, 4);

          checkMission("bumper3");
          if (s.combo >= 5) checkMission("combo5");

          if (bu.hits > 10) {
            s.multiplier = Math.min(5, s.multiplier + 0.2);
            setMultiplier(Math.floor(s.multiplier));
          }
        }
      });
    };

    const checkWalls = (b: Ball) => {
      WALLS.forEach(w => {
        const wx = w.x2 - w.x1, wy = w.y2 - w.y1;
        const len = Math.sqrt(wx * wx + wy * wy);
        const nx = wx / len, ny = wy / len;
        const px = b.x - w.x1, py = b.y - w.y1;
        const proj = Math.max(0, Math.min(1, (px * nx + py * ny)));
        const cx = w.x1 + nx * proj, cy = w.y1 + ny * proj;
        const dx = b.x - cx, dy = b.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < b.r + 3) {
          const nd = dist || 1;
          const nx2 = dx / nd, ny2 = dy / nd;
          const dot = b.vx * nx2 + b.vy * ny2;
          b.vx -= 2 * dot * nx2;
          b.vy -= 2 * dot * ny2;
          b.vx *= 0.95; b.vy *= 0.95;
          const overlap = b.r + 3 - dist;
          b.x += nx2 * overlap;
          b.y += ny2 * overlap;
        }
      });
    };

    const checkFlippers = (b: Ball) => {
      s.flippers.forEach(f => {
        const fx = f.cx + Math.cos(f.angle) * f.len;
        const fy = f.cy + Math.sin(f.angle) * f.len;
        const wx = fx - f.cx, wy = fy - f.cy;
        const len = Math.sqrt(wx * wx + wy * wy);
        const nx = wx / len, ny = wy / len;
        const px = b.x - f.cx, py = b.y - f.cy;
        const proj = Math.max(0, Math.min(1, (px * nx + py * ny)));
        const cx = f.cx + nx * proj, cy = f.cy + ny * proj;
        const dx = b.x - cx, dy = b.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < b.r + 8 && b.y > f.cy - 20) {
          const flipPower = Math.abs(f.targetAngle - f.angle) * 8;
          const nx2 = dx / (dist || 1), ny2 = dy / (dist || 1);
          const dir = f.side === "left" ? -1 : 1;
          b.vx = -nx2 * 4 + dir * 2;
          b.vy = -ny2 * (10 + flipPower) - 2;
          spawnParticle(b.x, b.y, "#dc2626", 3, 2);
        }
      });
    };

    const drawBoard = () => {
      ctx.fillStyle = "#0f3d2e"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(20,83,45,0.2)"; ctx.lineWidth = 1;
      for (let i = 0; i < H; i += 25) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i + 8); ctx.stroke(); }

      // Walls
      ctx.strokeStyle = "#c9a227"; ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, H - 100); ctx.lineTo(50, H);
      ctx.lineTo(W - 50, H); ctx.lineTo(W, H - 100); ctx.lineTo(W, 0);
      ctx.closePath(); ctx.stroke();
      ctx.strokeStyle = "rgba(251,191,36,0.15)"; ctx.lineWidth = 2; ctx.stroke();

      ctx.strokeStyle = "#a16207"; ctx.lineWidth = 2;
      WALLS.forEach(w => {
        ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); ctx.stroke();
      });

      // Plunger lane arrow
      ctx.fillStyle = s.balls.some(b => b.stuck) ? "#fbbf24" : "#1e293b";
      ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("\u2191", W - 30, H - 40);

      // Upper lane indicator
      ctx.fillStyle = s.bonusTimer > 0 ? "#22c55e" : "#1e293b";
      ctx.fillRect(170, 10, 60, 12);
      ctx.strokeStyle = s.bonusTimer > 0 ? "#4ade80" : "#475569"; ctx.lineWidth = 1;
      ctx.strokeRect(170, 10, 60, 12);
      ctx.fillStyle = s.bonusTimer > 0 ? "#fff" : "#64748b";
      ctx.font = "bold 9px sans-serif";
      ctx.fillText(s.bonusTimer > 0 ? "UPPER!" : "UPPER", 200, 20);
    };

    const drawBumpers = () => {
      s.bumpers.forEach(bu => {
        const flash = bu.flash > 0;
        if (flash) {
          ctx.fillStyle = `rgba(251,191,36,${bu.flash / 15})`;
          ctx.beginPath(); ctx.arc(bu.x, bu.y, bu.r + 8, 0, Math.PI * 2); ctx.fill();
        }
        const hue = (bu.hits * 15) % 360;
        ctx.fillStyle = flash ? "#fcd34d" : `hsl(${hue}, 80%, 50%)`;
        ctx.beginPath(); ctx.arc(bu.x, bu.y, bu.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = flash ? "#fbbf24" : `hsl(${hue}, 80%, 40%)`; ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = flash ? "#fff" : `hsl(${hue}, 80%, 65%)`;
        ctx.beginPath(); ctx.arc(bu.x, bu.y, bu.r - 8, 0, Math.PI * 2); ctx.fill();
        if (bu.hits > 0) {
          ctx.fillStyle = "#fff"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center";
          ctx.fillText(String(Math.floor(bu.hits)), bu.x, bu.y + 3);
        }
        if (bu.flash > 0) bu.flash--;
      });
    };

    const drawFlipper = (f: Flipper) => {
      const fx = f.cx + Math.cos(f.angle) * f.len;
      const fy = f.cy + Math.sin(f.angle) * f.len;
      const perp = f.angle + Math.PI / 2;
      const pw = f.width / 2;

      // Main paddle body
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.moveTo(f.cx + Math.cos(perp) * pw, f.cy + Math.sin(perp) * pw);
      ctx.lineTo(f.cx - Math.cos(perp) * pw, f.cy - Math.sin(perp) * pw);
      ctx.lineTo(fx - Math.cos(perp) * pw * 1.5, fy - Math.sin(perp) * pw * 1.5);
      ctx.lineTo(fx + Math.cos(perp) * pw * 1.5, fy + Math.sin(perp) * pw * 1.5);
      ctx.closePath();
      ctx.fill();

      // Outline
      ctx.strokeStyle = "#fca5a5"; ctx.lineWidth = 2;
      ctx.stroke();

      // Rounded tip
      ctx.fillStyle = "#b91c1c";
      ctx.beginPath();
      ctx.arc(fx, fy, pw * 1.5, perp, perp + Math.PI);
      ctx.fill();
    };

    const drawFlippers = () => {
      s.flippers.forEach(f => {
        f.angle += (f.targetAngle - f.angle) * f.speed;
        drawFlipper(f);
      });
    };

    const drawBall = (b: Ball) => {
      ctx.fillStyle = "rgba(226,232,240,0.3)";
      ctx.beginPath(); ctx.arc(b.x - b.vx * 2, b.y - b.vy * 2, b.r * 0.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = b.super > 0 ? "#facc15" : "#e2e8f0";
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r + (b.super > 0 ? 2 : 0), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = b.super > 0 ? "#eab308" : "#94a3b8"; ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(b.x - 2, b.y - 2, 3, 0, Math.PI * 2); ctx.fill();
    };

    const drawParticles = () => {
      s.particles.forEach(p => {
        ctx.fillStyle = p.color; ctx.globalAlpha = p.life;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      });
    };

    const drawUI = () => {
      ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0, 0, W, 36);
      ctx.fillStyle = "#fbbf24"; ctx.font = "bold 16px sans-serif"; ctx.textAlign = "left";
      ctx.fillText(`\ud83c\udfaf ${s.score.toLocaleString()}`, 10, 24);
      ctx.fillStyle = "#a78bfa"; ctx.font = "bold 12px sans-serif";
      ctx.fillText(`x${s.multiplier}`, 120, 24);
      ctx.fillStyle = "#ef4444"; ctx.textAlign = "center";
      ctx.fillText(`\ud83d\udd34 ${s.ballsLeft}`, W / 2, 24);
      ctx.fillStyle = "#22c55e"; ctx.textAlign = "right";
      ctx.fillText(`\ud83d\udd25 ${s.combo}`, W - 10, 24);
    };

    const drawPlungerArrow = () => {
      const stuckBall = s.balls.find(b => b.stuck);
      if (!stuckBall) return;
      // Draw launch angle indicator
      const ax = stuckBall.x + Math.sin(s.launchAngle) * 40;
      const ay = stuckBall.y - Math.cos(s.launchAngle) * 40;
      ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(stuckBall.x, stuckBall.y);
      ctx.lineTo(ax, ay);
      ctx.stroke();
      ctx.setLineDash([]);
      // Arrowhead
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(ax, ay, 4, 0, Math.PI * 2);
      ctx.fill();
    };

    const loop = (time: number) => {
      s.animId = requestAnimationFrame(loop);

      // Activate game when startedRef becomes true
      if (!s.active && startedRef.current) {
        s.active = true;
        s.score = 0;
        s.ballsLeft = 3;
        s.combo = 0;
        s.multiplier = 1;
        s.launchAngle = 0;
        s.balls = [];
        s.bumpers = BUMPERS.map(b => ({ ...b }));
        s.particles = [];
        s.missions = [
          { id: "bumper3", desc: "", target: 3, current: 0, done: false, pts: 500 },
          { id: "combo5", desc: "", target: 5, current: 0, done: false, pts: 1000 },
          { id: "upper", desc: "", target: 1, current: 0, done: false, pts: 800 },
          { id: "multiball", desc: "", target: 1, current: 0, done: false, pts: 2000 },
        ];
        spawnBall(true);
      }

      if (!s.active) {
        drawBoard(); drawBumpers(); drawFlippers(); drawUI();
        return;
      }

      if (time - lastTime < 14) return;
      lastTime = time;

      if (s.shake > 0) {
        ctx.save();
        ctx.translate((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);
        s.shake--;
      }
      if (s.flashScreen > 0) {
        ctx.fillStyle = `rgba(255,255,255,${s.flashScreen / 10})`;
        ctx.fillRect(0, 0, W, H);
        s.flashScreen--;
      }

      // Update flippers
      s.flippers[0].targetAngle = leftKey ? -0.9 : 0.35;
      s.flippers[1].targetAngle = rightKey ? Math.PI + 0.9 : Math.PI - 0.35;

      // Combo decay
      if (s.comboTimer > 0) { s.comboTimer--; }
      else if (s.combo > 0) { s.combo = 0; setCombo(0); }

      // Bonus timer
      if (s.bonusTimer > 0) { s.bonusTimer--; }
      if (s.multiballTimer > 0) {
        s.multiballTimer--;
        if (s.multiballTimer <= 0) {
          s.multiplier = Math.max(1, s.multiplier - 1);
          setMultiplier(s.multiplier);
          setMultiballActive(false);
        }
      }

      drawBoard();
      drawBumpers();
      drawPlungerArrow();

      // Update balls
      s.balls = s.balls.filter(b => {
        if (!b.active) return false;

        if (b.stuck) {
          b.x = W - 30; b.y = H - 90;
          drawBall(b);
          return true;
        }

        b.x += b.vx; b.y += b.vy;
        b.vy += 0.22;
        if (b.super > 0) b.super--;

        checkWalls(b);
        checkBumper(b);
        checkFlippers(b);

        if (b.y < 60 && b.x > 150 && b.x < 250) {
          if (s.bonusTimer <= 0) {
            s.bonusTimer = 120;
            addPoints(300, b.x, b.y, "UPPER LANE!");
            checkMission("upper");
            spawnParticle(b.x, b.y, "#22c55e", 8, 5);
          }
        }

        if (b.y > H + 10 && b.x > 60 && b.x < W - 60) {
          s.ballsLeft--; setBallsLeft(s.ballsLeft);
          s.combo = 0; setCombo(0);
          s.multiplier = 1; setMultiplier(1);
          if (s.ballsLeft <= 0) {
            s.active = false;
            startedRef.current = false;
            setGameOver(true);
            setStarted(false);
            if (s.score > bestScore) {
              setBestScore(s.score);
              localStorage.setItem("pinball_hs", String(s.score));
            }
            addPlay("pinball", s.score);
          }
          return false;
        }

        if (b.y > H + 50 || b.x < -50 || b.x > W + 50) {
          s.ballsLeft--; setBallsLeft(s.ballsLeft);
          if (s.ballsLeft <= 0) {
            s.active = false;
            startedRef.current = false;
            setGameOver(true);
            setStarted(false);
            addPlay("pinball", s.score);
          }
          return false;
        }

        drawBall(b);
        return true;
      });

      if (s.balls.length === 0 && s.ballsLeft > 0 && s.active) {
        spawnBall(true);
        s.launchAngle = 0;
        setLaunchAngle(0);
      }

      if (s.bumperChain >= 3 && s.balls.length === 1 && s.ballsLeft > 0 && s.multiballTimer <= 0) {
        s.ballsLeft--; setBallsLeft(s.ballsLeft);
        spawnBall(false);
        const newBall = s.balls[s.balls.length - 1];
        newBall.vx = -2 + Math.random() * 4;
        newBall.vy = -10;
        s.multiballTimer = 300;
        s.multiplier = 2;
        setMultiplier(2);
        setMultiballActive(true);
        checkMission("multiball");
        addPopup(200, 200, "マルチボール！", "2x MULTIPLIER");
        spawnParticle(200, 200, "#facc15", 15, 6);
      }

      s.particles = s.particles.filter(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life -= 0.025;
        return p.life > 0;
      });
      drawParticles();

      drawFlippers();
      drawUI();

      if (s.shake > 0) ctx.restore();
    };

    s.animId = requestAnimationFrame(loop);

    return () => {
      s.active = false;
      cancelAnimationFrame(s.animId);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [bestScore, addPlay, addPopup]);

  return (
    <div className="flex flex-col items-center space-y-3 select-none">
      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase font-bold">SCORE</p>
          <p className="text-3xl font-black text-[#f59e0b] leading-none">{score.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase font-bold">BEST</p>
          <p className="text-lg font-bold text-muted-foreground leading-none">{bestScore.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase font-bold">MULTI</p>
          <p className="text-lg font-bold text-purple-500 leading-none">x{multiplier}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase font-bold">BALLS</p>
          <p className="text-lg font-bold text-red-500 leading-none">{ballsLeft}</p>
        </div>
      </div>

      {combo > 1 && (
        <div className="text-center animate-pulse">
          <p className="text-sm font-black text-orange-500">{combo} COMBO!</p>
        </div>
      )}
      {multiballActive && (
        <div className="text-center animate-bounce">
          <p className="text-sm font-black text-yellow-500">⚡ マルチボール アクティブ ⚡</p>
        </div>
      )}
      {started && !gameOver && (
        <div className="text-center">
          <p className="text-xs text-amber-600">A/Dで発射角度調整 | スペースで発射</p>
          {Math.abs(launchAngle) > 0.05 && (
            <p className="text-xs text-amber-500">角度: {(launchAngle * 57).toFixed(0)}°</p>
          )}
        </div>
      )}

      <div className="relative">
        <canvas ref={canvasRef} width={W} height={H} className="border-2 border-border rounded-xl shadow-lg" style={{ background: "#0f3d2e" }} />

        {popups.map(p => (
          <div key={p.id} className="absolute pointer-events-none font-black text-yellow-300 text-sm"
            style={{ left: p.x, top: p.y, animation: "popUp 1s ease-out forwards", textShadow: "0 0 8px rgba(0,0,0,0.8)" }}>
            <p className="text-lg">{p.text}</p>
            {p.sub && <p className="text-xs text-yellow-100">{p.sub}</p>}
          </div>
        ))}

        {!started && (
          <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center rounded-xl">
            <div className="text-6xl mb-3">🎯</div>
            <h2 className="text-3xl font-black text-white mb-2">ピンボール</h2>
            <p className="text-emerald-200 text-sm mb-1">A/D フリッパー | スペース 発射</p>
            <p className="text-emerald-300 text-xs mb-1 text-center max-w-xs">球が止まっている間、A/Dで発射角度を調整！</p>
            <p className="text-emerald-300 text-xs mb-2 text-center max-w-xs">バンパーに連続ヒットでコンボ！</p>
            <p className="text-emerald-300 text-xs mb-4 text-center max-w-xs">ミッションを完了してマルチプライ得点アップ！</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-emerald-200 mb-4 text-center">
              <span>🎯 バンパーヒット</span>
              <span>🔥 コンボボーナス</span>
              <span>⚡ マルチボール</span>
              <span>🏆 ミッション</span>
            </div>
            <Button onClick={startGame} size="lg" className="rounded-full px-8">スタート！</Button>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center rounded-xl">
            <div className="text-6xl mb-3">🎯</div>
            <h2 className="text-3xl font-black text-white mb-2">ゲームオーバー</h2>
            <p className="text-emerald-200 text-lg mb-1">スコア: {score.toLocaleString()}</p>
            {score >= bestScore && score > 0 && <p className="text-yellow-400 font-bold mb-2">🌟 ハイスコア更新！</p>}
            <div className="text-emerald-300 text-xs mb-4 text-center">
              {missions.filter(m => m.done).length > 0 && (
                <p>ミッション達成: {missions.filter(m => m.done).length}/{missions.length}</p>
              )}
            </div>
            <Button onClick={startGame} size="lg" className="rounded-full px-8">もう一度</Button>
          </div>
        )}
      </div>

      {started && !gameOver && (
        <div className="flex gap-2 flex-wrap justify-center">
          {missions.map(m => (
            <div key={m.id} className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${m.done ? "bg-green-500/20 text-green-600" : "bg-muted/50 text-muted-foreground"}`}>
              {m.done ? "✅" : "⬜"} {m.desc}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 text-xs text-muted-foreground">
        <span className="font-bold">A/← 左フリッパー</span>
        <span className="font-bold">D/→ 右フリッパー</span>
        <span className="font-bold text-amber-500">スペース 発射</span>
      </div>

      <style>{`
        @keyframes popUp {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          50% { opacity: 1; transform: translateY(-20px) scale(1.2); }
          100% { opacity: 0; transform: translateY(-50px) scale(0.8); }
        }
      `}</style>
    </div>
  );
}
