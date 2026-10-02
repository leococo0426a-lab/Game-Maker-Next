import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { GAMES, CATEGORIES } from "@/data/games";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Play, Users, Gamepad2, Trophy, LogIn, LogOut, User, Shield, X, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const PINNED_IDS = [
  "needlethread", "flappy", "pong", "tetris",
  "puzzle15", "clicker", "simon", "chess", "towerdefense",
];

const SAFE_SITES = [
  { name: "Google検索", url: "https://www.google.com/search?q=programming+tutorial", icon: "🔍" },
  { name: "Wikipedia", url: "https://ja.wikipedia.org/wiki/プログラミング", icon: "📚" },
  { name: "GitHub", url: "https://github.com/explore", icon: "💻" },
  { name: "Stack Overflow", url: "https://stackoverflow.com/questions", icon: "❓" },
  { name: "MDN Web Docs", url: "https://developer.mozilla.org/ja/", icon: "📖" },
  { name: "Notion", url: "https://www.notion.so/", icon: "📔" },
  { name: "ChatGPT", url: "https://chat.openai.com/", icon: "🤖" },
  { name: "CodePen", url: "https://codepen.io/", icon: "💾" },
];

export default function Launcher() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [panicMenuOpen, setPanicMenuOpen] = useState(false);
  const [panicKey, setPanicKey] = useState(() => localStorage.getItem("panic_key") || "");
  const [panicUrl, setPanicUrl] = useState(() => localStorage.getItem("panic_url") || "");
  const { user, logout } = useAuth();

  const handlePanicKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const key = e.key;
    if (key === "Enter" || key === "Escape") return;
    if (key === "Backspace" || key === "Delete") {
      setPanicKey("");
      localStorage.removeItem("panic_key");
      return;
    }
    setPanicKey(key);
    localStorage.setItem("panic_key", key);
  };

  const handlePanicKeyClear = () => {
    setPanicKey("");
    localStorage.removeItem("panic_key");
  };

  const handlePanicSiteClick = (url: string) => {
    setPanicUrl(url);
    localStorage.setItem("panic_url", url);
  };

  useEffect(() => {
    const savedKey = localStorage.getItem("panic_key");
    const savedUrl = localStorage.getItem("panic_url");
    if (savedKey) setPanicKey(savedKey);
    if (savedUrl) setPanicUrl(savedUrl);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const savedKey = localStorage.getItem("panic_key");
      const savedUrl = localStorage.getItem("panic_url");
      if (savedKey && savedUrl && e.key === savedKey && !panicMenuOpen) {
        window.open(savedUrl, "_blank");
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [panicMenuOpen]);

  const pinnedGames = useMemo(
    () => PINNED_IDS.map(id => GAMES.find(g => g.id === id)!).filter(Boolean),
    []
  );

  const filteredGames = useMemo(() => {
    return GAMES.filter(game => {
      const matchesSearch = game.title.toLowerCase().includes(search.toLowerCase()) ||
        game.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === "All" || game.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [search, category]);

  const featuredGame = GAMES[5];

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-xl shadow">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-foreground">le/co/ao Game</h1>
          </div>

          <div className="relative w-full max-w-sm hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ゲームを検索..."
              className="pl-9 bg-muted/50 border-border focus-visible:ring-primary rounded-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setPanicMenuOpen(true)}
              className="flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-full border border-border hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
              title="先生対策"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">先生対策</span>
            </button>
            <Link href="/library">
              <Button variant="outline" size="sm" className="rounded-full hidden md:flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" />
                ライブラリ
              </Button>
            </Link>
            <Link href="/messages">
              <Button variant="outline" size="sm" className="rounded-full hidden md:flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                メッセージ
              </Button>
            </Link>
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground hidden sm:block">
                  <User className="w-3.5 h-3.5 inline mr-1" />{user.username}
                </span>
                <Button variant="ghost" size="sm" onClick={logout} className="rounded-full text-muted-foreground hover:text-foreground">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Link href="/auth">
                <Button size="sm" className="rounded-full">
                  <LogIn className="w-3.5 h-3.5 mr-1" />
                  ログイン
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-10">

        {search === "" && category === "All" && (
          <section className="relative rounded-3xl overflow-hidden group cursor-pointer">
            <Link href={`/game/${featuredGame.id}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-blue-600 to-violet-600 transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"20\" height=\"20\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Crect width=\"1\" height=\"1\" fill=\"white\"%2F%3E%3C/svg%3E')" }} />
              <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1 space-y-4">
                  <Badge variant="secondary" className="bg-white/20 text-white border-none backdrop-blur-sm">
                    注目のゲーム
                  </Badge>
                  <h2 className="text-4xl md:text-5xl font-black text-white drop-shadow-sm">
                    {featuredGame.title} {featuredGame.emoji}
                  </h2>
                  <p className="text-lg text-white/90 max-w-xl">{featuredGame.description}</p>
                  <div className="flex items-center gap-4 pt-4">
                    <Button size="lg" className="bg-white text-blue-700 hover:bg-white/90 font-black px-8 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95">
                      <Play className="w-5 h-5 mr-2 fill-current" /> 今すぐプレイ
                    </Button>
                    <div className="flex items-center text-white/80 text-sm font-bold">
                      <Users className="w-4 h-4 mr-1.5" /> {featuredGame.players} プレイ中
                    </div>
                  </div>
                </div>
                <div className="w-40 h-40 md:w-56 md:h-56 bg-white/10 rounded-3xl backdrop-blur-md border border-white/20 flex items-center justify-center text-8xl shadow-2xl rotate-3 transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110">
                  {featuredGame.emoji}
                </div>
              </div>
            </Link>
          </section>
        )}

        <div className="md:hidden relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="ゲームを検索..." className="pl-9 rounded-full" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <section>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map(c => (
              <Button key={c} variant={category === c ? "default" : "outline"}
                className={`rounded-full px-5 font-bold shrink-0 transition-all ${category === c ? "shadow-md" : "hover:border-primary/40"}`}
                onClick={() => setCategory(c)}>
                {c}
              </Button>
            ))}
          </div>
        </section>

        {/* ── ピックアップ（固定枠） ── */}
        {search === "" && category === "All" && (
          <section>
            <h2 className="text-lg font-black text-foreground mb-3 flex items-center gap-2">
              ⭐ おすすめ
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
              {pinnedGames.map(game => (
                <Link key={game.id} href={`/game/${game.id}`} className="group block">
                  <div className="flex flex-col items-center gap-1.5 p-2 rounded-2xl border-2 border-border bg-white hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform duration-200"
                      style={{ background: `linear-gradient(135deg, ${game.color}40, ${game.color}70)` }}
                    >
                      {game.emoji}
                    </div>
                    <span className="text-[11px] font-black text-foreground text-center leading-tight line-clamp-2">
                      {game.title}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          {filteredGames.length === 0 ? (
            <div className="text-center py-20 bg-muted/30 rounded-2xl border border-border border-dashed">
              <Gamepad2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-muted-foreground">ゲームが見つかりません</h3>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredGames.map(game => (
                <Link key={game.id} href={`/game/${game.id}`} className="group block">
                  <div className="bg-white border-2 border-border rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.03] hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30 flex flex-col h-full relative">
                    {game.comingSoon && (
                      <div className="absolute top-2 right-2 z-10 bg-amber-400 text-amber-900 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
                        近日公開
                      </div>
                    )}
                    {game.multiplayer && !game.comingSoon && (
                      <div className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground text-[9px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-0.5">
                        <Users className="w-2.5 h-2.5" /> 対戦
                      </div>
                    )}
                    <div className="h-32 w-full flex items-center justify-center text-5xl relative overflow-hidden"
                      style={{ background: `linear-gradient(135deg, ${game.color}30, ${game.color}60)` }}>
                      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-200" />
                      <span className={`relative z-10 transition-transform duration-200 ${game.comingSoon ? "opacity-60 grayscale" : "group-hover:scale-110"}`}>
                        {game.emoji}
                      </span>
                    </div>
                    <div className="p-3 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-black text-sm text-foreground leading-tight">{game.title}</h3>
                        <Badge variant="outline" className="text-[9px] font-bold uppercase border-border/60 shrink-0 ml-1">
                          {game.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">{game.description}</p>
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <div className="flex items-center text-[10px] font-medium text-muted-foreground">
                          <Users className="w-3 h-3 mr-1" />{game.players}
                        </div>
                        <Button size="sm" variant="secondary"
                          className={`text-xs font-black rounded-full px-3 h-6 transition-colors ${game.comingSoon ? "" : "group-hover:bg-primary group-hover:text-primary-foreground"}`}>
                          {game.comingSoon ? "近日公開" : "プレイ"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      {panicMenuOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPanicMenuOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-500" />
                先生対策
              </h3>
              <button onClick={() => setPanicMenuOpen(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              お便りキーを設定して、安全なサイトを選ぶと、そのキーを押しただけで移動します
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">便利キーを押して設定</label>
                <Input
                  value={panicKey}
                  onKeyDown={handlePanicKeyDown}
                  placeholder="キーを押して設定..."
                  className="rounded-xl font-mono text-sm text-center"
                  autoFocus
                  readOnly
                />
                {panicKey && <p className="text-xs text-primary font-bold">設定されたキー: {panicKey}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">移動先サイトを選択</label>
                <div className="grid grid-cols-2 gap-2">
                  {SAFE_SITES.map(site => (
                    <button
                      key={site.url}
                      onClick={() => handlePanicSiteClick(site.url)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all ${
                        panicUrl === site.url
                          ? "border-primary bg-primary/10 text-primary font-bold"
                          : "border-border hover:border-primary/40 hover:bg-muted"
                      }`}
                    >
                      <span>{site.icon}</span>
                      <span className="text-xs">{site.name}</span>
                    </button>
                  ))}
                </div>
                {panicUrl && (
                  <p className="text-xs text-muted-foreground">
                    移動先: <span className="font-mono text-primary">{panicUrl}</span>
                  </p>
                )}
              </div>
            </div>
            {panicKey && panicUrl && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                <p className="text-sm font-bold text-green-700">
                  {panicKey} キーを押すと {panicUrl} に移動します
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
