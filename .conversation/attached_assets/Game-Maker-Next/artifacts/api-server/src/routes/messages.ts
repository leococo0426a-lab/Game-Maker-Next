import { Router } from "express";
import { db } from "@workspace/db";
import { messagesTable, usersTable } from "@workspace/db/schema";
import { eq, or, and, desc, sql } from "drizzle-orm";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.session.userId) { res.status(401).json({ message: "ログインが必要です" }); return; }
  next();
}

router.get("/messages/conversations", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  try {
    const rows = await db
      .select({
        id: messagesTable.id,
        fromUserId: messagesTable.fromUserId,
        toUserId: messagesTable.toUserId,
        content: messagesTable.content,
        createdAt: messagesTable.createdAt,
        fromUsername: sql<string>`(SELECT username FROM users WHERE id = ${messagesTable.fromUserId})`,
        toUsername: sql<string>`(SELECT username FROM users WHERE id = ${messagesTable.toUserId})`,
      })
      .from(messagesTable)
      .where(or(eq(messagesTable.fromUserId, userId), eq(messagesTable.toUserId, userId)))
      .orderBy(desc(messagesTable.createdAt));

    const conversations: Record<number, { userId: number; username: string; lastMessage: string; createdAt: Date }> = {};
    for (const row of rows) {
      const otherId = row.fromUserId === userId ? row.toUserId : row.fromUserId;
      const otherUsername = row.fromUserId === userId ? row.toUsername : row.fromUsername;
      if (!conversations[otherId]) {
        conversations[otherId] = { userId: otherId, username: otherUsername, lastMessage: row.content, createdAt: row.createdAt };
      }
    }
    res.json({ conversations: Object.values(conversations) });
  } catch (err) {
    req.log.error({ err }, "get conversations error");
    res.status(500).json({ message: "サーバーエラー" });
  }
});

router.get("/messages/:username", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const { username } = req.params;
  try {
    const [target] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
    if (!target) { res.status(404).json({ message: "ユーザーが見つかりません" }); return; }
    const msgs = await db.select().from(messagesTable)
      .where(or(
        and(eq(messagesTable.fromUserId, userId), eq(messagesTable.toUserId, target.id)),
        and(eq(messagesTable.fromUserId, target.id), eq(messagesTable.toUserId, userId)),
      ))
      .orderBy(messagesTable.createdAt);
    res.json({ messages: msgs, targetUser: { id: target.id, username: target.username } });
  } catch (err) {
    req.log.error({ err }, "get messages error");
    res.status(500).json({ message: "サーバーエラー" });
  }
});

router.post("/messages/:username", requireAuth, async (req, res) => {
  const userId = req.session.userId!;
  const { username } = req.params;
  const { content } = req.body;
  if (!content || content.trim().length === 0) { res.status(400).json({ message: "メッセージを入力してください" }); return; }
  if (content.length > 500) { res.status(400).json({ message: "500文字以内で入力してください" }); return; }
  try {
    const [target] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
    if (!target) { res.status(404).json({ message: "ユーザーが見つかりません" }); return; }
    if (target.id === userId) { res.status(400).json({ message: "自分自身にはメッセージできません" }); return; }
    const [msg] = await db.insert(messagesTable).values({ fromUserId: userId, toUserId: target.id, content: content.trim() }).returning();
    res.json({ message: msg });
  } catch (err) {
    req.log.error({ err }, "send message error");
    res.status(500).json({ message: "サーバーエラー" });
  }
});

export default router;
