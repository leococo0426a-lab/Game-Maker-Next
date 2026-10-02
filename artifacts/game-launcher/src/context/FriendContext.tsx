import { createContext, useContext, useState, useCallback, useEffect } from "react";

export type FriendUser = {
  id: number;
  username: string;
};

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: "エラー" }));
    throw new Error(body.message || "エラー");
  }
  return res.json();
}

type FriendContextType = {
  friends: FriendUser[];
  loading: boolean;
  refresh: () => Promise<void>;
  addFriend: (username: string) => Promise<void>;
  removeFriend: (id: number) => Promise<void>;
  searchUsers: (q: string) => Promise<FriendUser[]>;
};

const FriendContext = createContext<FriendContextType | null>(null);

export function FriendProvider({ children }: { children: React.ReactNode }) {
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/friends");
      setFriends(data.friends || []);
    } catch {
      setFriends([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addFriend = useCallback(async (username: string) => {
    await apiFetch("/friends", { method: "POST", body: JSON.stringify({ username }) });
    await refresh();
  }, [refresh]);

  const removeFriend = useCallback(async (id: number) => {
    await apiFetch(`/friends/${id}`, { method: "DELETE" });
    setFriends(prev => prev.filter(f => f.id !== id));
  }, []);

  const searchUsers = useCallback(async (q: string) => {
    const data = await apiFetch(`/users/search?q=${encodeURIComponent(q)}`);
    return data.users || [];
  }, []);

  return (
    <FriendContext.Provider value={{ friends, loading, refresh, addFriend, removeFriend, searchUsers }}>
      {children}
    </FriendContext.Provider>
  );
}

export function useFriends() {
  const ctx = useContext(FriendContext);
  if (!ctx) throw new Error("useFriends must be inside FriendProvider");
  return ctx;
}
