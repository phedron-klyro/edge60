import { useEnsName, useEnsAvatar, useEnsText, useAccount } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { useQuery } from "@tanstack/react-query";

interface ENSProfile {
  name: string | null;
  avatar: string | null;
  stats: {
    winRate: string | null;
    duelsPlayed: string | null;
    totalVolume: string | null;
  };
  dbStats: {
    wins: number;
    losses: number;
    duelsPlayed: number;
    totalVolume: number;
    winRate: number;
  } | null;
}

export function useENSProfile(address?: `0x${string}`) {

  const { chain } = useAccount();
  // 1. Resolve ENS Name
  const { data: ensName } = useEnsName({
    address,
    chainId: 11155111,
  });

  // 2. Resolve ENS Avatar
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName || undefined,
    chainId: 11155111,
  });

  // 3. Resolve ENS Text Records
  const { data: winRateRecord } = useEnsText({
    name: ensName || undefined,
    key: "edge60.winRate",
    chainId: 11155111,
  });

  const { data: duelsPlayedRecord } = useEnsText({
    name: ensName || undefined,
    key: "edge60.duelsPlayed",
    chainId: 11155111,
  });

  const { data: totalVolumeRecord } = useEnsText({
    name: ensName || undefined,
    key: "edge60.totalVolume",
    chainId: 11155111,
  });

  // 4. Resolve DB Stats from backend
  const { data: dbStats } = useQuery({
    queryKey: ["playerStats", address],
    queryFn: async () => {
      if (!address) return null;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/player/${address}`);
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },
    enabled: !!address,
  });

  return {
    name: ensName,
    avatar: ensAvatar,
    stats: {
      winRate: winRateRecord,
      duelsPlayed: duelsPlayedRecord,
      totalVolume: totalVolumeRecord,
    },
    dbStats,
  } as ENSProfile;
}
