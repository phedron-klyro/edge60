"use client";

import { useAccount } from "wagmi";
import { useENSProfile } from "@/hooks/useENSProfile";
import { ENSNameDisplay } from "./ENSNameDisplay";

interface ENSProfileCardProps {
  address?: `0x${string}`;
}

export function ENSProfileCard({ address }: ENSProfileCardProps) {
  const { address: connectedAddress } = useAccount();
  const targetAddress = address || connectedAddress;
  const { stats, dbStats } = useENSProfile(targetAddress);

  if (!targetAddress) return null;

  // Prefer ENS text records, fallback to DB stats
  const winRate =
    stats.winRate ||
    (dbStats?.winRate ? `${dbStats.winRate.toFixed(1)}%` : "0%");
  const duelsPlayed = stats.duelsPlayed || dbStats?.duelsPlayed || 0;
  const totalVolume =
    stats.totalVolume ||
    (dbStats?.totalVolume ? `$${dbStats.totalVolume}` : "$0");

  return (
    <div className="brutal-card bg-zinc-800 border-indigo-500 overflow-hidden">
      <div className="flex flex-col md:flex-row items-center gap-6 p-6">
        {/* Avatar & Name */}
        <div className="flex flex-col items-center gap-3">
          <ENSNameDisplay
            address={targetAddress}
            showAvatar
            avatarSize={80}
            className="text-2xl"
          />
          <p className="text-xs text-zinc-500 font-mono truncate max-w-[150px]">
            {targetAddress}
          </p>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px h-24 bg-zinc-700" />

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-8 flex-1 w-full">
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-zinc-400 mb-1">
              Win Rate
            </p>
            <p className="text-title text-amber-400">{winRate}</p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-zinc-400 mb-1">
              Duels
            </p>
            <p className="text-title text-indigo-400">{duelsPlayed}</p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-zinc-400 mb-1">
              Volume
            </p>
            <p className="text-title text-green-500">{totalVolume}</p>
          </div>
        </div>
      </div>

      {/* Stats Source Badge */}
      <div className="bg-zinc-900/50 px-4 py-1 flex justify-end">
        <span className="text-[10px] text-zinc-600 uppercase tracking-tighter">
          {stats.winRate ? "Source: ENS Text Records" : "Source: Edge60 DB"}
        </span>
      </div>
    </div>
  );
}
