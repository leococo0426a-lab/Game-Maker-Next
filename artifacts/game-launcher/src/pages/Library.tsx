import { Link } from "wouter";
import { ArrowLeft, Trash2, Gamepad2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGameHistory } from "@/context/GameHistoryContext";
import { GAMES } from "@/data/games";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function Library() {
  const { history, clearHistory } = useGameHistory();

  const gameMap = Object.fromEntries(GAMES.map(g => [g.id, g]));

  const stats: Record<string, { plays: number; best?: number }> = {};
  history.forEach(r => {
    if (!stats[r.gameId]) stats[r.gameId] = { plays: 0 };
    stats[r.gameId].plays++;
    if (r.score !== undefined) {
      if (stats[r.gameId].best === undefined || r.score > stats[r.gameId].best!) {
        stats[r.gameId].best = r.score;
      }
    }
  });

  const playedGames = Object.entries(stats).sort((a, b) => b[1].plays - a[1].plays);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              ランチャーへ
            </Button>
          </Link>
          <div className="flex items-center gap-2 font-black text-lg text-foreground">
            <Trophy className="w-5 h-5 text-primary" />
            ライブラリ
          </div>
          {history.length > 0 && (
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={clearHistory}>
              <Trash2 className="w-4 h-4 mr-1" />
              クリア
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {history.length === 0 ? (
          <div className="text-center py-20">
            <Gamepad2 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h2 className="text-2xl font-black text-foreground mb-2">まだゲームを遊んでいません</h2>
            <p className="text-muted-foreground mb-6">ゲームを遊ぶとここに履歴が表示されます！</p>
            <Link href="/">
              <Button className="rounded-full px-8">ゲームを遊ぶ</Button>
            </Link>
          </div>
        ) : (
          <>
            <section>
              <h2 className="text-xl font-black text-foreground mb-4">プレイしたゲーム ({playedGames.length})</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {playedGames.map(([gameId, stat]) => {
                  const game = gameMap[gameId];
                  if (!game) return null;
                  return (
                    <Link key={gameId} href={`/game/${gameId}`}>
                      <div className="bg-white border-2 border-border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-md transition-all group">
                        <div className="h-24 flex items-center justify-center text-5xl"
                          style={{ background: `linear-gradient(135deg, ${game.color}22, ${game.color}44)` }}>
                          {game.emoji}
                        </div>
                        <div className="p-3">
                          <h3 className="font-black text-sm text-foreground truncate">{game.title}</h3>
                          <p className="text-xs text-muted-foreground">{stat.plays} 回プレイ</p>
                          {stat.best !== undefined && (
                            <p className="text-xs font-bold text-primary mt-1">ベスト: {stat.best}</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-black text-foreground mb-4">最近の履歴</h2>
              <div className="bg-white border border-border rounded-2xl overflow-hidden divide-y divide-border">
                {history.slice(0, 50).map((record, i) => {
                  const game = gameMap[record.gameId];
                  if (!game) return null;
                  return (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30">
                      <span className="text-2xl">{game.emoji}</span>
                      <div className="flex-1">
                        <p className="font-bold text-sm text-foreground">{game.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(record.playedAt)}</p>
                      </div>
                      {record.score !== undefined && (
                        <span className="text-sm font-black text-primary">{record.score} pts</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
