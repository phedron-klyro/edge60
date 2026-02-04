"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { WalletConnectButton, ENSNameDisplay } from "@/components";
import { useGame } from "@/context/GameContext";

export default function Result() {
  const router = useRouter();
  const {
    currentMatch,
    isWinner,
    playAgain,
    phase,
    isSettling,
    isSettled,
    settlement,
    settlementStatus,
  } = useGame();

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
            className={`brutal-card p-12 ${isWin
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
              className={`text-display ${isWin
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
                className={`text-headline ${isWin
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

            {/* Settlement Status */}
            <div className="mt-8 pt-8 border-t-2 border-zinc-700">
              <p className="text-sm uppercase tracking-widest text-zinc-400 mb-4">
                Arc Treasury Settlement
              </p>

              {/* Settlement Progress */}
              <div className="flex items-center justify-center gap-2 mb-4">
                {isSettling ? (
                  <>
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-indigo-400">
                      {settlementStatus === "pending" && "Preparing settlement..."}
                      {settlementStatus === "submitting" && "Submitting to Arc..."}
                      {settlementStatus === "confirming" && "Waiting for confirmation..."}
                    </span>
                  </>
                ) : isSettled ? (
                  <>
                    <span className="text-2xl">✓</span>
                    <span className="text-green-500 font-bold">Settled on Arc</span>
                  </>
                ) : settlementStatus === "failed" ? (
                  <>
                    <span className="text-2xl">✗</span>
                    <span className="text-rose-500">Settlement failed</span>
                  </>
                ) : (
                  <span className="text-zinc-500">Awaiting settlement...</span>
                )}
              </div>

              {/* Settlement Details */}
              {isSettled && settlement && (
                <div className="bg-zinc-800 rounded-lg p-4 text-left space-y-2">
                  {isWin && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Prize Pool</span>
                        <span className="text-white font-mono">${settlement.grossAmount} USDC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Platform Fee (2.5%)</span>
                        <span className="text-zinc-500 font-mono">-${settlement.rake} USDC</span>
                      </div>
                      <div className="flex justify-between border-t border-zinc-700 pt-2">
                        <span className="text-green-400 font-bold">Your Payout</span>
                        <span className="text-green-400 font-mono font-bold">${settlement.netPayout} USDC</span>
                      </div>
                    </>
                  )}

                  {settlement.txHash && (
                    <div className="pt-2 border-t border-zinc-700">
                      <a
                        href={settlement.explorerUrl || `https://testnet.explorer.arc.io/tx/${settlement.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        <span>View on Arc Explorer</span>
                        <span>↗</span>
                      </a>
                      <p className="text-xs text-zinc-500 font-mono mt-1 truncate">
                        {settlement.txHash}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
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
