"use client";

import { useQuery } from "@tanstack/react-query";

interface Match {
  id: string;
  playerA: string;
  playerB: string | null;
  stake: number;
  winner: string | null;
  updatedAt: string;
}

export function RecentDuels({ address }: { address?: string }) {
  const { data: matches, isLoading } = useQuery<Match[]>({
    queryKey: ["playerHistory", address],
    queryFn: async () => {
      if (!address) return [];
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/player/${address}/history`,
      );
      if (!res.ok) throw new Error("Failed to fetch history");
      return await res.json();
    },
    enabled: !!address,
  });

  if (isLoading) {
    return (
      <div className="brutal-card h-full min-w-0 animate-pulse">
        <p className="text-sm uppercase tracking-widest text-zinc-400 mb-2">
          Recent Duels
        </p>
        <div className="space-y-4 mt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-zinc-700/50 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <div className="brutal-card h-full min-w-0">
        <p className="text-sm uppercase tracking-widest text-zinc-400 mb-2">
          Recent Duels
        </p>
        <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-zinc-900/30 rounded-lg">
          <p className="text-sm text-zinc-500">No recent duels found.</p>
          <p className="text-xs text-zinc-600 mt-1">
            Start a match to see your activity here!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="brutal-card h-full min-w-0">
      <p className="text-sm uppercase tracking-widest text-zinc-400 mb-2">
        Recent Duels
      </p>
      <div className="space-y-3 mt-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {matches.map((match) => {
          const isWinner = match.winner === address;
          const isDraw = !match.winner;
          const amount = isDraw
            ? match.stake
            : isWinner
              ? match.stake
              : -match.stake;
          const time = new Date(match.updatedAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={match.id}
              className="flex justify-between items-center py-2 border-b border-zinc-700 last:border-0 hover:bg-zinc-800/30 px-2 -mx-2 rounded transition-colors"
            >
              <div className="flex flex-col">
                <span
                  className={`font-bold ${isDraw ? "text-zinc-400" : isWinner ? "text-green-500" : "text-rose-500"}`}
                >
                  {isDraw
                    ? "SETTLED (DRAW)"
                    : isWinner
                      ? `+${amount.toFixed(2)}`
                      : `${amount.toFixed(2)}`}
                </span>
                <span className="text-[10px] text-zinc-600 uppercase">
                  {match.id.slice(0, 8)} • {match.stake} USDC
                </span>
              </div>
              <span className="text-xs text-zinc-500">{time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
