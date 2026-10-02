import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft, Send, MessageCircle, Search, UserPlus, UserMinus, Users, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useFriends } from "@/context/FriendContext";

type Message = { id: number; fromUserId: number; toUserId: number; content: string; createdAt: string };
type Conversation = { userId: number; username: string; lastMessage: string; createdAt: string };

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, { credentials: "include", headers: { "Content-Type": "application/json" }, ...opts });
  const data = await res.json().catch(() => ({ message: "サーバーからの応答を読み取れませんでした" }));
  if (!res.ok) {
    throw new Error(typeof data.message === "string" ? data.message : "リクエストに失敗しました");
  }
  return data;
}

export default function Messages() {
  const { user } = useAuth();
  const { friends, addFriend, removeFriend, searchUsers } = useFriends();
  const [tab, setTab] = useState<"messages" | "friends">("messages");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<{ userId: number; username: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [friendSearch, setFriendSearch] = useState("");
  const [friendSearchResults, setFriendSearchResults] = useState<{ id: number; username: string }[]>([]);
  const [addingFriend, setAddingFriend] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiFetch("/api/messages/conversations");
      if (data.conversations) setConversations(data.conversations);
    } catch {}
  }, [user]);

  const fetchMessages = useCallback(async () => {
    if (!selected) return;
    try {
      const data = await apiFetch(`/api/messages/${selected.username}`);
      if (data.messages) setMessages(data.messages);
    } catch {}
  }, [selected]);

  useEffect(() => { fetchConversations(); const t = setInterval(fetchConversations, 5000); return () => clearInterval(t); }, [fetchConversations]);
  useEffect(() => { fetchMessages(); const t = setInterval(fetchMessages, 2000); return () => clearInterval(t); }, [fetchMessages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const searchUser = async () => {
    if (!search.trim()) return;
    try {
      const data = await apiFetch(`/api/messages/${search.trim()}`);
      if (data.targetUser?.id === user?.id) {
        setSearchResult("自分自身にはメッセージできません。別のユーザー名を検索してください");
        return;
      }
      if (data.targetUser) { setSelected({ userId: data.targetUser.id, username: data.targetUser.username }); setMessages(data.messages || []); setSearch(""); setSearchResult(null); setError(""); }
      else setSearchResult("ユーザーが見つかりません");
    } catch (err) {
      setSearchResult(err instanceof Error ? err.message : "ユーザーが見つかりません");
    }
  };

  const sendMessage = async () => {
    if (!selected || !newMsg.trim() || sending) return;
    setSending(true); setError("");
    try {
      const data = await apiFetch(`/api/messages/${selected.username}`, { method: "POST", body: JSON.stringify({ content: newMsg.trim() }) });
      if (!data.message || typeof data.message !== "object") throw new Error("送信結果を確認できませんでした");
      setMessages(prev => [...prev, data.message]); setNewMsg(""); fetchConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally { setSending(false); }
  };

  const handleFriendSearch = async () => {
    if (!friendSearch.trim() || friendSearch.length < 2) return;
    setAddingFriend(true);
    try {
      const results = await searchUsers(friendSearch.trim());
      setFriendSearchResults(results);
    } catch {
      setFriendSearchResults([]);
    } finally {
      setAddingFriend(false);
    }
  };

  const handleAddFriend = async (username: string) => {
    try {
      await addFriend(username);
      setFriendSearchResults(prev => prev.filter(u => u.username !== username));
    } catch (err: any) {
      alert(err.message || "追加に失敗しました");
    }
  };

  const handleRemoveFriend = async (id: number) => {
    if (!confirm("フレンドを削除しますか？")) return;
    try {
      await removeFriend(id);
    } catch {
      alert("削除に失敗しました");
    }
  };

  if (!user) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
      <MessageCircle className="w-16 h-16 text-muted-foreground opacity-30" />
      <h2 className="text-xl font-black text-muted-foreground">ログインが必要です</h2>
      <Link href="/auth"><Button className="rounded-full px-8">ログイン</Button></Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ maxHeight: "100vh" }}>
      <header className="bg-white border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/"><Button variant="ghost" size="sm" className="text-muted-foreground"><ArrowLeft className="w-4 h-4 mr-2" />戻る</Button></Link>
          <MessageCircle className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-black text-foreground">メッセージ</h1>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>
        <div className="w-72 border-r border-border flex flex-col bg-white shrink-0">
          <div className="flex border-b border-border">
            <button onClick={() => setTab("messages")} className={`flex-1 py-2 text-sm font-bold text-center transition-colors ${tab === "messages" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:bg-muted/50"}`}>
              <MessageCircle className="w-4 h-4 inline mr-1" />メッセージ
            </button>
            <button onClick={() => setTab("friends")} className={`flex-1 py-2 text-sm font-bold text-center transition-colors ${tab === "friends" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:bg-muted/50"}`}>
              <Users className="w-4 h-4 inline mr-1" />フレンド
            </button>
          </div>

          {tab === "messages" ? (
            <>
              <div className="p-3 border-b border-border">
                <div className="flex gap-2">
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="ユーザー名で検索..." className="rounded-full text-sm h-9" onKeyDown={e => e.key === "Enter" && searchUser()} />
                  <Button size="sm" onClick={searchUser} className="rounded-full h-9 w-9 p-0 shrink-0"><Search className="w-4 h-4" /></Button>
                </div>
                {searchResult && <p className="text-xs text-red-500 mt-1 px-2">{searchResult}</p>}
              </div>
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                    <p className="text-sm text-muted-foreground">まだ会話がありません</p>
                    <p className="text-xs text-muted-foreground mt-1">ユーザー名で検索して話しかけよう！</p>
                  </div>
                ) : conversations.map(conv => (
                  <button key={conv.userId} onClick={() => setSelected({ userId: conv.userId, username: conv.username })}
                    className={`w-full flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors border-b border-border/50 text-left ${selected?.userId === conv.userId ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-black text-lg shrink-0">
                      {conv.username[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-foreground">{conv.username}</p>
                      <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="p-3 border-b border-border space-y-2">
                <div className="flex gap-2">
                  <Input value={friendSearch} onChange={e => setFriendSearch(e.target.value)} placeholder="ユーザー名でフレンド検索..." className="rounded-full text-sm h-9" onKeyDown={e => e.key === "Enter" && handleFriendSearch()} />
                  <Button size="sm" onClick={handleFriendSearch} disabled={addingFriend} className="rounded-full h-9 w-9 p-0 shrink-0"><Search className="w-4 h-4" /></Button>
                </div>
                {friendSearchResults.length > 0 && (
                  <div className="space-y-1">
                    {friendSearchResults.map(u => (
                      <div key={u.id} className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-muted/50">
                        <span className="text-sm font-bold">{u.username}</span>
                        <Button size="sm" variant="outline" onClick={() => handleAddFriend(u.username)} className="rounded-full h-6 text-xs px-2">
                          <UserPlus className="w-3 h-3 mr-1" />追加
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto">
                {friends.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                    <p className="text-sm text-muted-foreground">フレンドがいません</p>
                    <p className="text-xs text-muted-foreground mt-1">上の検索でフレンドを追加しよう！</p>
                  </div>
                ) : friends.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-3 border-b border-border/50 hover:bg-muted/50 transition-colors">
                    <button onClick={() => { setSelected({ userId: f.id, username: f.username }); setTab("messages"); }}
                      className="flex items-center gap-3 flex-1 text-left">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-black text-lg shrink-0">
                        {f.username[0].toUpperCase()}
                      </div>
                      <p className="font-black text-sm text-foreground">{f.username}</p>
                    </button>
                    <button onClick={() => handleRemoveFriend(f.id)} className="text-muted-foreground hover:text-destructive p-1 rounded-lg hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
              <MessageCircle className="w-16 h-16 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground font-bold">会話を選択するか、ユーザー名で検索してメッセージを送ろう！</p>
            </div>
          ) : (
            <>
              <div className="bg-white border-b border-border px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-black">
                  {selected.username[0].toUpperCase()}
                </div>
                <p className="font-black text-foreground">{selected.username}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-8">メッセージがありません。最初に話しかけよう！</div>
                )}
                {messages.map(msg => {
                  const isMine = msg.fromUserId === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm ${isMine ? "bg-primary text-white rounded-br-sm" : "bg-white text-foreground border border-border rounded-bl-sm"}`}>
                        <p>{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isMine ? "text-white/60" : "text-muted-foreground"}`}>
                          {new Date(msg.createdAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <div className="bg-white border-t border-border p-3">
                {error && <p className="text-xs text-red-500 mb-2 px-1">{error}</p>}
                <div className="flex gap-2">
                  <Input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="メッセージを入力..." className="rounded-full" maxLength={500}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
                  <Button onClick={sendMessage} disabled={!newMsg.trim() || sending} className="rounded-full h-10 w-10 p-0 shrink-0"><Send className="w-4 h-4" /></Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
