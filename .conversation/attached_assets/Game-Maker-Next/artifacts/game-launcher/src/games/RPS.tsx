import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";

type Choice = "rock" | "paper" | "scissors";
const CHOICES: Choice[] = ["rock", "paper", "scissors"];
const EMOJI: Record<Choice, string> = { rock: "✊", paper: "✋", scissors: "✌️" };
const LABEL: Record<Choice, string> = { rock: "グー", paper: "パー", scissors: "チョキ" };
const BEATS: Record<Choice, Choice> = { rock: "scissors", paper: "rock", scissors: "paper" };

function getResult(player: Choice, ai: Choice): "win" | "lose" | "draw" {
  if (player === ai) return "draw";
  if (BEATS[player] === ai) return "win";
  return "lose";
}

export default function RPS() {
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [round, setRound] = useState(0);
  const [lastPlayer, setLastPlayer] = useState<Choice | null>(null);
  const [lastAi, setLastAi] = useState<Choice | null>(null);
  const [lastResult, setLastResult] = useState<string>("");
  const [gameOver, setGameOver] = useState(false);
  const MAX_ROUNDS = 5;
  const { addPlay } = useGameHistory();

  const play = useCallback((choice: Choice) => {
    if (gameOver) return;
    const ai = CHOICES[Math.floor(Math.random() * 3)];
    const result = getResult(choice, ai);
    const newRound = round + 1;
    let ps = playerScore, as = aiScore;
    if (result === "win") { ps++; setPlayerScore(ps); }
    else if (result === "lose") { as++; setAiScore(as); }
    setLastPlayer(choice); setLastAi(ai);
    setLastResult(result === "win" ? "あなたの勝ち！" : result === "lose" ? "AIの勝ち..." : "引き分け！");
    setRound(newRound);
    if (newRound >= MAX_ROUNDS) {
      setGameOver(true);
      addPlay("rps", ps);
    }
  }, [gameOver, round, playerScore, aiScore, addPlay]);

  const reset = () => { setPlayerScore(0); setAiScore(0); setRound(0); setLastPlayer(null); setLastAi(null); setLastResult(""); setGameOver(false); };

  return (
    <div className="flex flex-col items-center space-y-6 max-w-xs mx-auto p-4">
      <div className="flex justify-between w-full text-center">
        <div><p className="text-xs font-bold text-primary uppercase">あなた</p><p className="text-3xl font-black text-foreground">{playerScore}</p></div>
        <div><p className="text-xs text-muted-foreground font-bold">ラウンド {round}/{MAX_ROUNDS}</p></div>
        <div><p className="text-xs font-bold text-destructive uppercase">AI</p><p className="text-3xl font-black text-foreground">{aiScore}</p></div>
      </div>

      {lastPlayer && (
        <div className="w-full bg-muted/50 rounded-2xl p-4 text-center border border-border">
          <div className="flex justify-around items-center mb-2">
            <div className="text-center"><p className="text-5xl">{EMOJI[lastPlayer]}</p><p className="text-xs font-bold text-muted-foreground mt-1">{LABEL[lastPlayer]}</p></div>
            <p className="text-2xl font-black text-muted-foreground">VS</p>
            <div className="text-center"><p className="text-5xl">{EMOJI[lastAi!]}</p><p className="text-xs font-bold text-muted-foreground mt-1">{LABEL[lastAi!]}</p></div>
          </div>
          <p className={`font-black text-lg ${lastResult.includes("あなた") ? "text-green-600" : lastResult.includes("AI") ? "text-red-600" : "text-yellow-600"}`}>{lastResult}</p>
        </div>
      )}

      {!gameOver ? (
        <div className="flex gap-4">
          {CHOICES.map(c => (
            <button key={c} onClick={() => play(c)} className="flex flex-col items-center gap-2 bg-white border-2 border-border rounded-2xl p-4 hover:border-primary hover:scale-105 transition-all w-24">
              <span className="text-4xl">{EMOJI[c]}</span>
              <span className="text-xs font-black text-foreground">{LABEL[c]}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center space-y-3 w-full">
          <div className={`text-2xl font-black ${playerScore > aiScore ? "text-green-600" : playerScore < aiScore ? "text-red-600" : "text-yellow-600"}`}>
            {playerScore > aiScore ? "あなたの勝ち！🎉" : playerScore < aiScore ? "AIの勝ち...😢" : "引き分け！🤝"}
          </div>
          <p className="text-muted-foreground">{playerScore} - {aiScore}</p>
          <Button onClick={reset} className="rounded-full px-8 w-full">もう一度</Button>
        </div>
      )}
    </div>
  );
}
