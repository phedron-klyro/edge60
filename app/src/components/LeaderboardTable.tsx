"use client";

import { useQuery } from "@tanstack/react-query";
import { ENSNameDisplay } from "./ENSNameDisplay";

interface LeaderboardEntry {
  address: `0x${string}`;
  ensName: string | null;
  wins: number;
  losses: number;
  duelsPlayed: number;
  totalVolume: number;
  winRate: number;
}

export function LeaderboardTable() {
  const { data: players, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leaderboard`);
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return await res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="brutal-card p-8 text-center animate-pulse">
        <p className="text-xl text-zinc-400">Loading leaderboard...</p>
      </div>
    );
  }

  if (!players || players.length === 0) {
    return (
      <div className="brutal-card p-8 text-center">
        <p className="text-xl text-zinc-400">No data available yet.</p>
        <p className="text-sm text-zinc-500 mt-2">
          Start dueling to appear on the leaderboard!
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b-4 border-white">
            <th className="p-4 text-xs uppercase tracking-widest text-zinc-400">
              Rank
            </th>
            <th className="p-4 text-xs uppercase tracking-widest text-zinc-400">
              Player
            </th>
            <th className="p-4 text-xs uppercase tracking-widest text-zinc-400 text-center">
              Wins
            </th>
            <th className="p-4 text-xs uppercase tracking-widest text-zinc-400 text-center">
              Win Rate
            </th>
            <th className="p-4 text-xs uppercase tracking-widest text-zinc-400 text-right">
              Volume
            </th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, index) => (
            <tr
              key={player.address}
              className="border-b border-zinc-700 hover:bg-zinc-800/50 transition-colors"
            >
              <td className="p-4 font-display text-indigo-500">#{index + 1}</td>
              <td className="p-4">
                <ENSNameDisplay
                  address={player.address}
                  showAvatar
                  avatarSize={32}
                />
              </td>
              <td className="p-4 text-center font-bold text-green-500">
                {player.wins}
              </td>
              <td className="p-4 text-center">
                <span
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    player.winRate >= 70
                      ? "bg-green-900 text-green-400"
                      : player.winRate >= 50
                        ? "bg-amber-900 text-amber-400"
                        : "bg-rose-900 text-rose-400"
                  }`}
                >
                  {player.winRate.toFixed(1)}%
                </span>
              </td>
              <td className="p-4 text-right font-mono text-zinc-300">
                ${player.totalVolume.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
