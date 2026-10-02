import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

const QUESTIONS = [
  { q: "日本の首都は？", options: ["大阪","東京","京都","名古屋"], a: 1, category: "地理" },
  { q: "地球から最も近い星は？", options: ["シリウス","ベガ","プロキシマ・ケンタウリ","アルタイル"], a: 2, category: "科学" },
  { q: "水の化学式は？", options: ["CO2","H2O","O2","NaCl"], a: 1, category: "科学" },
  { q: "モナ・リザを描いたのは誰？", options: ["ピカソ","ゴッホ","ダ・ヴィンチ","ミケランジェロ"], a: 2, category: "アート" },
  { q: "インターネットのWWWを考案したのは誰？", options: ["ビル・ゲイツ","スティーブ・ジョブズ","ティム・バーナーズ＝リー","マーク・ザッカーバーグ"], a: 2, category: "テクノロジー" },
  { q: "世界で最も長い川は？", options: ["アマゾン川","ナイル川","長江","ミシシッピ川"], a: 1, category: "地理" },
  { q: "音楽の速さを表す単位は？", options: ["デシベル","ヘルツ","BPM","ワット"], a: 2, category: "音楽" },
  { q: "人体で最も大きい臓器は？", options: ["心臓","肺","肝臓","皮膚"], a: 3, category: "科学" },
  { q: "『ハリー・ポッター』の作者は？", options: ["J・R・R・トールキン","J・K・ローリング","C・S・ルイス","ロアルド・ダール"], a: 1, category: "文学" },
  { q: "オリンピックの輪は何色ある？", options: ["4","5","6","7"], a: 1, category: "スポーツ" },
  { q: "光の速さは約何km/秒？", options: ["3万km","30万km","300万km","3000万km"], a: 1, category: "科学" },
  { q: "シェイクスピアの有名な作品は？", options: ["罪と罰","ハムレット","変身","白鯨"], a: 1, category: "文学" },
  { q: "月が地球を一周するのに何日かかる？", options: ["7日","14日","27日","365日"], a: 2, category: "科学" },
  { q: "サッカーのワールドカップは何年ごと？", options: ["2年","3年","4年","5年"], a: 2, category: "スポーツ" },
  { q: "富士山の高さは約何m？", options: ["2,776m","3,776m","4,776m","5,776m"], a: 1, category: "地理" },
];

const QUIZ_COUNT = 10;
const TIME_PER_Q = 15;

function shuffle<T>(arr: T[]) { return [...arr].sort(() => Math.random() - 0.5); }

export default function Quiz() {
  const [questions] = useState(() => shuffle(QUESTIONS).slice(0, QUIZ_COUNT));
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [phase, setPhase] = useState<"playing" | "done">("playing");
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q);
  const { addPlay } = useGameHistory();

  const next = useCallback(() => {
    if (idx + 1 >= QUIZ_COUNT) { setPhase("done"); addPlay("quiz", score); }
    else { setIdx(i => i + 1); setSelected(null); setTimeLeft(TIME_PER_Q); }
  }, [idx, score, addPlay]);

  useEffect(() => {
    if (phase !== "playing" || selected !== null) return;
    if (timeLeft <= 0) { setSelected(-1); setTimeout(next, 1000); return; }
    const t = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, phase, selected, next]);

  const pick = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    if (i === questions[idx].a) setScore(s => s + 1);
    setTimeout(next, 1200);
  };

  const reset = () => { setIdx(0); setScore(0); setSelected(null); setPhase("playing"); setTimeLeft(TIME_PER_Q); };

  if (phase === "done") {
    return (
      <div className="flex flex-col items-center space-y-5 max-w-md mx-auto p-4 text-center">
        <div className="text-6xl">{score >= 8 ? "🏆" : score >= 5 ? "🎯" : "📚"}</div>
        <h2 className="text-2xl font-black text-foreground">クイズ終了！</h2>
        <div className="w-full bg-muted/50 border border-border rounded-2xl p-6">
          <p className="text-5xl font-black text-primary mb-1">{score}<span className="text-2xl text-muted-foreground">/{QUIZ_COUNT}</span></p>
          <p className="text-muted-foreground">{score >= 8 ? "素晴らしい！" : score >= 5 ? "まあまあ！" : "もっと勉強しよう！"}</p>
        </div>
        <Button onClick={reset} size="lg" className="rounded-full px-10">もう一度</Button>
      </div>
    );
  }

  const q = questions[idx];
  const progressBar = (timeLeft / TIME_PER_Q) * 100;

  return (
    <div className="flex flex-col space-y-4 max-w-md mx-auto p-4">
      <div className="flex justify-between items-center">
        <span className="text-sm font-bold text-muted-foreground">{idx + 1}/{QUIZ_COUNT}</span>
        <span className="bg-primary/10 text-primary text-xs font-black px-3 py-1 rounded-full">{q.category}</span>
        <span className={`text-sm font-black ${timeLeft <= 5 ? "text-destructive animate-pulse" : "text-foreground"}`}>{timeLeft}s</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${progressBar}%` }} />
      </div>
      <div className="bg-white border-2 border-border rounded-2xl p-5 min-h-[80px] flex items-center">
        <p className="text-lg font-black text-foreground text-center w-full">{q.q}</p>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {q.options.map((opt, i) => {
          let style = "bg-white border-2 border-border hover:border-primary";
          if (selected !== null) {
            if (i === q.a) style = "bg-green-100 border-2 border-green-500 text-green-700";
            else if (i === selected) style = "bg-red-100 border-2 border-red-500 text-red-700";
            else style = "bg-muted border-2 border-border opacity-50";
          }
          return (
            <button key={i} onClick={() => pick(i)}
              className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-all ${style}`}>
              <span className="mr-3 font-black">{["A","B","C","D"][i]}.</span>{opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
