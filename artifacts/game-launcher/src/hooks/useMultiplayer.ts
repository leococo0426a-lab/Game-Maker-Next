import { useState, useEffect, useRef, useCallback } from "react";

export type MPStatus = "idle" | "connecting" | "waiting" | "ready" | "playing" | "ended" | "error";

type MPMessage = {
  type: string;
  [key: string]: unknown;
};

type UseMultiplayerOptions = {
  gameId: string;
  onMove?: (data: unknown) => void;
  onStart?: (playerId: string, roomCode: string) => void;
  onOpponentLeft?: () => void;
  onGameReset?: () => void;
};

export function useMultiplayer({ gameId, onMove, onStart, onOpponentLeft, onGameReset }: UseMultiplayerOptions) {
  const [status, setStatus] = useState<MPStatus>("idle");
  const [roomCode, setRoomCode] = useState("");
  const [playerId, setPlayerId] = useState<"1" | "2" | null>(null);
  const [joinInput, setJoinInput] = useState("");
  const [error, setError] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  const getWsUrl = () => {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/api/ws`;
  };

  const connect = useCallback(() => {
    if (wsRef.current) wsRef.current.close();
    setStatus("connecting");
    setError("");
    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {};
    ws.onmessage = (e) => {
      try {
        const msg: MPMessage = JSON.parse(e.data);
        if (msg.type === "room_created") {
          setRoomCode(msg.roomCode as string);
          setPlayerId("1");
          setStatus("waiting");
        } else if (msg.type === "game_start") {
          setPlayerId(msg.playerId as "1" | "2");
          setRoomCode(msg.roomCode as string);
          setStatus("playing");
          onStart?.(msg.playerId as string, msg.roomCode as string);
        } else if (msg.type === "game_move") {
          onMove?.(msg.data);
        } else if (msg.type === "opponent_left") {
          setStatus("ended");
          onOpponentLeft?.();
        } else if (msg.type === "game_reset") {
          onGameReset?.();
        } else if (msg.type === "error") {
          setError(msg.message as string);
          setStatus("error");
        }
      } catch {}
    };
    ws.onclose = () => {
      setStatus(s => s === "playing" || s === "waiting" ? "ended" : s);
    };
    ws.onerror = () => {
      setError("接続エラーが発生しました");
      setStatus("error");
    };
  }, [onMove, onStart, onOpponentLeft, onGameReset]);

  const createRoom = useCallback(() => {
    connect();
    const tryCreate = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "create_room", gameId }));
      } else {
        setTimeout(tryCreate, 100);
      }
    };
    tryCreate();
  }, [connect, gameId]);

  const joinRoom = useCallback((code: string) => {
    connect();
    const tryJoin = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "join_room", roomCode: code.toUpperCase(), gameId }));
      } else {
        setTimeout(tryJoin, 100);
      }
    };
    tryJoin();
  }, [connect, gameId]);

  const sendMove = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "game_move", roomCode, data }));
    }
  }, [roomCode]);

  const sendReset = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "game_reset", roomCode }));
    }
  }, [roomCode]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setStatus("idle");
    setRoomCode("");
    setPlayerId(null);
    setError("");
  }, []);

  useEffect(() => () => { wsRef.current?.close(); }, []);

  return { status, roomCode, playerId, joinInput, setJoinInput, error, createRoom, joinRoom, sendMove, sendReset, disconnect };
}
