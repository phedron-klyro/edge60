import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  mainnet,
  base,
  baseSepolia,
  polygon,
  polygonMumbai,
} from "wagmi/chains";
import { http } from "wagmi";

// Custom Arc chain configuration (placeholder)
const arcTestnetChain = {
  id: 5042002, // Arc chain ID (placeholder)
  name: "Arc Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "ETH",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL || "https://rpc.arc.dev",
      ],
    },
  },
  blockExplorers: {
    default: { name: "Arc Explorer", url: "https://testnet.arcscan.app" },
  },
  testnet: true,
} as const;

export const config = getDefaultConfig({
  appName: "Edge60",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
  chains: [mainnet, base, baseSepolia, polygon, polygonMumbai, arcTestnetChain],
  transports: {
    [mainnet.id]: http(
      process.env.NEXT_PUBLIC_MAINNET_RPC_URL || "https://cloudflare-eth.com",
    ),
    [base.id]: http(),
    [baseSepolia.id]: http(
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ||
        "https://rpc.ankr.com/base_sepolia",
    ),
    [polygon.id]: http(),
    [polygonMumbai.id]: http(),
    [arcTestnetChain.id]: http(
      process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL ||
        "https://rpc.testnet.arc.network",
    ),
  },
  ssr: true,
});

// Contract addresses per chain
export const USDC_ADDRESSES: Record<number, `0x${string}`> = {
  [mainnet.id]: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  [base.id]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  [baseSepolia.id]: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  [polygon.id]: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  [polygonMumbai.id]: "0x0FA8781a83E46826621b3BC094Ea2A0212e71B23",
  [arcTestnetChain.id]: "0x3600000000000000000000000000000000000000",
};

export const TREASURY_ADDRESSES: Record<number, `0x${string}`> = {
  [baseSepolia.id]: "0x0000000000000000000000000000000000000000",
  [arcTestnetChain.id]: "0x27d1642370e4223490f01D30D07C742DAaFd6977",
};

export const YELLOW_SETTLEMENT_ADDRESSES: Record<number, `0x${string}`> = {
  [baseSepolia.id]: "0x0000000000000000000000000000000000000000", // Deploy and update
};
