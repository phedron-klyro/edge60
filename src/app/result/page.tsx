"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { WalletConnectButton, ENSNameDisplay } from "@/components";
import { useGame } from "@/context/GameContext";

export default function Result() {
  const router = useRouter();
  const { currentMatch, isWinner, playAgain, phase } = useGame();

  // If no match data, redirect to dashboard
  if (!currentMatch && phase !== "result") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center space-y-4">
          <p className="text-xl animate-pulse">Waiting for result...</p>
          <Link href="/dashboard" className="text-indigo-400 hover:underline">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const handlePlayAgain = () => {
    playAgain();
    router.push("/dashboard");
  };

  const isWin = isWinner === true;
  const isDraw =
    currentMatch?.winner === null && currentMatch?.status === "COMPLETED";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b-4 border-white p-6 flex items-center justify-between">
        <Link href="/dashboard">
          <h1 className="text-title hover:text-indigo-500 transition-colors">
            EDGE60
          </h1>
        </Link>
        <div className="flex items-center gap-6">
          <ENSNameDisplay className="text-lg" />
          <WalletConnectButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full text-center space-y-8">
          {/* Result Card */}
          <div
            className={`brutal-card p-12 ${
              isWin
                ? "border-green-500 shadow-[6px_6px_0_0_#22c55e]"
                : isDraw
                  ? "border-zinc-500 shadow-[6px_6px_0_0_#71717a]"
                  : "border-rose-500 shadow-[6px_6px_0_0_#f43f5e]"
            }`}
          >
            {/* Emoji */}
            <div className="text-8xl mb-6">
              {isWin ? "🏆" : isDraw ? "🤝" : "💀"}
            </div>

            {/* Result Text */}
            <h2
              className={`text-display ${
                isWin
                  ? "text-green-500"
                  : isDraw
                    ? "text-zinc-400"
                    : "text-rose-500"
              }`}
            >
              {isWin ? "YOU WIN!" : isDraw ? "IT'S A DRAW" : "YOU LOSE"}
            </h2>

            {/* Payout */}
            <div className="mt-8 space-y-2">
              <p className="text-sm uppercase tracking-widest text-zinc-400">
                {isWin ? "You Won" : isDraw ? "Stake Returned" : "You Lost"}
              </p>
              <p
                className={`text-headline ${
                  isWin
                    ? "text-green-500"
                    : isDraw
                      ? "text-zinc-400"
                      : "text-rose-500"
                }`}
              >
                {isWin
                  ? `+$${currentMatch?.stake ? currentMatch.stake * 2 : 0}`
                  : isDraw
                    ? `$${currentMatch?.stake}`
                    : `-$${currentMatch?.stake}`}
              </p>
            </div>

            {/* Match Details */}
            {currentMatch && (
              <div className="mt-8 pt-8 border-t-2 border-zinc-700">
                <div className="grid grid-cols-2 gap-6 text-left">
                  <div>
                    <p className="text-sm text-zinc-400">Asset</p>
                    <p className="text-title text-indigo-400">
                      {currentMatch.asset}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">Outcome</p>
                    <p
                      className={`text-title ${currentMatch.endPrice! > currentMatch.startPrice! ? "text-green-500" : "text-rose-500"}`}
                    >
                      {currentMatch.endPrice! > currentMatch.startPrice!
                        ? "▲ UP"
                        : "▼ DOWN"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">Start Price</p>
                    <p className="text-title text-mono">
                      ${currentMatch.startPrice?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">End Price</p>
                    <p className="text-title text-mono">
                      ${currentMatch.endPrice?.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handlePlayAgain}
              className="brutal-btn brutal-btn-primary"
            >
              ⚔️ Play Again
            </button>
            <Link href="/dashboard">
              <button className="brutal-btn">📊 Dashboard</button>
            </Link>
          </div>

          {/* Share */}
          {isWin && (
            <div className="brutal-card bg-zinc-800 border-indigo-500">
              <p className="text-title text-amber-400">
                🎉 Share Your Victory!
              </p>
              <p className="text-body text-zinc-400 mt-2">
                I just won ${currentMatch?.stake ? currentMatch.stake * 2 : 0}{" "}
                on Edge60! Think you can beat me?
              </p>
              <button className="brutal-btn mt-4 bg-indigo-600 border-white">
                Share on X
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
