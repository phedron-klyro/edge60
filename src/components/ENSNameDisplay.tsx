import { useAccount, useEnsName, useEnsAvatar } from "wagmi";
import { mainnet } from "wagmi/chains";

interface ENSNameDisplayProps {
  address?: `0x${string}`;
  className?: string;
  showAvatar?: boolean;
  avatarSize?: number;
}

export function ENSNameDisplay({
  address,
  className = "",
  showAvatar = false,
  avatarSize = 24,
}: ENSNameDisplayProps) {
  const { address: connectedAddress } = useAccount();
  const targetAddress = address || connectedAddress;

  const { data: ensName, isLoading: nameLoading } = useEnsName({
    address: targetAddress,
    chainId: mainnet.id,
  });

  const { data: ensAvatar, isLoading: avatarLoading } = useEnsAvatar({
    name: ensName || undefined,
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
  const isLoading = nameLoading || (showAvatar && avatarLoading);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {showAvatar && (
          <div
            className="rounded-full bg-zinc-800 animate-pulse border-2 border-white"
            style={{ width: avatarSize, height: avatarSize }}
          />
        )}
        <span className="animate-pulse text-(--color-text-muted)">
          Loading...
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showAvatar && (
        <div
          className="rounded-full overflow-hidden border-2 border-white bg-zinc-800 shrink-0"
          style={{ width: avatarSize, height: avatarSize }}
        >
          {ensAvatar ? (
            <img
              src={ensAvatar}
              alt={ensName || "avatar"}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-linear-to-br from-indigo-500 to-purple-600" />
          )}
        </div>
      )}
      <span className="font-bold">{ensName || truncatedAddress}</span>
    </div>
  );
}
