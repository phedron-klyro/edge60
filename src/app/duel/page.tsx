"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  WalletConnectButton,
  ENSNameDisplay,
  CountdownTimer,
  PredictionButtons,
  MatchStatusBanner,
} from "@/components";
import { useGame } from "@/context/GameContext";

export default function Duel() {
  const router = useRouter();
  const { currentMatch, myPrediction, submitPrediction, phase, playerId } =
    useGame();

  // Redirect if no active match
  useEffect(() => {
    if (phase === "idle" || phase === "queuing") {
      router.push("/dashboard");
    } else if (phase === "result") {
      router.push("/result");
    }
  }, [phase, router]);

  // Sync timer with server startTime
  useEffect(() => {
    if (currentMatch?.startTime && currentMatch.status === "ACTIVE") {
      const interval = setInterval(() => {
        const elapsed = Math.floor(
          (Date.now() - currentMatch.startTime!) / 1000,
        );
        const remaining = Math.max(0, currentMatch.duration - elapsed);

        if (remaining === 0) {
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentMatch?.startTime, currentMatch?.duration, currentMatch?.status]);

  const handlePredict = (value: "UP" | "DOWN" | null) => {
    if (value && !myPrediction) {
      submitPrediction(value);
    }
  };

  if (!currentMatch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p className="text-xl animate-pulse">Loading Match...</p>
      </div>
    );
  }

  const isPlayerA = currentMatch.playerA === playerId;
  const opponentId = isPlayerA ? currentMatch.playerB : currentMatch.playerA;
  const myActualPrediction = isPlayerA
    ? currentMatch.predictionA
    : currentMatch.predictionB;
  const opponentPrediction = isPlayerA
    ? currentMatch.predictionB
    : currentMatch.predictionA;

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

      {/* Status Banner */}
      <MatchStatusBanner
        status={
          currentMatch.status === "WAITING"
            ? "waiting"
            : currentMatch.status === "ACTIVE"
              ? "active"
              : "finished"
        }
      />

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Match Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Player 1 (You) */}
            <div className="brutal-card text-center border-indigo-500">
              <p className="text-sm uppercase tracking-widest text-zinc-400 mb-2">
                You
              </p>
              <div className="text-title text-indigo-500 truncate px-2">
                <ENSNameDisplay
                  address={playerId as `0x${string}` | undefined}
                />
              </div>
              {myActualPrediction && (
                <p
                  className={`text-headline mt-4 ${
                    myActualPrediction === "UP"
                      ? "text-green-500"
                      : "text-rose-500"
                  }`}
                >
                  {myActualPrediction === "UP" ? "▲ UP" : "▼ DOWN"}
                </p>
              )}
            </div>

            {/* VS */}
            <div className="brutal-card text-center flex items-center justify-center bg-zinc-800">
              <span className="text-display text-amber-400">VS</span>
            </div>

            {/* Player 2 (Opponent) */}
            <div className="brutal-card text-center border-rose-500">
              <p className="text-sm uppercase tracking-widest text-zinc-400 mb-2">
                Opponent
              </p>
              <div className="text-title text-rose-500 truncate px-2">
                {opponentId ? (
                  <ENSNameDisplay address={opponentId as `0x${string}`} />
                ) : (
                  "Waiting..."
                )}
              </div>
              <p className="text-headline mt-4 text-zinc-500">
                {opponentPrediction ? (
                  <span
                    className={
                      opponentPrediction === "UP"
                        ? "text-green-900"
                        : "text-rose-900"
                    }
                  >
                    {opponentPrediction === "UP" ? "▲ UP" : "▼ DOWN"}
                  </span>
                ) : (
                  "🔒 Hidden"
                )}
              </p>
            </div>
          </div>

          {/* Asset & Price */}
          <div className="brutal-card text-center">
            <p className="text-sm uppercase tracking-widest text-zinc-400 mb-2">
              {currentMatch.asset}
            </p>
            <p className="text-display text-mono">
              {currentMatch.startPrice
                ? `$${currentMatch.startPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : "Fetching Price..."}
            </p>
            <p className="text-sm text-zinc-500 mt-2">
              Entry Price @{" "}
              {currentMatch.startTime
                ? new Date(currentMatch.startTime).toLocaleTimeString()
                : "Pending"}
            </p>
          </div>

          {/* Timer */}
          <CountdownTimer
            duration={currentMatch.duration}
            autoStart={currentMatch.status === "ACTIVE"}
            onComplete={() => console.log("Timer ended")}
          />

          {/* Stake Info */}
          <div className="brutal-card flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-sm uppercase tracking-widest text-zinc-400">
                Stake
              </p>
              <p className="text-headline text-amber-400">
                ${currentMatch.stake} USDC
              </p>
            </div>
            <div className="w-px h-16 bg-zinc-700" />
            <div className="text-center">
              <p className="text-sm uppercase tracking-widest text-zinc-400">
                Prize Pool
              </p>
              <p className="text-headline text-green-500">
                ${currentMatch.stake * 2} USDC
              </p>
            </div>
          </div>

          {/* Prediction Buttons */}
          {!myActualPrediction ? (
            <div className="space-y-6">
              <p className="text-center text-title text-zinc-400">
                Will the price go UP or DOWN?
              </p>
              <PredictionButtons
                onPredict={handlePredict}
                disabled={currentMatch.status !== "ACTIVE"}
              />
            </div>
          ) : (
            <div className="brutal-card text-center bg-zinc-800 border-green-500 text-green-500">
              <p className="text-title">Prediction Locked! 🔒</p>
              <p className="text-body text-zinc-400 mt-2">
                Waiting for the 60-second window to conclude...
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
