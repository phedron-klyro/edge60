"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  WalletConnectButton,
  ENSNameDisplay,
  ENSProfileCard,
  YellowSessionCard,
  RecentDuels,
  MatchmakingModal,
  VersusAnimation,
} from "@/components";
import { MatchProposal } from "@/components/game/MatchProposal";
import Image from "next/image";
import { useAccount } from "wagmi";
import { useGame } from "@/context/GameContext";

// Connection status indicator component
const ConnectionStatus = ({ connected }: { connected: boolean }) => (
  <div className="flex items-center gap-2 text-sm">
    <span
      className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
    />
    <span className="text-zinc-400">
      {connected ? "Connected" : "Connecting..."}
    </span>
  </div>
);

export default function Dashboard() {
  const router = useRouter();
  const { address } = useAccount();
  const {
    isConnected: wsConnected,
    phase,
    joinQueue,
    leaveQueue,
    matchProposal,
    acceptMatch,
    declineMatch,
    yellow,
  } = useGame();

  // Local state for game selection
  const [selectedGame, setSelectedGame] = useState("PREDICTION");
  const [selectedAsset, setSelectedAsset] = useState("ETH/USD");
  const [selectedStake, setSelectedStake] = useState(1);

  // Real contract stats
  const [stats, setStats] = useState<{
    totalMatches: number;
    totalVolume: string;
    protocolRevenue: string;
  } | null>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contract-stats`)
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error("Failed to fetch stats:", err));
  }, []);

  // State to manage versus animation
  const [showVersus, setShowVersus] = useState(false);
  const { currentMatch } = useGame();

  // Redirect to duel page after versus animation (stable ref so animation timer isn't reset on re-renders)
  const handleVersusComplete = useCallback(() => {
    setShowVersus(false);
    router.push("/duel");
  }, [router]);

  // Trigger versus animation when matched
  useEffect(() => {
    if (phase === "playing" && !showVersus) {
      // Use requestAnimationFrame or setTimeout to avoid synchronous setState warning
      const frame = requestAnimationFrame(() => {
        setShowVersus(true);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [phase, showVersus]);

  // Handle join duel click
  const handleJoinDuel = () => {
    if (!wsConnected) {
      alert("Connecting to game server...");
      return;
    }
    joinQueue(selectedStake, selectedGame, selectedAsset);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Versus Screen Phase */}
      {showVersus && currentMatch && (
        <VersusAnimation
          playerA={{ name: "You" }}
          playerB={{ name: "Opponent" }}
          gameType={currentMatch.gameType}
          onComplete={handleVersusComplete}
        />
      )}

      {/* Matchmaking Queue Phase */}
      {phase === "queuing" && (
        <MatchmakingModal
          onCancel={leaveQueue}
          gameType={selectedGame}
          asset={selectedAsset}
          stake={selectedStake}
        />
      )}

      {/* Match Proposal Phase */}
      {matchProposal && (
        <MatchProposal
          proposal={matchProposal}
          onAccept={() => acceptMatch(matchProposal.matchId)}
          onDecline={() => declineMatch(matchProposal.matchId)}
        />
      )}

      {/* Header */}
      <header className="border-b-4 border-white p-6 flex items-center justify-between">
        <Link href="/">
          <h1 className="text-title hover:text-indigo-500 transition-colors">
            EDGE60
          </h1>
        </Link>
        <div className="flex items-center gap-6">
          <ConnectionStatus connected={wsConnected} />
          <ENSNameDisplay className="text-lg" />
          <WalletConnectButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Welcome Section */}
          <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div className="space-y-2">
              <h2 className="text-headline">
                Welcome back,{" "}
                <span className="text-indigo-500">
                  <ENSNameDisplay />
                </span>
              </h2>
              <p className="text-body text-zinc-400">
                Ready to predict the market?
              </p>
            </div>
            <Link href="/leaderboard">
              <button className="brutal-btn text-sm bg-indigo-600 border-white flex items-center gap-2">
                🏆 GLOBAL LEADERBOARD
              </button>
            </Link>
          </div>

          {/* Profile Section */}
          <ENSProfileCard />

          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {/* Balance Card */}
            {/* <div className="h-full flex min-w-0">
              <BalanceCard balance={balance} label="Wallet Balance" />
            </div> */}

            {/* Yellow Session Card */}
            <div className="h-full flex min-w-0">
              <YellowSessionCard yellow={yellow} />
            </div>

            {/* Protocol Stats Card */}
            <div className="brutal-card h-full flex flex-col justify-between min-w-0 bg-linear-to-br from-zinc-800 to-indigo-950/30">
              <p className="text-sm uppercase tracking-widest text-zinc-400 mb-2">
                Protocol Stats
              </p>
              <div className="space-y-4 mt-4 flex-1">
                {stats ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-zinc-500">Total Volume</p>
                      <p className="text-title text-amber-400">
                        ${stats.totalVolume}+ USDC
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Matches Settled</p>
                      <p className="text-title text-indigo-400">
                        {stats.totalMatches}+
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Protocol Revenue</p>
                      <p className="text-title text-green-500">
                        ${stats.protocolRevenue}+ USDC
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 animate-pulse">
                    Loading live contract data...
                  </p>
                )}
                <Link href="/leaderboard" className="block mt-6">
                  <button className="w-full brutal-btn brutal-btn-primary py-2 text-sm">
                    VIEW RANKINGS
                  </button>
                </Link>
              </div>
            </div>

            {/* Recent Activity */}
            <RecentDuels address={address} />
          </div>

          {/* Join Duel Section */}
          <div className="brutal-card bg-zinc-800 flex flex-col gap-6 p-8">
            <h3 className="text-headline text-amber-400">
              {phase === "queuing" ? "⏳ In Queue..." : "Start New Match"}
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-4">
              {/* Game Mode Selection Grid */}
              <div className="lg:col-span-2">
                <label className="block text-sm text-gray-500 uppercase tracking-widest mb-4">
                  SELECT GAME MODE
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    {
                      id: "PREDICTION",
                      title: "Price Prediction",
                      description: "Predict the market direction to win.",
                      image: "/thumbnails/prediction_thumbnail.png",
                      icon: "🔮",
                    },
                    {
                      id: "TRADE_DUEL",
                      title: "Trade Duel",
                      description: "Battle other traders in real-time.",
                      image: "/thumbnails/trade_duel_thumbnail_wide.png",
                      icon: "⚔️",
                    },
                  ].map((game) => (
                    <div
                      key={game.id}
                      onClick={() => setSelectedGame(game.id)}
                      className={`group cursor-pointer brutal-card p-0 overflow-hidden h-full transition-all duration-300 ${
                        selectedGame === game.id
                          ? "border-indigo-500 ring-4 ring-indigo-500/20 translate-y-[-4px]"
                          : "border-white/10 opacity-70 hover:opacity-100 hover:border-white/30"
                      }`}
                    >
                      <div className="relative h-68 w-full overflow-hidden bg-black/40">
                        <Image
                          src={game.image}
                          alt={game.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-4 left-4">
                          <span className="text-3xl mb-2 block">
                            {game.icon}
                          </span>
                          <h4 className="text-xl font-black text-white">
                            {game.title}
                          </h4>
                        </div>
                        {selectedGame === game.id && (
                          <div className="absolute top-4 right-4 bg-indigo-500 text-white text-xs font-bold px-2 py-1 rounded border border-white">
                            SELECTED
                          </div>
                        )}
                      </div>
                      <div className="p-4 bg-zinc-900/50">
                        <p className="text-sm text-zinc-400">
                          {game.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Asset Selection */}
              <div>
                <label className="block text-sm text-gray-500 uppercase tracking-widest mb-4">
                  SELECT ASSET
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["ETH/USD", "BTC/USD", "SOL/USD"].map((asset) => (
                    <button
                      key={asset}
                      onClick={() => setSelectedAsset(asset)}
                      className={`py-3 rounded-lg text-sm font-bold border-2 transition-all ${
                        selectedAsset === asset
                          ? "bg-white text-black border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]"
                          : "bg-black/40 text-gray-400 border-white/10 hover:border-white/30"
                      }`}
                    >
                      {asset.split("/")[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stake Selection */}
              <div>
                <label className="block text-sm text-gray-500 uppercase tracking-widest mb-4">
                  SELECT STAKE
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 10, 25, 50].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setSelectedStake(amount)}
                      className={`py-3 rounded-lg text-sm font-bold border-2 transition-all ${
                        selectedStake === amount
                          ? "bg-green-500 text-black border-green-500 shadow-[4px_4px_0px_0px_rgba(34,197,94,0.3)]"
                          : "bg-black/40 text-gray-400 border-white/10 hover:border-white/30"
                      }`}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              {phase === "queuing" ? (
                <button
                  onClick={leaveQueue}
                  className="brutal-btn bg-rose-600 text-xl whitespace-nowrap px-8"
                >
                  ❌ Leave Queue
                </button>
              ) : (
                <button
                  onClick={handleJoinDuel}
                  disabled={!wsConnected}
                  className="brutal-btn brutal-btn-primary text-xl whitespace-nowrap disabled:opacity-50 px-8 w-full md:w-auto"
                >
                  ⚔️ Find Match
                </button>
              )}
            </div>
          </div>

          {/* Server Status */}
          <div className="brutal-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-2xl">🔌</span>
              <div>
                <p className="font-bold">Game Server</p>
                <p className="text-sm text-zinc-400">
                  {wsConnected
                    ? `Connected to ${process.env.NEXT_PUBLIC_WS_URL}`
                    : "Connecting..."}
                </p>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded font-bold text-sm ${wsConnected ? "bg-green-600" : "bg-yellow-600"}`}
            >
              {wsConnected ? "LIVE" : "CONNECTING"}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
