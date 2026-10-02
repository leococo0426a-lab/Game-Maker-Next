# Game Launcher

60種類以上のブラウザゲームを収録したゲームポータル。ユーザー認証・フレンド機能・メッセージ機能・リアルタイムオンライン対戦に対応。

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — APIサーバー起動 (port 8080)
- `pnpm --filter @workspace/game-launcher run dev` — フロントエンド起動 (port 25173)
- `pnpm run typecheck` — 全パッケージの型チェック
- `pnpm run build` — 全パッケージのビルド
- `pnpm --filter @workspace/api-spec run codegen` — OpenAPIからReact QueryフックとZodスキーマを再生成
- `pnpm --filter @workspace/db run push` — DBスキーマ変更を反映（開発のみ）
- Required env: `DATABASE_URL` — Postgres接続文字列, `SESSION_SECRET` — セッション署名鍵

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, Wouter, Framer Motion
- API: Express 5 + express-session + bcrypt + WebSocket (ws)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (zod/v4), drizzle-zod
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/game-launcher/src/games/` — 個別ゲームのコンポーネント (60種類以上)
- `artifacts/game-launcher/src/pages/` — Launcher, Library, Messages, Auth, GamePage
- `artifacts/api-server/src/routes/` — auth, friends, messages, games, health
- `artifacts/api-server/src/ws.ts` — WebSocketサーバー (ルームコード方式マルチプレイヤー)
- `lib/db/src/schema/` — users, friends, messages, game_history, conversations
- `lib/api-spec/openapi.yaml` — API契約のシングルソースオブトゥルース

## Architecture decisions

- セッション管理はexpress-sessionベース（JWT不使用）
- WebSocket接続は `/api/ws` パスで、6桁のルームコードでマルチプレイヤーを管理
- 先生対策（パニックキー）機能: 特定キー押下で別URLにリダイレクト
- フロントのルーティングはWouter使用（React Routerより軽量）

## Product

- 60種類以上のゲーム（アクション・パズル・ボード・オンライン対戦）
- ユーザー登録・ログイン
- フレンド追加・削除・検索
- フレンドとのメッセージ
- ゲーム履歴・スコア記録
- グローバルリーダーボード
- オンライン対戦（チェス・バトルシップ・リバーシ・ポン・メモリーなど）

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- bcryptはnative moduleのためpnpm-workspace.yamlの`onlyBuiltDependencies`に登録済み
- WebSocketパスは artifact.toml の `paths` 配列に `/api/ws` を追加する必要がある（プロキシが明示的に列挙されたパスのみ転送するため）

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
