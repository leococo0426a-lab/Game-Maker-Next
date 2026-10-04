import { useParams, Link } from "wouter";
import { lazy, Suspense, useState } from "react";
import { ArrowLeft, Users, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GAMES } from "@/data/games";
import NotFound from "./not-found";
import { GameTutorial } from "@/components/GameTutorial";

const Snake = lazy(() => import("@/games/Snake"));
const Game2048 = lazy(() => import("@/games/Game2048"));
const Breakout = lazy(() => import("@/games/Breakout"));
const Memory = lazy(() => import("@/games/Memory"));
const TicTacToe = lazy(() => import("@/games/TicTacToe"));
const Flappy = lazy(() => import("@/games/Flappy"));
const Pong = lazy(() => import("@/games/Pong"));
const OnlinePong = lazy(() => import("@/games/OnlinePong"));
const WhackAMole = lazy(() => import("@/games/WhackAMole"));
const TypingTest = lazy(() => import("@/games/TypingTest"));
const Minesweeper = lazy(() => import("@/games/Minesweeper"));
const OnlineTicTacToe = lazy(() => import("@/games/OnlineTicTacToe"));
const OnlineMemory = lazy(() => import("@/games/OnlineMemory"));
const Tetris = lazy(() => import("@/games/Tetris"));
const ConnectFour = lazy(() => import("@/games/ConnectFour"));
const OnlineConnectFour = lazy(() => import("@/games/OnlineConnectFour"));
const Reversi = lazy(() => import("@/games/Reversi"));
const OnlineReversi = lazy(() => import("@/games/OnlineReversi"));
const Sudoku = lazy(() => import("@/games/Sudoku"));
const Asteroids = lazy(() => import("@/games/Asteroids"));
const SimonSays = lazy(() => import("@/games/SimonSays"));
const Blackjack = lazy(() => import("@/games/Blackjack"));
const Puzzle15 = lazy(() => import("@/games/Puzzle15"));
const CookieClicker = lazy(() => import("@/games/CookieClicker"));
const RPS = lazy(() => import("@/games/RPS"));
const Maze = lazy(() => import("@/games/Maze"));
const Quiz = lazy(() => import("@/games/Quiz"));
const Runner = lazy(() => import("@/games/Runner"));
const Chess = lazy(() => import("@/games/Chess"));
const Battleship = lazy(() => import("@/games/Battleship"));
const OnlineBattleship = lazy(() => import("@/games/OnlineBattleship"));
const Darts = lazy(() => import("@/games/Darts"));
const Sokoban = lazy(() => import("@/games/Sokoban"));
const BubbleShooter = lazy(() => import("@/games/BubbleShooter"));
const Solitaire = lazy(() => import("@/games/Solitaire"));
const SpaceInvaders = lazy(() => import("@/games/SpaceInvaders"));
const TowersOfHanoi = lazy(() => import("@/games/TowersOfHanoi"));
const Bowling = lazy(() => import("@/games/Bowling"));
const Painting = lazy(() => import("@/games/Painting"));
const WordChain = lazy(() => import("@/games/WordChain"));
const TowerDefense = lazy(() => import("@/games/TowerDefense"));
const MahjongSolitaire = lazy(() => import("@/games/MahjongSolitaire"));
const Archery = lazy(() => import("@/games/Archery"));
const Rhythm = lazy(() => import("@/games/Rhythm"));
const Fishing = lazy(() => import("@/games/Fishing"));
const Racing = lazy(() => import("@/games/Racing"));
const Pinball = lazy(() => import("@/games/Pinball"));
const MiniGolf = lazy(() => import("@/games/MiniGolf"));
const KatakanaWordle = lazy(() => import("@/games/KatakanaWordle"));
const Dungeon = lazy(() => import("@/games/Dungeon"));
const Platformer = lazy(() => import("@/games/Platformer"));
const Bomberman = lazy(() => import("@/games/Bomberman"));
const Go = lazy(() => import("@/games/Go"));
const GravityPuzzle = lazy(() => import("@/games/GravityPuzzle"));
const DodgeGame = lazy(() => import("@/games/DodgeGame"));
const Crossword = lazy(() => import("@/games/Crossword"));
const OnlineChess = lazy(() => import("@/games/OnlineChess"));
const Pictionary = lazy(() => import("@/games/Pictionary"));
const ReflexTest = lazy(() => import("@/games/ReflexTest"));
const BalloonPop = lazy(() => import("@/games/BalloonPop"));
const NeedleThread = lazy(() => import("@/games/NeedleThread"));
const TypingBomb = lazy(() => import("@/games/TypingBomb"));

const MULTIPLAYER_GAMES = new Set(["tictactoe", "memory", "connect4", "reversi", "battleship", "chess", "pong"]);

export default function GamePage() {
  const params = useParams();
  const gameId = params.id;
  const [multiMode, setMultiMode] = useState<"ai" | "online">("ai");

  const game = GAMES.find(g => g.id === gameId);
  if (!game) return <NotFound />;

  const renderGame = () => {
    switch (gameId) {
      case "snake": return <Snake />;
      case "2048": return <Game2048 />;
      case "breakout": return <Breakout />;
      case "memory": return multiMode === "online" ? <OnlineMemory /> : <Memory />;
      case "tictactoe": return multiMode === "online" ? <OnlineTicTacToe /> : <TicTacToe />;
      case "flappy": return <Flappy />;
      case "pong": return multiMode === "online" ? <OnlinePong /> : <Pong />;
      case "whackamole": return <WhackAMole />;
      case "typing": return <TypingTest />;
      case "minesweeper": return <Minesweeper />;
      case "tetris": return <Tetris />;
      case "connect4": return multiMode === "online" ? <OnlineConnectFour /> : <ConnectFour />;
      case "reversi": return multiMode === "online" ? <OnlineReversi /> : <Reversi />;
      case "sudoku": return <Sudoku />;
      case "asteroids": return <Asteroids />;
      case "simon": return <SimonSays />;
      case "blackjack": return <Blackjack />;
      case "puzzle15": return <Puzzle15 />;
      case "clicker": return <CookieClicker />;
      case "rps": return <RPS />;
      case "maze": return <Maze />;
      case "quiz": return <Quiz />;
      case "runner": return <Runner />;
      case "chess": return multiMode === "online" ? <OnlineChess /> : <Chess />;
      case "battleship": return multiMode === "online" ? <OnlineBattleship /> : <Battleship />;
      case "darts": return <Darts />;
      case "sokoban": return <Sokoban />;
      case "bubble": return <BubbleShooter />;
      case "solit": return <Solitaire />;
      case "space": return <SpaceInvaders />;
      case "towers": return <TowersOfHanoi />;
      case "bowling": return <Bowling />;
      case "painting": return <Painting />;
      case "wordchain": return <WordChain />;
      case "towerdefense": return <TowerDefense />;
      case "mahjong": return <MahjongSolitaire />;
      case "archery": return <Archery />;
      case "fishing": return <Fishing />;
      case "racing": return <Racing />;
      case "pinball": return <Pinball />;
      case "minigolf": return <MiniGolf />;
      case "wordle2": return <KatakanaWordle />;
      case "platformer": return <Platformer />;
      case "bomberman": return <Bomberman />;
      case "go": return <Go />;
      case "dodge": return <DodgeGame />;
      case "crossword": return <Crossword />;
      case "pictionary": return <Pictionary />;
      case "reflex": return <ReflexTest />;
      case "balloonpop": return <BalloonPop />;
      case "needlethread": return <NeedleThread />;
      case "typingbomb": return <TypingBomb />;
      default: return <div className="text-center p-10 text-muted-foreground">ゲームが見つかりません</div>;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-white border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/"><Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4 mr-2" />ランチャーへ</Button></Link>
          <div className="flex items-center gap-2 font-black text-lg">{game.emoji} {game.title}</div>
          {MULTIPLAYER_GAMES.has(gameId!) ? (
            <div className="flex bg-muted rounded-lg p-1 gap-1">
              <button onClick={() => setMultiMode("ai")}
                className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-md transition-all ${multiMode === "ai" ? "bg-white shadow text-foreground" : "text-muted-foreground"}`}>
                <Cpu className="w-3 h-3" /> AI
              </button>
              <button onClick={() => setMultiMode("online")}
                className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-md transition-all ${multiMode === "online" ? "bg-white shadow text-foreground" : "text-muted-foreground"}`}>
                <Users className="w-3 h-3" /> オンライン
              </button>
            </div>
          ) : (
            <div className="w-[100px]" />
          )}
          <GameTutorial gameId={gameId!} />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none blur-3xl"
          style={{ background: `radial-gradient(circle at center, ${game.color}, transparent 60%)` }} />
        <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center">
          <Suspense fallback={null}>{renderGame()}</Suspense>
        </div>
      </main>
    </div>
  );
}
