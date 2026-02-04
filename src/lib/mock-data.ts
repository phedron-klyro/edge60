// Mock data for Edge60 demo
export const mockUser = {
  address: "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`,
  ensName: "vitalik.eth",
  usdcBalance: 1250.50,
};

export const mockMatch = {
  id: "match_001",
  status: "active" as const,
  player1: {
    address: "0x1234...5678",
    ensName: "player1.eth",
    prediction: "UP" as const,
  },
  player2: {
    address: "0xabcd...efgh",
    ensName: "player2.eth",
    prediction: "DOWN" as const,
  },
  stakeAmount: 10,
  asset: "ETH/USD",
  startPrice: 2450.25,
  endPrice: null,
  duration: 60,
  startTime: Date.now(),
};

export const mockPriceData = {
  asset: "ETH/USD",
  price: 2450.25,
  change24h: 2.5,
};

export const mockLeaderboard = [
  { rank: 1, address: "0x1234...5678", ensName: "whale.eth", wins: 42, winRate: 78 },
  { rank: 2, address: "0xabcd...efgh", ensName: "trader.eth", wins: 38, winRate: 72 },
  { rank: 3, address: "0x9876...5432", ensName: null, wins: 35, winRate: 68 },
];
