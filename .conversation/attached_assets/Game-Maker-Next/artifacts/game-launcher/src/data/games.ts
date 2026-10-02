export type Game = {
  id: string;
  title: string;
  description: string;
  category: string;
  emoji: string;
  color: string;
  players: string;
  multiplayer?: boolean;
  comingSoon?: boolean;
};

export const CATEGORIES = [
  "All", "アクション", "パズル", "ストラテジー", "スポーツ", "アーケード", "スキル"
];

export const GAMES: Game[] = [
  // ── 遊べるゲーム ─────────────────────────────────────────
  { id: "snake", title: "Snake", description: "クラシックなスネークゲーム！りんごを食べてどんどん長くなろう", category: "アーケード", emoji: "🐍", color: "#22c55e", players: "2.1k" },
  { id: "2048", title: "2048", description: "タイルをスワイプして2048を目指す頭脳派パズル", category: "パズル", emoji: "🔢", color: "#f59e0b", players: "3.5k" },
  { id: "breakout", title: "Breakout", description: "108個のブロックを全部壊せ！9行×12列の大迫力ステージ", category: "アーケード", emoji: "🧱", color: "#ef4444", players: "1.8k" },
  { id: "memory", title: "Memory", description: "5秒でカードを暗記！AIまたは友達とオンライン対戦", category: "パズル", emoji: "🎴", color: "#a855f7", players: "2.9k", multiplayer: true },
  { id: "tictactoe", title: "三目並べ", description: "3難易度のAIに挑戦、または友達とオンライン対戦！", category: "ストラテジー", emoji: "❌", color: "#3b82f6", players: "4.2k", multiplayer: true },
  { id: "flappy", title: "Flappy Bird", description: "パイプをくぐって飛び続けろ！どこまで行けるか", category: "アクション", emoji: "🐦", color: "#06b6d4", players: "5.1k" },
  { id: "pong", title: "Pong", description: "伝説の卓球ゲーム！強化AIと1対1、または友達とオンライン対戦", category: "スポーツ", emoji: "🏓", color: "#10b981", players: "1.5k", multiplayer: true },
  { id: "whackamole", title: "もぐら叩き", description: "30秒以内に何匹叩けるか！加速するもぐらに挑戦", category: "アクション", emoji: "🐹", color: "#f97316", players: "2.3k" },
  { id: "typing", title: "タイピングテスト", description: "60秒でWPMを測定！英単語の速打ちに挑戦", category: "スキル", emoji: "⌨️", color: "#6366f1", players: "1.2k" },
  { id: "minesweeper", title: "マインスイーパー", description: "3難易度の地雷探し！右クリックで旗を立てよう", category: "パズル", emoji: "💣", color: "#64748b", players: "1.7k" },
  { id: "tetris", title: "テトリス", description: "ブロックを積み上げてラインを消せ！レベルアップで加速", category: "パズル", emoji: "🟦", color: "#06b6d4", players: "6.2k" },
  { id: "connect4", title: "Connect Four", description: "縦・横・斜めに4つ並べたら勝ち！強いAIまたはオンライン対戦", category: "ストラテジー", emoji: "🔴", color: "#dc2626", players: "1.6k", multiplayer: true },
  { id: "reversi", title: "リバーシ", description: "相手の石を挟んでひっくり返せ！AIまたはオンラインで対決", category: "ストラテジー", emoji: "⚫", color: "#2563eb", players: "1.0k", multiplayer: true },
  { id: "sudoku", title: "数独", description: "数字のパズルを論理的に解け！難易度3段階", category: "パズル", emoji: "🔢", color: "#0369a1", players: "2.7k" },
  { id: "asteroids", title: "アステロイド", description: "宇宙船を操って小惑星を撃破！レトロシューター", category: "アクション", emoji: "🚀", color: "#7c3aed", players: "1.1k" },
  { id: "simon", title: "サイモン", description: "光るボタンのパターンを覚えて繰り返せ！何番まで記憶できる？", category: "スキル", emoji: "🎯", color: "#16a34a", players: "920" },
  { id: "blackjack", title: "ブラックジャック", description: "21に近い方が勝ち！ディーラーに勝てるか挑戦", category: "スキル", emoji: "🃏", color: "#1e293b", players: "2.6k" },
  { id: "puzzle15", title: "15パズル", description: "スライドパズルを最短手数で完成させよう", category: "パズル", emoji: "🧩", color: "#0ea5e9", players: "740" },
  { id: "clicker", title: "クッキークリッカー", description: "クリックしまくってクッキーを量産！建物を買って自動化しよう", category: "アーケード", emoji: "🍪", color: "#d97706", players: "2.8k" },
  { id: "rps", title: "じゃんけん", description: "AIと5戦勝負！心理戦でグー・チョキ・パーに勝て", category: "スキル", emoji: "✊", color: "#9333ea", players: "980" },
  { id: "maze", title: "迷路", description: "ランダム生成の迷路をタイムアタックで攻略！矢印キーで移動", category: "パズル", emoji: "🌀", color: "#0891b2", players: "1.4k" },
  { id: "quiz", title: "クイズ", description: "様々なジャンルの問題に挑戦！10問タイムアタック", category: "スキル", emoji: "❓", color: "#7c3aed", players: "3.1k" },
  { id: "runner", title: "エンドレスランナー", description: "障害物を避けながらどこまで走れるか！2段ジャンプで回避", category: "アクション", emoji: "🏃‍♂️", color: "#f97316", players: "2.4k" },
  { id: "chess", title: "チェス", description: "世界最古のボードゲーム！AIに挑戦または友達とオンライン対戦", category: "ストラテジー", emoji: "♟️", color: "#1e293b", players: "3.4k", multiplayer: true },
  { id: "battleship", title: "海戦ゲーム", description: "敵の船を全部沈めろ！AIまたはオンラインで戦略対決", category: "ストラテジー", emoji: "🚢", color: "#1d4ed8", players: "1.2k", multiplayer: true },
  { id: "darts", title: "ダーツ", description: "301からゼロにしよう！ダーツボードをクリックして正確に狙え", category: "スポーツ", emoji: "🎯", color: "#b91c1c", players: "1.0k" },
  { id: "sokoban", title: "倉庫番", description: "箱を正しい位置に押し込め！4つのレベルが待ち受ける", category: "パズル", emoji: "📦", color: "#b45309", players: "890" },
  { id: "bubble", title: "バブルシューター", description: "同じ色のバブルを3つ以上つなげて消せ！マウスで狙い打ち", category: "パズル", emoji: "🫧", color: "#38bdf8", players: "2.1k" },
  { id: "solit", title: "ソリティア", description: "トランプをスーツ順に積み上げよう！1人用カードゲーム", category: "パズル", emoji: "🃏", color: "#15803d", players: "2.3k" },
  { id: "painting", title: "お絵かき", description: "自由に絵を描こう！ブラシサイズと色を選んで", category: "スキル", emoji: "🎨", color: "#ec4899", players: "560" },
  { id: "platformer", title: "プラットフォーマー", description: "障害物を飛び越えてゴールを目指す横スクロールアクション", category: "アクション", emoji: "🕹️", color: "#059669", players: "2.0k" },
  { id: "bomberman", title: "ボンバーマン", description: "爆弾を仕掛けて敵を倒せ！マルチプレイ爆発バトル", category: "アクション", emoji: "💥", color: "#dc2626", players: "1.3k", multiplayer: true },
  { id: "go", title: "囲碁", description: "石を置いて陣地を広げよう！古代の戦略ゲーム", category: "ストラテジー", emoji: "⚫", color: "#292524", players: "850" },
  { id: "archery", title: "アーチェリー", description: "風を読んで的の中心を射抜け！精密射撃ゲーム", category: "スポーツ", emoji: "🏹", color: "#92400e", players: "780" },
  { id: "towerdefense", title: "タワーディフェンス", description: "タワーを配置して押し寄せる敵を食い止めろ！", category: "ストラテジー", emoji: "🏰", color: "#854d0e", players: "2.1k" },
  { id: "fishing", title: "釣りゲーム", description: "竿を投げてタイミングよく引け！レアな魚を釣ろう", category: "スキル", emoji: "🎣", color: "#0369a1", players: "1.4k" },
  { id: "racing", title: "レーシング", description: "コースを疾走してタイムアタック！カートレーシング", category: "スポーツ", emoji: "🏎️", color: "#dc2626", players: "2.5k" },
  { id: "bowling", title: "ボウリング", description: "ストライクを狙え！角度と力を調整して10本全部倒そう", category: "スポーツ", emoji: "🎳", color: "#7c3aed", players: "1.7k" },
  { id: "mahjong", title: "麻雀ソリティア", description: "同じ牌を2枚選んで消していく！積み上げ麻雀パズル", category: "パズル", emoji: "🀄", color: "#dc2626", players: "1.9k" },
  { id: "pinball", title: "ピンボール", description: "フリッパーでボールを打ち返してハイスコアを狙え", category: "アーケード", emoji: "🎱", color: "#7c3aed", players: "1.6k" },
  { id: "wordle2", title: "カタカナWordle", description: "カタカナ版Wordle！日本語単語で6回以内に当てよう", category: "パズル", emoji: "🇯🇵", color: "#dc2626", players: "2.1k" },
  { id: "minigolf", title: "ミニゴルフ", description: "物理エンジンを使ったミニゴルフ！18ホールに挑戦", category: "スポーツ", emoji: "⛳", color: "#16a34a", players: "1.3k" },
  { id: "dodge", title: "ドッジゲーム", description: "押し寄せる敵の弾をかわしてサバイバル！反射神経勝負", category: "アクション", emoji: "💫", color: "#8b5cf6", players: "2.6k" },
  { id: "towers", title: "ハノイの塔", description: "3本の棒と円盤を使った古典パズル！最小手数で完成させよ", category: "パズル", emoji: "🗼", color: "#d97706", players: "760" },
  { id: "space", title: "スペースインベーダー", description: "宇宙人の波に立ち向かえ！クラシックアーケードシューター", category: "アクション", emoji: "👾", color: "#4ade80", players: "3.3k" },
  { id: "crossword", title: "クロスワード", description: "日本語と英語のクロスワードパズル！ヒントを元に全部埋めよう", category: "パズル", emoji: "📰", color: "#374151", players: "1.8k" },
  { id: "wordchain", title: "しりとり", description: "AIとしりとり勝負！日本語の語彙力が試される", category: "スキル", emoji: "💬", color: "#f59e0b", players: "3.0k" },
  { id: "reflex", title: "反射神経テスト", description: "指定された色を素早くタップ！30秒でコンボ加点目指せ！", category: "スキル", emoji: "⚡", color: "#f59e0b", players: "1.5k" },
  { id: "balloonpop", title: "風船割り", description: "風船をクリックで割ろう！10個逃したら終了。彩色風船は高得点！", category: "アクション", emoji: "🎈", color: "#ec4899", players: "2.2k" },
  { id: "needlethread", title: "まち針", description: "回転する輪の隙間に糸を通せ！難易度が上がるほどスリル溢れる", category: "スキル", emoji: "🪡", color: "#14b8a6", players: "1.8k" },
  { id: "typingbomb", title: "タイピング爆弾", description: "文字をタイプして爆弾を友達に送れ！タイマー切れで爆発💥 パスするたびに時間が減る！", category: "スキル", emoji: "💣", color: "#dc2626", players: "0", multiplayer: true },

  // ── 近日公開 ──────────────────────────────────────────────
  { id: "pokemon", title: "モンスターバトル", description: "モンスターを育てて対決！ターン制RPGバトル", category: "ストラテジー", emoji: "⚡", color: "#facc15", players: "4.7k", comingSoon: true },
  { id: "galaxian", title: "ギャラクシアン", description: "押し寄せる敵を撃ち落とせ！宇宙インベーダー系", category: "アクション", emoji: "👾", color: "#7c3aed", players: "1.4k", comingSoon: true },
  { id: "tangram", title: "タングラム", description: "7つのピースで形を完成させる古典パズル", category: "パズル", emoji: "△", color: "#f59e0b", players: "670", comingSoon: true },
  { id: "billiards", title: "ビリヤード", description: "狙い定めてボールを落とせ！物理エンジン搭載", category: "スポーツ", emoji: "🎱", color: "#15803d", players: "1.3k", comingSoon: true },
  { id: "pictionary", title: "お絵かきクイズ", description: "お題を見て絵を描き、自分で回答を当てよう！スピードお絵描きクイズ", category: "スキル", emoji: "🖌️", color: "#f97316", players: "2.2k" },
  { id: "breakout2", title: "スーパーブレイクアウト", description: "パワーアップ付きのブレイクアウト！マルチボールで大量破壊", category: "アーケード", emoji: "💥", color: "#f97316", players: "1.4k", comingSoon: true },
  { id: "poker", title: "テキサスホールデム", description: "5枚のカードで最強の手を作れ！AIとのポーカー対決", category: "スキル", emoji: "♠️", color: "#1e293b", players: "2.0k", comingSoon: true },
  { id: "chess3", title: "チェス960", description: "フィッシャーランダムチェス！毎回違う配置でスタート", category: "ストラテジー", emoji: "♚", color: "#374151", players: "890", comingSoon: true },
  { id: "pong2", title: "3D Pong", description: "立体的なPong！Z軸移動で奥行きを使った対戦", category: "スポーツ", emoji: "🏓", color: "#10b981", players: "1.1k", comingSoon: true, multiplayer: true },
  { id: "infinite", title: "インフィニティクリッカー", description: "宇宙を征服するハイパーインフレ放置ゲーム", category: "アーケード", emoji: "∞", color: "#6366f1", players: "3.2k", comingSoon: true },
  { id: "trivia2", title: "アニメクイズ", description: "アニメ・マンガのトリビアに挑戦！ハードモードあり", category: "スキル", emoji: "🎌", color: "#f43f5e", players: "4.1k", comingSoon: true },
  { id: "breakdance", title: "リズムバトル", description: "音楽に合わせてボタンを押してダンスバトル！オンライン対戦", category: "スキル", emoji: "💃", color: "#ec4899", players: "1.9k", comingSoon: true, multiplayer: true },
  { id: "marble", title: "マーブルレース", description: "ビー玉レース！物理エンジンで予測不能なバトル", category: "アーケード", emoji: "🔮", color: "#a855f7", players: "2.0k", comingSoon: true },
  { id: "hex", title: "ヘックス戦略", description: "六角形のボードで陣地を繋げ！シンプルだが奥深いボードゲーム", category: "ストラテジー", emoji: "⬡", color: "#0891b2", players: "680", comingSoon: true },
  { id: "typing2", title: "コードタイピング", description: "プログラムコードをタイピング！エンジニア向け高速入力", category: "スキル", emoji: "💻", color: "#1e293b", players: "2.4k", comingSoon: true },
  { id: "mole2", title: "もぐら叩き2P", description: "もぐら叩きを友達と同時プレイ！どちらが多く叩けるか対決", category: "アクション", emoji: "🐹", color: "#f97316", players: "1.2k", comingSoon: true, multiplayer: true },
];
