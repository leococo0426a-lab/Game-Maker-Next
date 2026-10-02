import { useParams, Link } from "wouter";
import { useState } from "react";
import { ArrowLeft, Users, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GAMES } from "@/data/games";
import NotFound from "./not-found";
import { GameTutorial } from "@/components/GameTutorial";

import Snake from "@/games/Snake";
import Game2048 from "@/games/Game2048";
import Breakout from "@/games/Breakout";
import Memory from "@/games/Memory";
import TicTacToe from "@/games/TicTacToe";
import Flappy from "@/games/Flappy";
import Pong from "@/games/Pong";
import OnlinePong from "@/games/OnlinePong";
import WhackAMole from "@/games/WhackAMole";
import TypingTest from "@/games/TypingTest";
import Minesweeper from "@/games/Minesweeper";
import OnlineTicTacToe from "@/games/OnlineTicTacToe";
import OnlineMemory from "@/games/OnlineMemory";
import Tetris from "@/games/Tetris";
import ConnectFour from "@/games/ConnectFour";
import OnlineConnectFour from "@/games/OnlineConnectFour";
import Reversi from "@/games/Reversi";
import OnlineReversi from "@/games/OnlineReversi";
import Sudoku from "@/games/Sudoku";
import Asteroids from "@/games/Asteroids";
import SimonSays from "@/games/SimonSays";
import Blackjack from "@/games/Blackjack";
import Puzzle15 from "@/games/Puzzle15";
import CookieClicker from "@/games/CookieClicker";
import RPS from "@/games/RPS";
import Maze from "@/games/Maze";
import Quiz from "@/games/Quiz";
import Runner from "@/games/Runner";
import Chess from "@/games/Chess";
import Battleship from "@/games/Battleship";
import OnlineBattleship from "@/games/OnlineBattleship";
import Darts from "@/games/Darts";
import Sokoban from "@/games/Sokoban";
import BubbleShooter from "@/games/BubbleShooter";
import Solitaire from "@/games/Solitaire";
import SpaceInvaders from "@/games/SpaceInvaders";
import TowersOfHanoi from "@/games/TowersOfHanoi";
import Bowling from "@/games/Bowling";
import Painting from "@/games/Painting";
import WordChain from "@/games/WordChain";
import TowerDefense from "@/games/TowerDefense";
import MahjongSolitaire from "@/games/MahjongSolitaire";
import Archery from "@/games/Archery";
import Rhythm from "@/games/Rhythm";
import Fishing from "@/games/Fishing";
import Racing from "@/games/Racing";
import Pinball from "@/games/Pinball";
import MiniGolf from "@/games/MiniGolf";
import KatakanaWordle from "@/games/KatakanaWordle";
import Dungeon from "@/games/Dungeon";
import Platformer from "@/games/Platformer";
import Bomberman from "@/games/Bomberman";
import Go from "@/games/Go";
import GravityPuzzle from "@/games/GravityPuzzle";
import DodgeGame from "@/games/DodgeGame";
import Crossword from "@/games/Crossword";
import OnlineChess from "@/games/OnlineChess";
import Pictionary from "@/games/Pictionary";
import ReflexTest from "@/games/ReflexTest";
import BalloonPop from "@/games/BalloonPop";
import NeedleThread from "@/games/NeedleThread";
import TypingBomb from "@/games/TypingBomb";

const MULTIPLAYER_GAMES = new Set(["tictactoe", "memory", "connect4", "reversi", "battleship", "chess", "pong"]);

export default function GamePage() {
  const params = useParams();
  const gameId = params.id;
  const [multiMode, setMultiMode] = useState<"ai" | "online">("ai");

  const game = GAMES.find(g => g.id === gameId);
  if (!game) return <NotFound />;

  if (game.comingSoon) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="bg-white border-b border-border sticky top-0 z-50">
          <div className="container mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/"><Button variant="ghost" size="sm" className="text-muted-foreground"><ArrowLeft className="w-4 h-4 mr-2" />ランチャーへ</Button></Link>
            <div className="flex items-center gap-2 font-black text-lg">{game.emoji} {game.title}</div>
            <div className="w-[100px]" />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="text-8xl mb-6">{game.emoji}</div>
            <h2 className="text-3xl font-black text-foreground mb-3">{game.title}</h2>
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl px-6 py-4 mb-6">
              <p className="text-amber-700 font-black text-lg">Coming Soon!</p>
              <p className="text-amber-600 text-sm mt-1">このゲームは現在開発中です。もうしばらくお待ちください！</p>
            </div>
            <Link href="/"><Button className="rounded-full px-8">他のゲームを遊ぶ</Button></Link>
          </div>
        </main>
      </div>
    );
  }

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
          {renderGame()}
        </div>
      </main>
    </div>
  );
}
