import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useFriends } from "@/context/FriendContext";
import { Send, Search, X, UserPlus, Copy, Check, Users } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function InviteModal({ roomCode, gameName, onClose }: { roomCode: string; gameName: string; onClose: () => void }) {
  const { friends, loading, searchUsers } = useFriends();
  const [tab, setTab] = useState<"friends" | "search">("friends");
  const [search, setSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: number; username: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const filtered = friends.filter(f => f.username.toLowerCase().includes(search.toLowerCase()));

  const [searchError, setSearchError] = useState("");

  const handleUserSearch = async () => {
    if (!userSearch.trim()) return;
    if (userSearch.trim().length < 2) {
      setSearchError("2\u6587\u5b57\u4ee5\u4e0a\u3067\u691c\u7d22\u3057\u3066\u304f\u3060\u3055\u3044");
      return;
    }
    setSearching(true);
    setSearchError("");
    try {
      console.log("[InviteModal] searching for:", userSearch.trim());
      const results = await searchUsers(userSearch.trim());
      console.log("[InviteModal] search results:", results);
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError("\u691c\u7d22\u7d50\u679c\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3067\u3057\u305f");
      }
    } catch (err: any) {
      console.error("[InviteModal] search error:", err);
      setSearchResults([]);
      if (err.message?.includes("401") || err.message?.includes("\u30ed\u30b0\u30a4\u30f3")) {
        setSearchError("\u30ed\u30b0\u30a4\u30f3\u304c\u5fc5\u8981\u3067\u3059");
      } else if (err.message?.includes("2\u6587\u5b57")) {
        setSearchError("2\u6587\u5b57\u4ee5\u4e0a\u3067\u691c\u7d22\u3057\u3066\u304f\u3060\u3055\u3044");
      } else {
        setSearchError("\u691c\u7d22\u306b\u5931\u6557\u3057\u307e\u3057\u305f: " + (err.message || ""));
      }
    } finally {
      setSearching(false);
    }
  };

  const sendInvite = async (username: string) => {
    try {
      await fetch(`${BASE}/api/messages/${username}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content: `こんにちは！「${gameName}」で一緒に遊びませんか？ルームコード：${roomCode}`,
        }),
      });
      setSentTo(username);
      setTimeout(() => setSentTo(null), 3000);
    } catch {
      alert("送信に失敗しました");
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-foreground flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            友達を招待
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 bg-primary/10 border-2 border-primary/30 rounded-xl px-4 py-3">
          <span className="text-xl font-black font-mono tracking-widest text-primary">{roomCode}</span>
          <button onClick={copyCode} className="ml-auto text-primary hover:text-primary/70">
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setTab("friends")}
            className={`flex-1 py-2 text-sm font-bold text-center transition-colors ${tab === "friends" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:bg-muted/50"}`}
          >
            <Users className="w-4 h-4 inline mr-1" />フレンド
          </button>
          <button
            onClick={() => setTab("search")}
            className={`flex-1 py-2 text-sm font-bold text-center transition-colors ${tab === "search" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:bg-muted/50"}`}
          >
            <Search className="w-4 h-4 inline mr-1" />ユーザー名検索
          </button>
        </div>

        {tab === "friends" ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="フレンド検索..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {loading ? (
                <p className="text-center text-muted-foreground text-sm py-4">読み込み中...</p>
              ) : filtered.length === 0 ? (
                <div className="text-center py-4 space-y-2">
                  <p className="text-muted-foreground text-sm">フレンドがいません</p>
                  <p className="text-xs text-muted-foreground">メッセージページでフレンドを追加できます</p>
                </div>
              ) : (
                filtered.map(f => (
                  <div key={f.id} className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-muted transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserPlus className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-bold text-sm">{f.username}</span>
                    </div>
                    <Button
                      size="sm"
                      variant={sentTo === f.username ? "default" : "outline"}
                      onClick={() => sendInvite(f.username)}
                      disabled={sentTo === f.username}
                      className="rounded-full h-7 text-xs"
                    >
                      {sentTo === f.username ? "送信済み" : "招待"}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="ユーザー名を入力..."
                  onKeyDown={e => e.key === "Enter" && handleUserSearch()}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <Button
                size="sm"
                onClick={handleUserSearch}
                disabled={searching || !userSearch.trim()}
                className="rounded-xl h-9 w-9 p-0 shrink-0"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
            {searchError && <p className="text-xs text-red-500 px-1">{searchError}</p>}
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {searching ? (
                <p className="text-center text-muted-foreground text-sm py-4">検索中...</p>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm">検索結果がありません</p>
                  <p className="text-xs text-muted-foreground mt-1">ユーザー名を入力して検索しよう</p>
                </div>
              ) : (
                searchResults.map(u => (
                  <div key={u.id} className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-muted transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-black text-xs">
                        {u.username[0].toUpperCase()}
                      </div>
                      <span className="font-bold text-sm">{u.username}</span>
                    </div>
                    <Button
                      size="sm"
                      variant={sentTo === u.username ? "default" : "outline"}
                      onClick={() => sendInvite(u.username)}
                      disabled={sentTo === u.username}
                      className="rounded-full h-7 text-xs"
                    >
                      {sentTo === u.username ? "送信済み" : "招待"}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
