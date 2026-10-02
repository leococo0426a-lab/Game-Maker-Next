import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") await login(username, password);
      else await register(username, password);
      setLocation("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/30 flex flex-col">
      <header className="p-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-lg">
              <Gamepad2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-foreground">le/co/ao Game</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {mode === "login" ? "アカウントにログイン" : "新しいアカウントを作成"}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-lg p-6">
            <div className="flex bg-muted rounded-xl p-1 mb-6">
              <button onClick={() => setMode("login")}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === "login" ? "bg-white shadow text-foreground" : "text-muted-foreground"}`}>
                ログイン
              </button>
              <button onClick={() => setMode("register")}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === "register" ? "bg-white shadow text-foreground" : "text-muted-foreground"}`}>
                新規登録
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-bold text-foreground mb-1.5 block">ユーザー名</label>
                <Input
                  data-testid="input-username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="例: player123"
                  required
                  minLength={3}
                  maxLength={20}
                  className="rounded-xl"
                />
                {mode === "register" && (
                  <p className="text-xs text-muted-foreground mt-1">英数字とアンダースコア、3〜20文字</p>
                )}
              </div>
              <div>
                <label className="text-sm font-bold text-foreground mb-1.5 block">パスワード</label>
                <Input
                  data-testid="input-password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="4文字以上"
                  required
                  minLength={4}
                  className="rounded-xl"
                />
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-sm text-destructive font-bold">
                  {error}
                </div>
              )}

              <Button data-testid="button-submit" type="submit" disabled={loading} className="w-full rounded-xl py-5 font-bold text-base">
                {loading ? "処理中..." : mode === "login" ? "ログイン" : "アカウント作成"}
              </Button>
            </form>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                ✅ Gメール不要
              </span>
              <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
                🏫 学校のPCでもOK
              </span>
              <span className="inline-flex items-center gap-1 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold px-3 py-1 rounded-full">
                🤫 先生にはバレない
              </span>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              ユーザー名とパスワードだけで今すぐ遊べます
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
