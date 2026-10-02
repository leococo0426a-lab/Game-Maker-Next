import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Send } from "lucide-react";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import { useGameHistory } from "@/context/GameHistoryContext";
import InviteModal from "@/components/InviteModal";

type Color = "w" | "b";
type PieceType = "K" | "Q" | "R" | "B" | "N" | "P";
type Piece = { type: PieceType; color: Color } | null;
type Board = Piece[][];
type Pos = [number, number];

const UNICODE: Record<Color, Record<PieceType, string>> = {
  w: { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙" },
  b: { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" },
};

function initBoard(): Board {
  const b: Board = Array(8).fill(null).map(() => Array(8).fill(null));
  const order: PieceType[] = ["R","N","B","Q","K","B","N","R"];
  order.forEach((t, c) => { b[0][c] = { type: t, color: "b" }; b[7][c] = { type: t, color: "w" }; });
  for (let c = 0; c < 8; c++) { b[1][c] = { type: "P", color: "b" }; b[6][c] = { type: "P", color: "w" }; }
  return b;
}

function inBounds(r: number, c: number) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

function getRawMoves(board: Board, r: number, c: number): Pos[] {
  const piece = board[r][c]; if (!piece) return [];
  const moves: Pos[] = [];
  const { type, color } = piece;
  const opp = color === "w" ? "b" : "w";
  const add = (nr: number, nc: number) => {
    if (!inBounds(nr, nc)) return false;
    if (board[nr][nc]?.color === color) return false;
    moves.push([nr, nc]);
    return !board[nr][nc];
  };
  const slide = (dr: number, dc: number) => { let nr=r+dr, nc=c+dc; while (add(nr, nc) && !board[nr][nc]) { nr+=dr; nc+=dc; } };
  if (type === "R") { [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr,dc]) => slide(dr,dc)); }
  else if (type === "B") { [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc]) => slide(dr,dc)); }
  else if (type === "Q") { [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc]) => slide(dr,dc)); }
  else if (type === "N") { [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc]) => add(r+dr,c+dc)); }
  else if (type === "K") { [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc]) => add(r+dr,c+dc)); }
  else if (type === "P") {
    const dir = color === "w" ? -1 : 1;
    const startRow = color === "w" ? 6 : 1;
    if (inBounds(r+dir, c) && !board[r+dir][c]) { moves.push([r+dir, c]); if (r===startRow && !board[r+2*dir]?.[c]) moves.push([r+2*dir, c]); }
    for (const dc of [-1,1]) { if (inBounds(r+dir, c+dc) && board[r+dir][c+dc]?.color === opp) moves.push([r+dir, c+dc]); }
  }
  return moves;
}

function isInCheck(board: Board, color: Color): boolean {
  let kr = -1, kc = -1;
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) if (board[r][c]?.type==="K"&&board[r][c]?.color===color) { kr=r; kc=c; }
  if (kr<0) return false;
  const opp = color === "w" ? "b" : "w";
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) if (board[r][c]?.color===opp) { if (getRawMoves(board,r,c).some(([mr,mc])=>mr===kr&&mc===kc)) return true; }
  return false;
}

function moveBoard(board: Board, from: Pos, to: Pos): Board {
  const nb = board.map(r => [...r]);
  const piece = nb[from[0]][from[1]];
  nb[to[0]][to[1]] = piece;
  nb[from[0]][from[1]] = null;
  if (piece?.type === "P" && (to[0] === 0 || to[0] === 7)) nb[to[0]][to[1]] = { type: "Q", color: piece.color };
  return nb;
}

function getLegalMoves(board: Board, r: number, c: number): Pos[] {
  const piece = board[r][c]; if (!piece) return [];
  return getRawMoves(board, r, c).filter(([nr, nc]) => {
    const nb = moveBoard(board, [r,c], [nr,nc]);
    return !isInCheck(nb, piece.color);
  });
}

function hasAnyMoves(board: Board, color: Color): boolean {
  for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
    if (board[r][c]?.color === color && getLegalMoves(board, r, c).length > 0) return true;
  }
  return false;
}

export default function OnlineChess() {
  const [board, setBoard] = useState<Board>(initBoard);
  const [selected, setSelected] = useState<Pos | null>(null);
  const [legalMoves, setLegalMoves] = useState<Pos[]>([]);
  const [myColor, setMyColor] = useState<Color | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [status, setStatus] = useState("接待中...");
  const [winner, setWinner] = useState<Color | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const { addPlay } = useGameHistory();

  const handleMove = useCallback((data: unknown) => {
    const { from, to } = data as { from: Pos; to: Pos };
    setBoard(prev => {
      const nb = moveBoard(prev, from, to);
      const myC = myColor;
      if (!myC) return nb;
      const myMoves = hasAnyMoves(nb, myC);
      if (!myMoves) {
        const inChk = isInCheck(nb, myC);
        setGameOver(true);
        if (inChk) {
          setWinner(myC === "w" ? "b" : "w");
          setStatus(myC === "w" ? "チェックメイト！あなたの負け..." : "チェックメイト！あなたの勝ち！");
        } else {
          setStatus("ステールメイト・引き分け");
        }
        addPlay("chess");
      } else {
        const oppCheck = isInCheck(nb, myC);
        setStatus(oppCheck ? "チェック！あなたのターン" : "あなたのターン");
      }
      return nb;
    });
    setSelected(null);
    setLegalMoves([]);
    setIsMyTurn(true);
  }, [myColor, addPlay]);

  const handleStart = useCallback((pid: string) => {
    const color: Color = pid === "1" ? "w" : "b";
    setMyColor(color);
    setIsMyTurn(pid === "1");
    setBoard(initBoard());
    setSelected(null);
    setLegalMoves([]);
    setGameOver(false);
    setWinner(null);
    setStatus(pid === "1" ? "あなたのターン（先手・白）" : "相手のターン...（後手・黒）");
  }, []);

  const handleOpponentLeft = useCallback(() => {
    setStatus("相手が切断しました");
    setGameOver(true);
  }, []);

  const handleGameReset = useCallback(() => {
    setBoard(initBoard());
    setSelected(null);
    setLegalMoves([]);
    setGameOver(false);
    setWinner(null);
    const pid = myColor === "w" ? "1" : "2";
    setIsMyTurn(pid === "1");
    setStatus(pid === "1" ? "あなたのターン（先手・白）" : "相手のターン...（後手・黒）");
  }, [myColor]);

  const { status: mpStatus, roomCode, joinInput, setJoinInput, error, createRoom, joinRoom, sendMove, sendReset, disconnect } = useMultiplayer({
    gameId: "chess",
    onMove: handleMove,
    onStart: handleStart,
    onOpponentLeft: handleOpponentLeft,
    onGameReset: handleGameReset,
  });

  const handleClick = useCallback((r: number, c: number) => {
    if (!isMyTurn || gameOver || !myColor) return;
    const piece = board[r][c];
    if (selected) {
      const move = legalMoves.find(([mr, mc]) => mr === r && mc === c);
      if (move) {
        const nb = moveBoard(board, selected, [r, c]);
        setBoard(nb);
        setSelected(null); setLegalMoves([]);
        sendMove({ from: selected, to: [r, c] });

        const opp = myColor === "w" ? "b" : "w";
        const oppMoves = hasAnyMoves(nb, opp);
        if (!oppMoves) {
          const inChk = isInCheck(nb, opp);
          setGameOver(true);
          if (inChk) {
            setWinner(myColor);
            setStatus("チェックメイト！あなたの勝ち！");
          } else {
            setStatus("ステールメイト・引き分け");
          }
          addPlay("chess");
          setIsMyTurn(false);
          return;
        }

        setIsMyTurn(false);
        setStatus(isInCheck(nb, opp) ? "チェック！相手のターン..." : "相手のターン...");
        return;
      }
      if (piece?.color === myColor) { setSelected([r,c]); setLegalMoves(getLegalMoves(board, r, c)); return; }
      setSelected(null); setLegalMoves([]);
    } else {
      if (piece?.color !== myColor) return;
      setSelected([r,c]); setLegalMoves(getLegalMoves(board, r, c));
    }
  }, [board, selected, legalMoves, isMyTurn, gameOver, myColor, sendMove, addPlay]);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (mpStatus === "idle" || mpStatus === "error") {
    return (
      <div className="flex flex-col items-center space-y-6 max-w-sm mx-auto p-4">
        <div className="text-center">
          <h2 className="text-2xl font-black text-foreground">オンラインチェス</h2>
          <p className="text-sm text-muted-foreground mt-1">友達と遠隔対戦！先手は白（Player1）</p>
        </div>
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-sm text-destructive font-bold w-full text-center">{error}</div>
        )}
        <Button onClick={createRoom} className="w-full rounded-full py-5 text-base font-bold">ルームを作成（先手・白）</Button>
        <div className="text-muted-foreground text-sm font-bold">または</div>
        <div className="flex gap-2 w-full">
          <Input value={joinInput} onChange={e => setJoinInput(e.target.value.toUpperCase())}
            placeholder="ルームコードを入力" maxLength={6} className="rounded-xl font-mono text-center text-lg font-bold" />
          <Button onClick={() => joinRoom(joinInput)} disabled={joinInput.length < 4} className="rounded-xl px-4">参加（後手・黒）</Button>
        </div>
      </div>
    );
  }

  if (mpStatus === "connecting") {
    return <div className="text-center py-10 text-muted-foreground font-bold animate-pulse">接待中...</div>;
  }

  if (mpStatus === "waiting") {
    return (
      <div className="flex flex-col items-center space-y-5 max-w-sm mx-auto p-4 text-center">
        <div className="text-5xl animate-bounce">⏳</div>
        <h3 className="text-xl font-black text-foreground">友達を待っています...</h3>
        <p className="text-sm text-muted-foreground">このコードを友達に教えてください</p>
        <div className="flex items-center gap-2 bg-primary/10 border-2 border-primary/30 rounded-xl px-6 py-4">
          <span className="text-3xl font-black font-mono tracking-widest text-primary">{roomCode}</span>
          <button onClick={copyCode} className="ml-2 text-primary hover:text-primary/70 transition-colors">
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
        <Button variant="outline" onClick={() => setInviteOpen(true)} className="rounded-full flex items-center gap-2">
          <Send className="w-4 h-4" />友達を招待
        </Button>
        <Button variant="outline" onClick={disconnect} className="rounded-full">キャンセル</Button>
        {inviteOpen && <InviteModal roomCode={roomCode} gameName="オンラインチェス" onClose={() => setInviteOpen(false)} />}
      </div>
    );
  }

  if (mpStatus === "ended") {
    return (
      <div className="flex flex-col items-center space-y-4 max-w-sm mx-auto p-4 text-center">
        <div className="text-5xl">😢</div>
        <h3 className="text-xl font-black text-foreground">相手が切断しました</h3>
        <Button onClick={disconnect} className="rounded-full px-8">戻る</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4 max-w-sm mx-auto p-4">
      <div className="text-center">
        <h2 className="text-xl font-black text-foreground">オンラインチェス</h2>
        <p className="text-sm text-muted-foreground">あなた: <span className="font-black">{myColor === "w" ? "白（先手）" : "黒（後手）"}</span></p>
      </div>

      <p className={`font-black text-base ${winner ? (winner === myColor ? "text-green-600" : "text-red-600") : status.includes("チェック") ? "text-orange-600" : "text-foreground"}`}>
        {status}
      </p>

      <div className="border-2 border-border rounded-xl overflow-hidden shadow-xl">
        {board.map((row, r) => (
          <div key={r} className="flex">
            {row.map((piece, c) => {
              const light = (r + c) % 2 === 0;
              const isSel = selected && selected[0] === r && selected[1] === c;
              const isLegal = legalMoves.some(([mr,mc]) => mr===r&&mc===c);
              return (
                <button key={c} onClick={() => handleClick(r, c)}
                  className={`w-11 h-11 flex items-center justify-center text-2xl transition-colors relative
                    ${light ? "bg-amber-100" : "bg-amber-700"}
                    ${isSel ? "ring-2 ring-blue-500 ring-inset" : ""}
                    ${isLegal && board[r][c] ? "ring-2 ring-red-400 ring-inset" : ""}
                    ${!isMyTurn || gameOver ? "cursor-default" : "cursor-pointer"}`}
                  disabled={!isMyTurn || gameOver}>
                  {isLegal && !board[r][c] && <div className="w-4 h-4 rounded-full bg-black/20" />}
                  {piece && <span className={`select-none leading-none ${piece.color === "w" ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" : "text-gray-900"}`}>{UNICODE[piece.color][piece.type]}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex gap-3 items-center">
        {gameOver && <Button onClick={() => { sendReset(); handleGameReset(); }} className="rounded-full px-8">もう一度</Button>}
        <Button variant="outline" size="sm" onClick={disconnect} className="rounded-full">終了</Button>
      </div>
      <p className="text-xs text-muted-foreground">自分の色のコマをクリックして選択し、移動先をクリック。</p>
    </div>
  );
}
