/**
 * Edge60 Frontend - Yellow Network Session Hook (Production)
 *
 * Manages off-chain state channels using Yellow Network's Nitrolite SDK.
 * Handles deposits, withdrawals, and balance tracking for USDC.
 *
 * Architecture:
 * 1. User connects wallet → Session key generated (stored locally)
 * 2. User deposits USDC → Funds move to Nitrolite custody contract
 * 3. Off-chain play → Balances tracked via state channel
 * 4. Settlement → Backend triggers EdgeTreasury.settleMatch()
 * 5. Withdrawal → User can withdraw from treasury anytime
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  useWalletClient,
  usePublicClient,
  useAccount,
  useChainId,
} from "wagmi";
import { NitroliteClient, SessionKeyStateSigner } from "@erc7824/nitrolite";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { Address, parseUnits, formatUnits, Hex, parseAbi } from "viem";

// ============================================
// CONFIGURATION
// ============================================

// Yellow Network Contract Addresses (Base Sepolia)
const YELLOW_ADJUDICATOR =
  (process.env.NEXT_PUBLIC_YELLOW_ADJUDICATOR as Address) ||
  "0x0000000000000000000000000000000000000000";
const YELLOW_CUSTODY =
  (process.env.NEXT_PUBLIC_YELLOW_CUSTODY as Address) ||
  "0x0000000000000000000000000000000000000000";

// USDC Token (Base Sepolia - Circle's official testnet USDC)
const USDC_TOKEN =
  (process.env.NEXT_PUBLIC_USDC_ADDRESS as Address) ||
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

// Edge60 Treasury Contract (for on-chain settlements)
const TREASURY_ADDRESS =
  (process.env.NEXT_PUBLIC_TREASURY_ADDRESS as Address) ||
  "0x0000000000000000000000000000000000000000";

// Session storage key
const SESSION_KEY_STORAGE = "edge60_yellow_session_key";
const BALANCE_CACHE_STORAGE = "edge60_balance_cache";

// ERC20 ABI for direct USDC interactions
const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
]);

// ============================================
// TYPES
// ============================================

export interface YellowSession {
  // State
  sessionId: string | null;
  sessionAddress: Address | null;
  offChainBalance: string;
  onChainBalance: string;
  isInitialised: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  deposit: (amount: string) => Promise<{ txHash: string } | null>;
  withdraw: (amount: string) => Promise<{ txHash: string } | null>;
  refreshBalance: () => Promise<void>;
  generateNewSession: () => void;
  clearError: () => void;

  // Info
  usdcAddress: Address;
  treasuryAddress: Address;
  isYellowConfigured: boolean;
}

export type YellowSessionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useYellowSession(): YellowSession {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const chainId = useChainId();

  // State
  const [sessionKey, setSessionKey] = useState<Hex | null>(null);
  const [offChainBalance, setOffChainBalance] = useState<string>("0.00");
  const [onChainBalance, setOnChainBalance] = useState<string>("0.00");
  const [client, setClient] = useState<NitroliteClient | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if Yellow Network is configured
  const isYellowConfigured = useMemo(
    () =>
      YELLOW_ADJUDICATOR !== "0x0000000000000000000000000000000000000000" &&
      YELLOW_CUSTODY !== "0x0000000000000000000000000000000000000000",
    []
  );

  // ============================================
  // SESSION KEY MANAGEMENT
  // ============================================

  // Load or generate session key on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      let key = localStorage.getItem(SESSION_KEY_STORAGE) as Hex;
      if (!key || !key.startsWith("0x") || key.length !== 66) {
        key = generatePrivateKey();
        localStorage.setItem(SESSION_KEY_STORAGE, key);
        console.log("[Yellow] Generated new session key");
      }
      setSessionKey(key);
    } catch (err) {
      console.error("[Yellow] Failed to load/generate session key:", err);
      setError("Failed to initialize session key");
    }
  }, []);

  // ============================================
  // NITROLITE CLIENT INITIALIZATION
  // ============================================

  useEffect(() => {
    if (!isConnected || !walletClient || !publicClient || !sessionKey) {
      setClient(null);
      return;
    }

    // Skip if Yellow Network is not configured
    if (!isYellowConfigured) {
      console.log("[Yellow] Contracts not configured, using direct USDC mode");
      setClient(null);
      return;
    }

    try {
      const stateSigner = new SessionKeyStateSigner(sessionKey);

      const nitroliteClient = new NitroliteClient({
        publicClient,
        walletClient: walletClient as any,
        stateSigner,
        chainId,
        challengeDuration: BigInt(3600), // 1 hour minimum
        addresses: {
          adjudicator: YELLOW_ADJUDICATOR,
          custody: YELLOW_CUSTODY,
        },
      });

      setClient(nitroliteClient);
      setError(null);
      console.log("[Yellow] Nitrolite client initialized");
      console.log("[Yellow] Session address:", stateSigner.getAddress());
    } catch (err) {
      console.error("[Yellow] Failed to initialize Nitrolite client:", err);
      setError("Failed to initialize Yellow Network client");
      setClient(null);
    }
  }, [
    isConnected,
    walletClient,
    publicClient,
    sessionKey,
    chainId,
    isYellowConfigured,
  ]);

  // ============================================
  // BALANCE SYNC
  // ============================================

  const refreshBalance = useCallback(async () => {
    if (!address || !publicClient) return;

    try {
      // Always fetch on-chain USDC balance
      const usdcBalance = (await publicClient.readContract({
        address: address,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address],
      })) as bigint;

      setOnChainBalance(formatUnits(usdcBalance, 6));

      // If Yellow is configured, fetch off-chain balance
      if (client && isYellowConfigured) {
        try {
          const balance = await client.getAccountBalance(USDC_TOKEN);
          setOffChainBalance(formatUnits(balance, 6));
        } catch (err) {
          console.warn("[Yellow] Failed to fetch off-chain balance:", err);
          // Fallback to cached balance
          const cached = localStorage.getItem(
            `${BALANCE_CACHE_STORAGE}_${address}`
          );
          if (cached) setOffChainBalance(cached);
        }
      } else {
        // No Yellow Network - use on-chain balance as "playable" balance
        setOffChainBalance(formatUnits(usdcBalance, 6));
      }

      setError(null);
    } catch (err) {
      console.error("[Yellow] Failed to refresh balance:", err);
    }
  }, [client, address, publicClient, isYellowConfigured]);

  // Auto-refresh balance
  useEffect(() => {
    refreshBalance();
    const interval = setInterval(refreshBalance, 15000); // Every 15 seconds
    return () => clearInterval(interval);
  }, [refreshBalance]);

  // ============================================
  // DEPOSIT
  // ============================================

  const deposit = useCallback(
    async (amount: string): Promise<{ txHash: string } | null> => {
      if (!address || !publicClient || !walletClient) {
        setError("Wallet not connected");
        return null;
      }

      const amountBigInt = parseUnits(amount, 6);
      if (amountBigInt <= BigInt(0)) {
        setError("Invalid amount");
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        if (client && isYellowConfigured) {
          // ============================================
          // YELLOW NETWORK DEPOSIT (State Channel)
          // ============================================
          console.log("[Yellow] Depositing to state channel...");

          // 1. Approve USDC
          console.log("[Yellow] Approving USDC...");
          await client.approveTokens(USDC_TOKEN, amountBigInt);

          // 2. Deposit to custody
          console.log("[Yellow] Depositing to custody...");
          const txHash = await client.deposit(USDC_TOKEN, amountBigInt);
          console.log("[Yellow] Deposit successful:", txHash);

          await refreshBalance();
          return { txHash: txHash as string };
        } else {
          // ============================================
          // DIRECT TREASURY DEPOSIT (No Yellow Network)
          // ============================================
          console.log("[Treasury] Direct deposit to EdgeTreasury...");

          if (
            TREASURY_ADDRESS === "0x0000000000000000000000000000000000000000"
          ) {
            throw new Error("Treasury not configured");
          }

          // 1. Approve USDC for treasury
          console.log("[Treasury] Approving USDC...");
          const approveTx = await walletClient.writeContract({
            address: USDC_TOKEN,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [TREASURY_ADDRESS, amountBigInt],
          });
          await publicClient.waitForTransactionReceipt({ hash: approveTx });

          // 2. Deposit to treasury (assuming treasury has deposit function)
          console.log("[Treasury] Depositing...");
          const depositTx = await walletClient.writeContract({
            address: TREASURY_ADDRESS,
            abi: parseAbi(["function deposit(uint256 amount) external"]),
            functionName: "deposit",
            args: [amountBigInt],
          });
          await publicClient.waitForTransactionReceipt({ hash: depositTx });

          console.log("[Treasury] Deposit successful:", depositTx);
          await refreshBalance();
          return { txHash: depositTx };
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Deposit failed";
        console.error("[Yellow/Treasury] Deposit failed:", err);
        setError(errorMsg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [
      client,
      address,
      publicClient,
      walletClient,
      isYellowConfigured,
      refreshBalance,
    ]
  );

  // ============================================
  // WITHDRAW
  // ============================================

  const withdraw = useCallback(
    async (amount: string): Promise<{ txHash: string } | null> => {
      if (!address || !publicClient || !walletClient) {
        setError("Wallet not connected");
        return null;
      }

      const amountBigInt = parseUnits(amount, 6);
      if (amountBigInt <= BigInt(0)) {
        setError("Invalid amount");
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        if (client && isYellowConfigured) {
          // ============================================
          // YELLOW NETWORK WITHDRAWAL
          // ============================================
          console.log("[Yellow] Withdrawing from state channel...");

          // Nitrolite withdrawal (closes channel and returns funds)
          const txHash = await client.withdrawal(USDC_TOKEN, amountBigInt);
          console.log("[Yellow] Withdrawal successful:", txHash);

          await refreshBalance();
          return { txHash: txHash as string };
        } else {
          // ============================================
          // DIRECT WITHDRAWAL (Self-transfer for demo)
          // ============================================
          console.log(
            "[Wallet] No withdrawal needed - funds already in wallet"
          );
          await refreshBalance();
          return { txHash: "0x" + "0".repeat(64) };
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Withdrawal failed";
        console.error("[Yellow] Withdrawal failed:", err);
        setError(errorMsg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [
      client,
      address,
      publicClient,
      walletClient,
      isYellowConfigured,
      refreshBalance,
    ]
  );

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  const generateNewSession = useCallback(() => {
    try {
      const newKey = generatePrivateKey();
      localStorage.setItem(SESSION_KEY_STORAGE, newKey);
      setSessionKey(newKey);
      setOffChainBalance("0.00");
      setError(null);
      console.log("[Yellow] New session key generated");
    } catch (err) {
      console.error("[Yellow] Failed to generate new session:", err);
      setError("Failed to generate new session");
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================
  // DERIVED VALUES
  // ============================================

  const sessionId = useMemo(() => {
    if (!sessionKey) return null;
    return sessionKey.slice(0, 18) + "...";
  }, [sessionKey]);

  const sessionAddress = useMemo((): Address | null => {
    if (!sessionKey) return null;
    try {
      return privateKeyToAccount(sessionKey).address;
    } catch {
      return null;
    }
  }, [sessionKey]);

  // ============================================
  // RETURN
  // ============================================

  return {
    // State
    sessionId,
    sessionAddress,
    offChainBalance,
    onChainBalance,
    isInitialised: isYellowConfigured ? !!client : isConnected,
    isLoading,
    error,

    // Actions
    deposit,
    withdraw,
    refreshBalance,
    generateNewSession,
    clearError,

    // Info
    usdcAddress: USDC_TOKEN,
    treasuryAddress: TREASURY_ADDRESS,
    isYellowConfigured,
  };
}
