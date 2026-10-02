import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const gameHistoryTable = pgTable("game_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  gameId: text("game_id").notNull(),
  score: integer("score"),
  playedAt: timestamp("played_at").notNull().defaultNow(),
});

export type GameHistory = typeof gameHistoryTable.$inferSelect;
