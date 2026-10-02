import { Router } from "express";
import { db } from "@workspace/db";
import { gameHistoryTable, usersTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.session.userId) { res.status(401).json({ message: "ログインが必要です" }); return; }
  next();
}

// Get game history for current user
router.get("/games/history", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  try {
    const rows = await db.select()
      .from(gameHistoryTable)
      .where(eq(gameHistoryTable.userId, userId))
      .orderBy(desc(gameHistoryTable.playedAt))
      .limit(100);
    res.json({ history: rows });
  } catch (err) {
    req.log.error({ err }, "get game history error");
    res.status(500).json({ message: "サーバーエラー" });
  }
});

// Record a game play
router.post("/games/history", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const { gameId, score } = req.body;
  if (!gameId) { res.status(400).json({ message: "gameIdが必要です" }); return; }
  try {
    const [row] = await db.insert(gameHistoryTable)
      .values({ userId, gameId, score: score ?? null })
      .returning();
    res.json({ entry: row });
  } catch (err) {
    req.log.error({ err }, "record game history error");
    res.status(500).json({ message: "サーバーエラー" });
  }
});

// Global leaderboard for a game
router.get("/games/leaderboard/:gameId", async (req, res) => {
  const { gameId } = req.params;
  try {
    const rows = await db
      .select({
        username: usersTable.username,
        score: sql<number>`MAX(${gameHistoryTable.score})`,
        rank: sql<number>`RANK() OVER (ORDER BY MAX(${gameHistoryTable.score}) DESC)`,
      })
      .from(gameHistoryTable)
      .innerJoin(usersTable, eq(gameHistoryTable.userId, usersTable.id))
      .where(eq(gameHistoryTable.gameId, gameId))
      .groupBy(usersTable.username)
      .orderBy(sql`MAX(${gameHistoryTable.score}) DESC`)
      .limit(20);
    res.json({ leaderboard: rows });
  } catch (err) {
    req.log.error({ err }, "get leaderboard error");
    res.status(500).json({ message: "サーバーエラー" });
  }
});

export default router;
