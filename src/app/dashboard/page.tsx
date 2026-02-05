"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  WalletConnectButton,
  ENSNameDisplay,
  ENSProfileCard,
  BalanceCard,
  YellowSessionCard,
} from "@/components";
import { MatchProposal } from "@/components/game/MatchProposal";
import { useAccount, useBalance } from "wagmi";
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
    queuePosition,
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

  // Fetch real USDC balance
  const { data: balanceData } = useBalance({
    address,
    token: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia USDC
    chainId: 84532,
  });

  const balance = balanceData ? parseFloat(balanceData.formatted) : 0;

  // Real contract stats
  const [stats, setStats] = useState<{
    totalMatches: number;
    totalVolume: string;
    protocolRevenue: string;
  } | null>(null);

  useEffect(() => {
    fetch("http://localhost:3002/api/contract-stats")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error("Failed to fetch stats:", err));
  }, []);

  // Redirect to duel page when match is ACTIVE or PLAYING (not just matched/proposed)
  useEffect(() => {
    if (phase === "playing") {
      router.push("/duel");
    }
  }, [phase, router]);

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
      {/* Match Proposal Modal */}
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
            <div className="h-full flex min-w-0">
              <BalanceCard balance={balance} label="Wallet Balance" />
            </div>

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
                        ${stats.totalVolume} USDC
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Matches Settled</p>
                      <p className="text-title text-indigo-400">
                        {stats.totalMatches}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Protocol Revenue</p>
                      <p className="text-title text-green-500">
                        ${stats.protocolRevenue} USDC
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
            <div className="brutal-card h-full min-w-0">
              <p className="text-sm uppercase tracking-widest text-zinc-400 mb-2">
                Recent Duels
              </p>
              <div className="space-y-3 mt-4">
                <div className="flex justify-between items-center py-2 border-b border-zinc-700">
                  <span className="text-green-500">+$2.00</span>
                  <span className="text-sm text-zinc-400">2 min ago</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-zinc-700">
                  <span className="text-rose-500">-$1.00</span>
                  <span className="text-sm text-zinc-400">15 min ago</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-green-500">+$2.00</span>
                  <span className="text-sm text-zinc-400">1 hr ago</span>
                </div>
              </div>
            </div>
          </div>

          {/* Join Duel Section */}
          <div className="brutal-card bg-zinc-800 flex flex-col gap-6 p-8">
            <h3 className="text-headline text-amber-400">
              {phase === "queuing" ? "⏳ In Queue..." : "Start New Match"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  GAME MODE
                </label>
                <select
                  value={selectedGame}
                  onChange={(e) => setSelectedGame(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                >
                  <option value="PREDICTION">🔮 Price Prediction</option>
                  <option value="TRADE_DUEL">⚡ Trade Duel (Skill)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  ASSET
                </label>
                <div className="flex gap-2">
                  {["ETH/USD", "BTC/USD", "SOL/USD"].map((asset) => (
                    <button
                      key={asset}
                      onClick={() => setSelectedAsset(asset)}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold border ${selectedAsset === asset ? "bg-white text-black border-white" : "bg-transparent text-gray-400 border-white/10 hover:border-white/30"}`}
                    >
                      {asset.split("/")[0]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  STAKE
                </label>
                <div className="flex gap-2">
                  {[1, 10, 25, 50].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setSelectedStake(amount)}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold border ${selectedStake === amount ? "bg-green-500 text-black border-green-500" : "bg-transparent text-gray-400 border-white/10 hover:border-white/30"}`}
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
                    ? "Connected to ws://localhost:3002"
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
