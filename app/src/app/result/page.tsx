"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { WalletConnectButton, ENSNameDisplay } from "@/components";
import { useGame } from "@/context/GameContext";

// Prediction Game Results Component
function PredictionResults({ 
  currentMatch, 
  playerId, 
  isDraw 
}: { 
  currentMatch: any; 
  playerId: string | null;
  isDraw: boolean;
}) {
  const isPlayerA = currentMatch.playerA === playerId;
  const myPrediction = isPlayerA ? currentMatch.predictionA : currentMatch.predictionB;
  const opponentPrediction = isPlayerA ? currentMatch.predictionB : currentMatch.predictionA;
  
  // Determine the correct answer based on price movement
  const priceWentUp = currentMatch.endPrice > currentMatch.startPrice;
  const priceUnchanged = currentMatch.endPrice === currentMatch.startPrice;
  const correctAnswer = priceUnchanged ? null : (priceWentUp ? "UP" : "DOWN");
  
  // Check if predictions were correct
  const myPredictionCorrect = correctAnswer && myPrediction === correctAnswer;
  const opponentPredictionCorrect = correctAnswer && opponentPrediction === correctAnswer;
  
  // Determine draw reason
  const bothCorrect = myPredictionCorrect && opponentPredictionCorrect;
  const bothWrong = !myPredictionCorrect && !opponentPredictionCorrect && myPrediction && opponentPrediction;
  
  return (
    <>
      <div className="mt-8 grid grid-cols-2 gap-6 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
            Your Prediction
          </p>
          <p
            className={`text-headline ${
              myPrediction === "UP" ? "text-green-500" : "text-rose-500"
            }`}
          >
            {myPrediction === "UP" ? "▲ UP" : "▼ DOWN"}
          </p>
          {correctAnswer && (
            <p className={`text-xs mt-1 ${myPredictionCorrect ? "text-green-400" : "text-rose-400"}`}>
              {myPredictionCorrect ? "✓ Correct" : "✗ Wrong"}
            </p>
          )}
        </div>
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
            Opponent Prediction
          </p>
          <p
            className={`text-headline ${
              opponentPrediction === "UP" ? "text-green-500" : "text-rose-500"
            }`}
          >
            {opponentPrediction
              ? opponentPrediction === "UP"
                ? "▲ UP"
                : "▼ DOWN"
              : "No Prediction"}
          </p>
          {correctAnswer && opponentPrediction && (
            <p className={`text-xs mt-1 ${opponentPredictionCorrect ? "text-green-400" : "text-rose-400"}`}>
              {opponentPredictionCorrect ? "✓ Correct" : "✗ Wrong"}
            </p>
          )}
        </div>
      </div>
      
      {/* Correct Answer Section */}
      {correctAnswer && (
        <div className="mt-4 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1 text-center">
            Correct Answer
          </p>
          <p className={`text-title text-center ${correctAnswer === "UP" ? "text-green-500" : "text-rose-500"}`}>
            {correctAnswer === "UP" ? "▲ UP" : "▼ DOWN"}
          </p>
        </div>
      )}
      
      {/* Draw Explanation */}
      {isDraw && (
        <div className={`mt-4 p-4 rounded-lg text-center ${
          bothCorrect 
            ? "bg-amber-500/10 border border-amber-500/30" 
            : bothWrong 
              ? "bg-zinc-500/10 border border-zinc-500/30"
              : "bg-zinc-500/10 border border-zinc-500/30"
        }`}>
          <p className={`text-sm font-medium ${
            bothCorrect ? "text-amber-400" : "text-zinc-400"
          }`}>
            {bothCorrect 
              ? "🤝 Both players predicted correctly!" 
              : bothWrong 
                ? "🤷 Both players predicted incorrectly!"
                : priceUnchanged 
                  ? "📊 Price unchanged - Draw!"
                  : "🤝 It's a draw!"}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Stakes have been returned to both players
          </p>
        </div>
      )}
    </>
  );
}

// Memory Game Results Component
function MemoryGameResults({
  matchData,
  isPlayerA,
  isDraw,
}: {
  matchData: any;
  isPlayerA: boolean;
  isDraw: boolean;
}) {
  const results = matchData?.results;
  const myScore = isPlayerA ? results?.playerAScore : results?.playerBScore;
  const oppScore = isPlayerA ? results?.playerBScore : results?.playerAScore;
  const myFlips = isPlayerA
    ? results?.playerATotalFlips
    : results?.playerBTotalFlips;
  const oppFlips = isPlayerA
    ? results?.playerBTotalFlips
    : results?.playerATotalFlips;

  return (
    <>
      <div className="mt-8 grid grid-cols-2 gap-6 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
            Your Score
          </p>
          <p className="text-headline text-indigo-400">{myScore ?? 0}</p>
          <p className="text-sm text-zinc-400 mt-1">
            pairs matched
          </p>
          {myFlips !== undefined && (
            <p className="text-xs text-zinc-500 mt-1">
              {myFlips} total flips
            </p>
          )}
        </div>
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
            Opponent Score
          </p>
          <p className="text-headline text-rose-400">{oppScore ?? 0}</p>
          <p className="text-sm text-zinc-400 mt-1">
            pairs matched
          </p>
          {oppFlips !== undefined && (
            <p className="text-xs text-zinc-500 mt-1">
              {oppFlips} total flips
            </p>
          )}
        </div>
      </div>

      {isDraw && (
        <div className="mt-4 p-4 rounded-lg text-center bg-amber-500/10 border border-amber-500/30">
          <p className="text-sm font-medium text-amber-400">
            Both players matched the same number of pairs!
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Stakes have been returned to both players
          </p>
        </div>
      )}
    </>
  );
}

// Trade Duel Results Component
function TradeDuelResults({ matchData, isPlayerA }: { matchData: any; isPlayerA: boolean }) {
  const results = matchData?.results;
  const initialBalance = results?.initialBalance || 10000;
  
  // Get my and opponent's profit based on which player I am
  const myProfit = isPlayerA ? results?.playerAProfit : results?.playerBProfit;
  const opponentProfit = isPlayerA ? results?.playerBProfit : results?.playerAProfit;
  const myFinalBalance = isPlayerA ? results?.playerAFinalBalance : results?.playerBFinalBalance;
  const opponentFinalBalance = isPlayerA ? results?.playerBFinalBalance : results?.playerAFinalBalance;
  const myProfitPercent = isPlayerA ? results?.playerAProfitPercent : results?.playerBProfitPercent;
  const opponentProfitPercent = isPlayerA ? results?.playerBProfitPercent : results?.playerAProfitPercent;
  
  // Fallback to matchData state if results not available
  const myState = isPlayerA ? matchData?.playerAState : matchData?.playerBState;
  const opponentState = isPlayerA ? matchData?.playerBState : matchData?.playerAState;
  
  const displayMyProfit = myProfit ?? (myState?.virtualBalance ? myState.virtualBalance - initialBalance : 0);
  const displayOpponentProfit = opponentProfit ?? (opponentState?.virtualBalance ? opponentState.virtualBalance - initialBalance : 0);
  const displayMyBalance = myFinalBalance ?? myState?.virtualBalance ?? initialBalance;
  const displayOpponentBalance = opponentFinalBalance ?? opponentState?.virtualBalance ?? initialBalance;
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };
  
  const formatProfit = (value: number) => {
    const formatted = formatCurrency(Math.abs(value));
    return value >= 0 ? `+${formatted}` : `-${formatted}`;
  };
  
  return (
    <div className="mt-8 grid grid-cols-2 gap-6 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
          Your Trading Result
        </p>
        <p className={`text-headline ${displayMyProfit >= 0 ? "text-green-500" : "text-rose-500"}`}>
          {formatProfit(displayMyProfit)}
        </p>
        <p className="text-sm text-zinc-400 mt-1">
          Final: {formatCurrency(displayMyBalance)}
        </p>
        {myProfitPercent !== undefined && (
          <p className={`text-xs ${displayMyProfit >= 0 ? "text-green-400" : "text-rose-400"}`}>
            ({displayMyProfit >= 0 ? "+" : ""}{myProfitPercent.toFixed(2)}%)
          </p>
        )}
      </div>
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
          Opponent Trading Result
        </p>
        <p className={`text-headline ${displayOpponentProfit >= 0 ? "text-green-500" : "text-rose-500"}`}>
          {formatProfit(displayOpponentProfit)}
        </p>
        <p className="text-sm text-zinc-400 mt-1">
          Final: {formatCurrency(displayOpponentBalance)}
        </p>
        {opponentProfitPercent !== undefined && (
          <p className={`text-xs ${displayOpponentProfit >= 0 ? "text-green-400" : "text-rose-400"}`}>
            ({displayOpponentProfit >= 0 ? "+" : ""}{opponentProfitPercent.toFixed(2)}%)
          </p>
        )}
      </div>
    </div>
  );
}

export default function Result() {
  const router = useRouter();
  const {
    currentMatch,
    playerId,
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
  // Draw when winner is null (handles COMPLETED, SETTLING, and SETTLED statuses)
  const isDraw = currentMatch?.winner === null && 
    (currentMatch?.status === "COMPLETED" || 
     currentMatch?.status === "SETTLING" || 
     currentMatch?.status === "SETTLED");

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
                  {currentMatch.gameType !== "MEMORY_GAME" && (
                    <div>
                      <p className="text-sm text-zinc-400">Asset</p>
                      <p className="text-title text-indigo-400">
                        {currentMatch.asset}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-zinc-400">Game Mode</p>
                    <p className="text-title text-amber-400">
                      {currentMatch.gameType === "MEMORY_GAME"
                        ? "🧠 Memory Match"
                        : currentMatch.gameType === "TRADE_DUEL" 
                          ? "⚡ Trade Duel" 
                          : "🔮 Prediction"}
                    </p>
                  </div>
                  {currentMatch.gameType !== "MEMORY_GAME" && (
                    <>
                      <div>
                        <p className="text-sm text-zinc-400">Start Price</p>
                        <p className="text-title text-mono">
                          ${currentMatch.startPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-400">End Price</p>
                        <p className="text-title text-mono">
                          ${currentMatch.endPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </>
                  )}
                  {/* Show price movement for Prediction mode only */}
                  {currentMatch.gameType !== "TRADE_DUEL" && currentMatch.startPrice && currentMatch.endPrice && (
                    <>
                      <div className="col-span-2">
                        <p className="text-sm text-zinc-400">Price Movement</p>
                        <p
                          className={`text-title ${currentMatch.endPrice > currentMatch.startPrice ? "text-green-500" : "text-rose-500"}`}
                        >
                          {currentMatch.endPrice > currentMatch.startPrice
                            ? "▲ UP"
                            : "▼ DOWN"}
                          <span className="text-sm ml-2">
                            ({currentMatch.endPrice > currentMatch.startPrice ? "+" : ""}
                            {(((currentMatch.endPrice - currentMatch.startPrice) / currentMatch.startPrice) * 100).toFixed(2)}%)
                          </span>
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Game-specific Results */}
                {currentMatch.gameType === "MEMORY_GAME" ? (
                  /* Memory Game: Show Score Comparison */
                  <MemoryGameResults
                    matchData={currentMatch.matchData}
                    isPlayerA={currentMatch.playerA === playerId}
                    isDraw={isDraw}
                  />
                ) : currentMatch.gameType === "TRADE_DUEL" ? (
                  /* Trade Duel: Show Profit Comparison */
                  <TradeDuelResults 
                    matchData={currentMatch.matchData} 
                    isPlayerA={currentMatch.playerA === playerId}
                  />
                ) : (
                  /* Prediction Game: Show UP/DOWN Comparison with correctness */
                  <PredictionResults 
                    currentMatch={currentMatch}
                    playerId={playerId}
                    isDraw={isDraw}
                  />
                )}
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
                      {settlementStatus === "pending" &&
                        "Preparing settlement..."}
                      {settlementStatus === "submitting" &&
                        "Submitting to Arc..."}
                      {settlementStatus === "confirming" &&
                        "Waiting for confirmation..."}
                    </span>
                  </>
                ) : isSettled ? (
                  <>
                    <span className="text-2xl">✓</span>
                    <span className="text-green-500 font-bold">
                      Settled on Arc
                    </span>
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
                        <span className="text-white font-mono">
                          ${settlement.grossAmount} USDC
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">
                          Platform Fee (2.5%)
                        </span>
                        <span className="text-zinc-500 font-mono">
                          -${settlement.rake} USDC
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-zinc-700 pt-2">
                        <span className="text-green-400 font-bold">
                          Your Payout
                        </span>
                        <span className="text-green-400 font-mono font-bold">
                          ${settlement.netPayout} USDC
                        </span>
                      </div>
                    </>
                  )}

                  {settlement.txHash && (
                    <div className="pt-2 border-t border-zinc-700">
                      <a
                        href={
                          settlement.explorerUrl ||
                          `https://testnet.explorer.arc.io/tx/${settlement.txHash}`
                        }
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
