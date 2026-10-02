import { Router } from "express";
import { db } from "@workspace/db";
import { friendsTable, usersTable } from "@workspace/db/schema";
import { eq, and, or, sql } from "drizzle-orm";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.session.userId) { res.status(401).json({ message: "ログインが必要です" }); return; }
  next();
}

// Get all friends
router.get("/friends", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  try {
    const rows = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        createdAt: friendsTable.createdAt,
      })
      .from(friendsTable)
      .innerJoin(usersTable, eq(friendsTable.friendId, usersTable.id))
      .where(eq(friendsTable.userId, userId));
    res.json({ friends: rows });
  } catch (err) {
    req.log.error({ err }, "get friends error");
    res.status(500).json({ message: "サーバーエラー" });
  }
});

// Add friend by username
router.post("/friends", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const { username } = req.body;
  if (!username) { res.status(400).json({ message: "ユーザー名を入力してください" }); return; }
  try {
    const [target] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
    if (!target) { res.status(404).json({ message: "ユーザーが見つかりません" }); return; }
    if (target.id === userId) { res.status(400).json({ message: "自分自身をフレンドに追加できません" }); return; }

    const existing = await db.select().from(friendsTable)
      .where(and(eq(friendsTable.userId, userId), eq(friendsTable.friendId, target.id)))
      .limit(1);
    if (existing.length > 0) { res.status(400).json({ message: "すでにフレンドです" }); return; }

    await db.insert(friendsTable).values([
      { userId, friendId: target.id },
      { userId: target.id, friendId: userId },
    ]);
    res.json({ friend: { id: target.id, username: target.username } });
  } catch (err) {
    req.log.error({ err }, "add friend error");
    res.status(500).json({ message: "サーバーエラー" });
  }
});

// Remove friend
router.delete("/friends/:id", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const friendId = parseInt(req.params.id);
  try {
    await db.delete(friendsTable).where(
      or(
        and(eq(friendsTable.userId, userId), eq(friendsTable.friendId, friendId)),
        and(eq(friendsTable.userId, friendId), eq(friendsTable.friendId, userId)),
      )
    );
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "remove friend error");
    res.status(500).json({ message: "サーバーエラー" });
  }
});

// Search users
router.get("/users/search", requireAuth, async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== "string" || q.length < 2) {
    res.status(400).json({ message: "2文字以上で検索してください" }); return;
  }
  try {
    const rows = await db
      .select({ id: usersTable.id, username: usersTable.username })
      .from(usersTable)
      .where(sql`${usersTable.username} ILIKE ${'%' + q + '%'}`)
      .limit(20);
    res.json({ users: rows });
  } catch (err) {
    req.log.error({ err }, "search users error");
    res.status(500).json({ message: "サーバーエラー" });
  }
});

export default router;
