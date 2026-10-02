import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import { logger } from "./lib/logger";

type Room = {
  code: string;
  gameId: string;
  players: { ws: WebSocket; id: "1" | "2" }[];
};

const rooms = new Map<string, Room>();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function send(ws: WebSocket, data: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(room: Room, data: object, excludeWs?: WebSocket) {
  for (const player of room.players) {
    if (player.ws !== excludeWs) send(player.ws, data);
  }
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws: WebSocket, _req: IncomingMessage) => {
    let currentRoom: Room | null = null;
    let myPlayerId: "1" | "2" | null = null;

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const { type } = msg;

        if (type === "create_room") {
          let code = generateCode();
          while (rooms.has(code)) code = generateCode();
          const room: Room = { code, gameId: msg.gameId, players: [{ ws, id: "1" }] };
          rooms.set(code, room);
          currentRoom = room;
          myPlayerId = "1";
          send(ws, { type: "room_created", roomCode: code, playerId: "1" });
          logger.info({ code, gameId: msg.gameId }, "room created");
        }

        else if (type === "join_room") {
          const room = rooms.get(msg.roomCode);
          if (!room) { send(ws, { type: "error", message: "ルームが見つかりません" }); return; }
          if (room.players.length >= 2) { send(ws, { type: "error", message: "ルームが満員です" }); return; }
          if (room.gameId !== msg.gameId) { send(ws, { type: "error", message: "ゲームが一致しません" }); return; }
          room.players.push({ ws, id: "2" });
          currentRoom = room;
          myPlayerId = "2";
          for (const p of room.players) {
            send(p.ws, { type: "game_start", roomCode: room.code, playerId: p.id });
          }
          logger.info({ code: msg.roomCode }, "room joined, game starting");
        }

        else if (type === "game_move") {
          if (!currentRoom) return;
          broadcast(currentRoom, { type: "game_move", data: msg.data }, ws);
        }

        else if (type === "game_reset") {
          if (!currentRoom) return;
          broadcast(currentRoom, { type: "game_reset" }, ws);
        }

      } catch (err) {
        logger.warn({ err }, "ws message parse error");
      }
    });

    ws.on("close", () => {
      if (currentRoom && myPlayerId) {
        broadcast(currentRoom, { type: "opponent_left" }, ws);
        currentRoom.players = currentRoom.players.filter(p => p.ws !== ws);
        if (currentRoom.players.length === 0) {
          rooms.delete(currentRoom.code);
          logger.info({ code: currentRoom.code }, "room deleted");
        }
      }
    });
  });

  logger.info("WebSocket server ready at /api/ws");
}
