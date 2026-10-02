import { createContext, useContext, useState, useCallback } from "react";

export type PlayRecord = {
  gameId: string;
  score?: number;
  playedAt: string;
};

type GameHistoryContextType = {
  history: PlayRecord[];
  addPlay: (gameId: string, score?: number) => void;
  clearHistory: () => void;
};

const GameHistoryContext = createContext<GameHistoryContextType | null>(null);

const STORAGE_KEY = "gamehub_history";

function loadHistory(): PlayRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function GameHistoryProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<PlayRecord[]>(loadHistory);

  const addPlay = useCallback((gameId: string, score?: number) => {
    const record: PlayRecord = { gameId, score, playedAt: new Date().toISOString() };
    setHistory(prev => {
      const next = [record, ...prev].slice(0, 200);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  }, []);

  return (
    <GameHistoryContext.Provider value={{ history, addPlay, clearHistory }}>
      {children}
    </GameHistoryContext.Provider>
  );
}

export function useGameHistory() {
  const ctx = useContext(GameHistoryContext);
  if (!ctx) throw new Error("useGameHistory must be inside GameHistoryProvider");
  return ctx;
}
