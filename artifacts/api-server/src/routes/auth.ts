import { Router } from "express";
import bcrypt from "bcrypt";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    username?: string;
  }
}

const router = Router();

router.post("/auth/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ message: "ユーザー名とパスワードが必要です" });
    return;
  }
  if (username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username)) {
    res.status(400).json({ message: "ユーザー名は英数字とアンダースコアで3〜20文字" });
    return;
  }
  if (password.length < 4) {
    res.status(400).json({ message: "パスワードは4文字以上" });
    return;
  }
  try {
    const existing = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ message: "このユーザー名は既に使われています" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(usersTable).values({ username, passwordHash }).returning({ id: usersTable.id, username: usersTable.username });
    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ user: { id: user.id, username: user.username } });
  } catch (err) {
    req.log.error({ err }, "register error");
    res.status(500).json({ message: "サーバーエラーが発生しました" });
  }
});

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ message: "ユーザー名とパスワードが必要です" });
    return;
  }
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
    if (!user) {
      res.status(401).json({ message: "ユーザー名またはパスワードが間違っています" });
      return;
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ message: "ユーザー名またはパスワードが間違っています" });
      return;
    }
    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ user: { id: user.id, username: user.username } });
  } catch (err) {
    req.log.error({ err }, "login error");
    res.status(500).json({ message: "サーバーエラーが発生しました" });
  }
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/auth/me", (req, res) => {
  if (req.session.userId) {
    res.json({ user: { id: req.session.userId, username: req.session.username } });
  } else {
    res.json({ user: null });
  }
});

export default router;
