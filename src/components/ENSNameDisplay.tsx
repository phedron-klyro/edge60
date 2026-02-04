"use client";

import { useAccount, useEnsName } from "wagmi";
import { mainnet } from "wagmi/chains";

interface ENSNameDisplayProps {
  address?: `0x${string}`;
  className?: string;
}

export function ENSNameDisplay({
  address,
  className = "",
}: ENSNameDisplayProps) {
  const { address: connectedAddress } = useAccount();
  const targetAddress = address || connectedAddress;

  const { data: ensName, isLoading } = useEnsName({
    address: targetAddress,
    chainId: mainnet.id,
  });

  if (!targetAddress) {
    return (
      <span className={`text-(--color-text-muted) ${className}`}>
        Not Connected
      </span>
    );
  }

  const truncatedAddress = `${targetAddress.slice(0, 6)}...${targetAddress.slice(-4)}`;

  if (isLoading) {
    return (
      <span className={`animate-pulse text-(--color-text-muted) ${className}`}>
        Loading...
      </span>
    );
  }

  return (
    <span className={`font-bold ${className}`}>
      {ensName || truncatedAddress}
    </span>
  );
}
