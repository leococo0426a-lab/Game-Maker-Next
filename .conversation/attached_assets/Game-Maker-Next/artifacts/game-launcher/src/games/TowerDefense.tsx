import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const W = 640, H = 440;

const PATH_POINTS = [
  { x: 0, y: 60 }, { x: 80, y: 60 }, { x: 80, y: 220 }, { x: 200, y: 220 },
  { x: 200, y: 100 }, { x: 380, y: 100 }, { x: 380, y: 300 }, { x: 520, y: 300 },
  { x: 520, y: 180 }, { x: 640, y: 180 }
];

const BASE_POS = { x: 620, y: 180 };
const BASE_RADIUS = 28;

const TOWER_TYPES = [
  { id: "arrow", name: "弓塔", emoji: "🏹", cost: 60, range: 110, damage: 10, fireRate: 35, color: "#ef4444", bulletColor: "#fca5a5" },
  { id: "cannon", name: "大砲", emoji: "💥", cost: 120, range: 145, damage: 30, fireRate: 65, color: "#f97316", bulletColor: "#fdba74", splash: 30 },
  { id: "ice", name: "氷塔", emoji: "❄️", cost: 150, range: 95, damage: 5, fireRate: 25, color: "#06b6d4", bulletColor: "#67e8f9", slow: 0.5 },
  { id: "sniper", name: "狙撃", emoji: "🔫", cost: 250, range: 240, damage: 70, fireRate: 90, color: "#a855f7", bulletColor: "#d8b4fe" },
  { id: "tesla", name: "テスラ", emoji: "⚡", cost: 400, range: 115, damage: 18, fireRate: 18, color: "#eab308", bulletColor: "#fef08a", chain: 3 },
];

function lerpPath(t: number) {
  const totalLen = PATH_POINTS.length - 1;
  const idx = Math.min(Math.floor(t * totalLen), totalLen - 1);
  const frac = t * totalLen - idx;
  const a = PATH_POINTS[idx], b = PATH_POINTS[idx + 1];
  return { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };
}

function distToPath(x: number, y: number) {
  let minD = Infinity;
  for (let i = 0; i < PATH_POINTS.length - 1; i++) {
    const a = PATH_POINTS[i], b = PATH_POINTS[i + 1];
    const abx = b.x - a.x, aby = b.y - a.y;
    const apx = x - a.x, apy = y - a.y;
    const abLen = Math.sqrt(abx * abx + aby * aby);
    const proj = Math.max(0, Math.min(1, (apx * abx + apy * aby) / (abLen * abLen)));
    const cx = a.x + abx * proj, cy = a.y + aby * proj;
    const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    if (d < minD) minD = d;
  }
  return minD;
}

type Enemy = { t: number; hp: number; maxHp: number; speed: number; val: number; slowTimer: number; id: number };
type Tower = { x: number; y: number; typeIdx: number; lastFire: number };
type Bullet = { x: number; y: number; targetId: number; speed: number; damage: number; color: string; chainLeft?: number; splash?: number };

export default function TowerDefense() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [money, setMoney] = useState(200);
  const [lives, setLives] = useState(20);
  const [wave, setWave] = useState(1);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [selectedType, setSelectedType] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [kills, setKills] = useState(0);
  const [baseHp, setBaseHp] = useState(100);
  const { addPlay } = useGameHistory();

  // Game state refs - these are the single source of truth for the game loop
  const stateRef = useRef({
    money: 200,
    lives: 20,
    wave: 1,
    kills: 0,
    baseHp: 100,
    towers: [] as Tower[],
    enemies: [] as Enemy[],
    bullets: [] as Bullet[],
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number; color: string }[],
    frame: 0,
    spawnTimer: 0,
    spawnCount: 0,
    totalSpawns: 0,
    nextEnemyId: 0,
    animId: 0,
    active: false,
    placing: false,
    hoverX: 0,
    hoverY: 0,
    selectedTypeIdx: 0,
  });

  // Sync React state to refs when it changes
  useEffect(() => { stateRef.current.selectedTypeIdx = selectedType; }, [selectedType]);
  useEffect(() => { stateRef.current.placing = placing; }, [placing]);

  // Start game
  const startGame = useCallback(() => {
    const s = stateRef.current;
    s.money = 200; setMoney(200);
    s.lives = 20; setLives(20);
    s.wave = 1; setWave(1);
    s.kills = 0; setKills(0);
    s.baseHp = 100; setBaseHp(100);
    s.towers = [];
    s.enemies = [];
    s.bullets = [];
    s.particles = [];
    s.frame = 0;
    s.spawnTimer = 0;
    s.spawnCount = 0;
    s.totalSpawns = 0;
    s.nextEnemyId = 0;
    s.active = true;
    setGameOver(false);
    setWon(false);
    setStarted(true);
  }, []);

  // Main game loop - runs ONCE when component mounts, never restarts
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const s = stateRef.current;

    let lastTime = 0;

    const spawnWave = () => {
      s.totalSpawns = 5 + s.wave * 2;
      s.spawnTimer = 0;
      s.spawnCount = 0;
    };

    const spawnParticle = (x: number, y: number, color: string, count = 4) => {
      for (let i = 0; i < count; i++) {
        s.particles.push({ x, y, color, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 1.0 });
      }
    };

    const drawBackground = () => {
      ctx.fillStyle = "#14532d"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,255,255,0.03)"; ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    };

    const drawPath = () => {
      ctx.strokeStyle = "#92400e"; ctx.lineWidth = 34;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(PATH_POINTS[0].x, PATH_POINTS[0].y);
      for (let i = 1; i < PATH_POINTS.length; i++) ctx.lineTo(PATH_POINTS[i].x, PATH_POINTS[i].y);
      ctx.stroke();
      ctx.strokeStyle = "#d97706"; ctx.lineWidth = 22; ctx.stroke();
      ctx.strokeStyle = "rgba(251,191,36,0.2)"; ctx.lineWidth = 12; ctx.stroke();
    };

    const drawBase = () => {
      const { x, y } = BASE_POS;
      const hpRatio = s.baseHp / 100;
      ctx.fillStyle = "#1e293b";
      ctx.beginPath(); ctx.arc(x, y, BASE_RADIUS, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = hpRatio > 0.3 ? "#22c55e" : "#ef4444"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, BASE_RADIUS, 0, Math.PI * 2); ctx.stroke();
      ctx.font = "28px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("🏰", x, y);
      ctx.fillStyle = "#000"; ctx.fillRect(x - 24, y - BASE_RADIUS - 10, 48, 5);
      ctx.fillStyle = hpRatio > 0.5 ? "#22c55e" : hpRatio > 0.25 ? "#eab308" : "#ef4444";
      ctx.fillRect(x - 24, y - BASE_RADIUS - 10, 48 * hpRatio, 5);
      ctx.fillStyle = "#fff"; ctx.font = "bold 9px sans-serif";
      ctx.fillText(`${Math.ceil(s.baseHp)}`, x, y - BASE_RADIUS - 13);
    };

    const drawTower = (t: Tower, isHovered: boolean) => {
      const tt = TOWER_TYPES[t.typeIdx];
      if (isHovered) {
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.beginPath(); ctx.arc(t.x, t.y, tt.range, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.fillStyle = "#1e293b";
      ctx.beginPath(); ctx.arc(t.x, t.y, 16, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = tt.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(t.x, t.y, 16, 0, Math.PI * 2); ctx.stroke();
      ctx.font = "16px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(tt.emoji, t.x, t.y);
    };

    const drawEnemy = (e: Enemy) => {
      const pos = lerpPath(e.t);
      const hpRatio = e.hp / e.maxHp;
      ctx.fillStyle = hpRatio > 0.5 ? "#dc2626" : "#991b1b";
      ctx.beginPath(); ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2); ctx.fill();
      if (e.slowTimer > 0) { ctx.strokeStyle = "#06b6d4"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(pos.x - 3, pos.y - 2, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(pos.x + 3, pos.y - 2, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#000";
      ctx.beginPath(); ctx.arc(pos.x - 3, pos.y - 2, 1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(pos.x + 3, pos.y - 2, 1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#000"; ctx.fillRect(pos.x - 12, pos.y - 18, 24, 4);
      ctx.fillStyle = hpRatio > 0.5 ? "#22c55e" : hpRatio > 0.25 ? "#eab308" : "#ef4444";
      ctx.fillRect(pos.x - 12, pos.y - 18, 24 * hpRatio, 4);
    };

    const drawBullet = (b: Bullet) => {
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    };

    const drawParticles = () => {
      s.particles.forEach(p => {
        ctx.fillStyle = p.color; ctx.globalAlpha = p.life;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2 + (1 - p.life) * 3, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      });
    };

    const drawUI = () => {
      ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(0, 0, W, 32);
      ctx.fillStyle = "#fbbf24"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "left";
      ctx.fillText(`💰 ${s.money}`, 10, 22);
      ctx.fillStyle = "#ef4444";
      ctx.fillText(`❤️ ${s.lives}`, 100, 22);
      ctx.fillStyle = "#22c55e"; ctx.textAlign = "right";
      ctx.fillText(`💀 ${s.kills}`, W - 90, 22);
      ctx.fillStyle = "#a78bfa";
      ctx.fillText(`🌊 WAVE ${s.wave}`, W - 10, 22);
    };

    const loop = (time: number) => {
      s.animId = requestAnimationFrame(loop);
      if (!s.active) return;

      // Throttle to ~60fps
      if (time - lastTime < 16) return;
      lastTime = time;
      s.frame++;

      drawBackground();
      drawPath();
      drawBase();

      // Spawn enemies
      if (s.spawnCount < s.totalSpawns) {
        s.spawnTimer++;
        if (s.spawnTimer >= Math.max(20, 60 - s.wave * 2)) {
          s.spawnTimer = 0; s.spawnCount++;
          s.enemies.push({
            t: 0, hp: 25 + s.wave * 12, maxHp: 25 + s.wave * 12,
            speed: 0.001 + s.wave * 0.00012, val: 12 + s.wave * 2, slowTimer: 0, id: s.nextEnemyId++,
          });
        }
      } else if (s.enemies.length === 0 && s.frame % 60 === 0) {
        if (s.wave >= 15) {
          s.active = false;
          setWon(true);
          addPlay("towerdefense", s.wave * 100 + s.kills);
          return;
        }
        s.wave++;
        setWave(s.wave);
        s.money += 20 + s.wave * 5;
        setMoney(s.money);
        spawnWave();
      }

      // Update & draw enemies
      s.enemies = s.enemies.filter(e => {
        const speed = e.slowTimer > 0 ? e.speed * 0.5 : e.speed;
        e.t += speed;
        if (e.slowTimer > 0) e.slowTimer--;
        if (e.t >= 1) {
          const damage = 10 + Math.floor(s.wave * 0.5);
          s.baseHp -= damage; setBaseHp(s.baseHp);
          s.lives--; setLives(s.lives);
          spawnParticle(BASE_POS.x, BASE_POS.y, "#ef4444", 8);
          if (s.baseHp <= 0 || s.lives <= 0) {
            s.active = false;
            setGameOver(true);
            addPlay("towerdefense", s.wave * 50 + s.kills);
          }
          return false;
        }
        if (e.hp <= 0) {
          s.money += e.val; setMoney(s.money);
          s.kills++; setKills(s.kills);
          const pos = lerpPath(e.t);
          spawnParticle(pos.x, pos.y, "#ef4444", 6);
          return false;
        }
        drawEnemy(e);
        return true;
      });

      // Towers fire
      s.towers.forEach(t => {
        const tt = TOWER_TYPES[t.typeIdx];
        drawTower(t, false);
        if (s.frame - t.lastFire >= tt.fireRate) {
          const target = s.enemies
            .map(e => ({ e, pos: lerpPath(e.t) }))
            .filter(({ pos }) => Math.sqrt((pos.x - t.x) ** 2 + (pos.y - t.y) ** 2) < tt.range)
            .sort((a, b) => b.e.t - a.e.t)[0];
          if (target) {
            t.lastFire = s.frame;
            s.bullets.push({
              x: t.x, y: t.y, targetId: target.e.id,
              speed: 7, damage: tt.damage, color: tt.bulletColor,
              chainLeft: tt.chain, splash: (tt as any).splash,
            });
          }
        }
      });

      // Update & draw bullets
      s.bullets = s.bullets.filter(b => {
        const target = s.enemies.find(e => e.id === b.targetId);
        if (!target) return false;
        const tpos = lerpPath(target.t);
        const dx = tpos.x - b.x, dy = tpos.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 12) {
          target.hp -= b.damage;
          const tt = TOWER_TYPES[s.towers.find(t => Math.abs(t.x - b.x) < 5)?.typeIdx || 0];
          if ((tt as any)?.slow) target.slowTimer = 60;
          spawnParticle(tpos.x, tpos.y, b.color, 3);

          if (b.splash) {
            s.enemies.forEach(e => {
              if (e.id === target.id) return;
              const epos = lerpPath(e.t);
              const sd = Math.sqrt((epos.x - tpos.x) ** 2 + (epos.y - tpos.y) ** 2);
              if (sd < b.splash!) e.hp -= b.damage * 0.5;
            });
          }

          if (b.chainLeft && b.chainLeft > 0) {
            const nearby = s.enemies
              .filter(e => e.id !== target.id)
              .map(e => ({ e, pos: lerpPath(e.t) }))
              .filter(({ pos }) => Math.sqrt((pos.x - tpos.x) ** 2 + (pos.y - tpos.y) ** 2) < 80)
              .sort((a, b) => a.e.t - b.e.t)[0];
            if (nearby) {
              s.bullets.push({ x: tpos.x, y: tpos.y, targetId: nearby.e.id, speed: 10, damage: b.damage * 0.5, color: b.color, chainLeft: b.chainLeft - 1 });
              ctx.strokeStyle = b.color; ctx.lineWidth = 2;
              ctx.beginPath(); ctx.moveTo(tpos.x, tpos.y); ctx.lineTo(nearby.pos.x, nearby.pos.y); ctx.stroke();
            }
          }
          return false;
        }
        b.x += (dx / dist) * b.speed;
        b.y += (dy / dist) * b.speed;
        drawBullet(b);
        return true;
      });

      // Update particles
      s.particles = s.particles.filter(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life -= 0.04; return p.life > 0; });
      drawParticles();

      // Placement preview
      if (s.placing) {
        const tt = TOWER_TYPES[s.selectedTypeIdx];
        const canPlace = s.money >= tt.cost && distToPath(s.hoverX, s.hoverY) > 20;
        ctx.fillStyle = canPlace ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)";
        ctx.strokeStyle = canPlace ? "#22c55e" : "#ef4444"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(s.hoverX, s.hoverY, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.beginPath(); ctx.arc(s.hoverX, s.hoverY, tt.range, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 1; ctx.stroke();
      }

      drawUI();
    };

    s.animId = requestAnimationFrame(loop);

    return () => {
      s.active = false;
      cancelAnimationFrame(s.animId);
    };
  }, []); // EMPTY dependency array - runs ONCE

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!placing) return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    const y = (e.clientY - rect.top) * (H / rect.height);

    const s = stateRef.current;

    if (distToPath(x, y) <= 20) return;
    const dBase = Math.sqrt((x - BASE_POS.x) ** 2 + (y - BASE_POS.y) ** 2);
    if (dBase < BASE_RADIUS + 20) return;

    for (const t of s.towers) {
      const d = Math.sqrt((x - t.x) ** 2 + (y - t.y) ** 2);
      if (d < 30) return;
    }

    const tt = TOWER_TYPES[selectedType];
    if (s.money >= tt.cost) {
      s.money -= tt.cost;
      setMoney(s.money);
      s.towers.push({ x, y, typeIdx: selectedType, lastFire: 0 });
      // Keep placing mode active
    }
  };

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!placing) return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const s = stateRef.current;
    s.hoverX = (e.clientX - rect.left) * (W / rect.width);
    s.hoverY = (e.clientY - rect.top) * (H / rect.height);
  };

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="flex gap-2 flex-wrap justify-center">
        {TOWER_TYPES.map((tt, i) => (
          <button
            key={tt.id}
            onClick={() => { setSelectedType(i); setPlacing(true); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition-all
              ${selectedType === i ? "border-primary bg-primary/10 scale-105" : "border-border bg-muted/30 hover:bg-muted/50"}
              ${stateRef.current.money < tt.cost ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={stateRef.current.money < tt.cost}
          >
            <span className="text-lg">{tt.emoji}</span>
            <div className="text-left leading-tight">
              <p className="text-[10px]">{tt.name}</p>
              <p className="text-[10px] text-muted-foreground">{tt.cost}💰</p>
            </div>
          </button>
        ))}
        {placing && (
          <Button variant="outline" size="sm" onClick={() => { setPlacing(false); stateRef.current.placing = false; }} className="rounded-xl text-xs">
            キャンセル
          </Button>
        )}
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W} height={H}
          className="border-2 border-border rounded-xl shadow-lg cursor-crosshair"
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMove}
          onMouseLeave={() => { stateRef.current.placing = false; }}
        />
        {!started && (
          <div className="absolute inset-0 bg-green-950/90 flex flex-col items-center justify-center rounded-xl">
            <div className="text-6xl mb-3">🏰</div>
            <h2 className="text-2xl font-black text-white mb-2">タワーディフェンス</h2>
            <p className="text-green-200 text-sm mb-1 text-center max-w-xs">道の先の拠点を守れ！敵が拠点に到達すると拠点HPが減る</p>
            <p className="text-green-300 text-xs mb-4 text-center max-w-xs">塔を選んでマップ上に配置（道の上には置けません）</p>
            <div className="flex gap-2 text-xs text-green-200 mb-4">
              <span>🏹弓: 速射</span>
              <span>💥砲: 範囲</span>
              <span>❄️氷: 遅延</span>
              <span>🔫狙: 超遠距離</span>
              <span>⚡テスラ: 連鎖</span>
            </div>
            <Button onClick={startGame} size="lg" className="rounded-full px-8">スタート！</Button>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 bg-green-950/90 flex flex-col items-center justify-center rounded-xl">
            <div className="text-6xl mb-3">💀</div>
            <h2 className="text-3xl font-black text-white mb-2">拠点が破壊された！</h2>
            <p className="text-green-200 mb-1">ウェーブ {wave} まで生き残った</p>
            <p className="text-green-300 text-sm mb-4">敵を {kills} 体倒した</p>
            <Button onClick={startGame} size="lg" className="rounded-full px-8">もう一度</Button>
          </div>
        )}
        {won && (
          <div className="absolute inset-0 bg-green-950/90 flex flex-col items-center justify-center rounded-xl">
            <div className="text-6xl mb-3">🎉</div>
            <h2 className="text-3xl font-black text-white mb-2">拠点防衛成功！</h2>
            <p className="text-green-200 mb-1">全15ウェーブをクリア！</p>
            <p className="text-green-300 text-sm mb-4">敵を {kills} 体倒した</p>
            <Button onClick={startGame} size="lg" className="rounded-full px-8">もう一度</Button>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">上のタワーボタンを選んで、マップ上でクリックして配置（道の上と近くには置けません）</p>
    </div>
  );
}
