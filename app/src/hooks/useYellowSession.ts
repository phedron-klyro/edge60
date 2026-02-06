/**
 * Edge60 Frontend - Yellow Network Session Hook
 *
 * Implementation based on Agentropolis pattern:
 * - Uses NitroliteClient for on-chain deposits (approveTokens + deposit)
 * - Mock mode available for demo without real tokens
 */

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { Hex, Address, parseUnits } from "viem";
import { NitroliteClient, WalletStateSigner } from "@erc7824/nitrolite";

// Yellow Network contract addresses (Base Sepolia)
const YELLOW_CUSTODY =
  (process.env.NEXT_PUBLIC_YELLOW_CUSTODY as Address) ||
  "0x019B65A265EB3363822f2752141b3dF16131b262";

// ytest.USD token for sandbox
const YTEST_USD_TOKEN =
  (process.env.NEXT_PUBLIC_YELLOW_TOKEN_ADDRESS as Address) ||
  "0xDB9F293e3898c9E5536A3be1b0C56c89d2b32DEb";

// Set to true for demo mode (no real transactions)
const MOCK_MODE = true;

// Chain ID for Base Sepolia
const CHAIN_ID = 84532;

export interface YellowSession {
  sessionId: string | null;
  offChainBalance: string;
  isInitialised: boolean;
  isConnected: boolean;
  isAuthenticated: boolean;
  deposit: (amount: string) => Promise<void>;
  generateNewSession: () => void;
  isLoading: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export function useYellowSession(): YellowSession {
  const { address, isConnected: walletConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [sessionKey, setSessionKey] = useState<Hex | null>(null);
  const [offChainBalance, setOffChainBalance] = useState<string>("0.0");
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [clientReady, setClientReady] = useState(false);

  const clientRef = useRef<NitroliteClient | null>(null);

  // Load or generate session key
  useEffect(() => {
    if (typeof window === "undefined") return;

    let key = localStorage.getItem("edge60_yellow_session_key") as Hex;
    if (!key) {
      key = generatePrivateKey();
      localStorage.setItem("edge60_yellow_session_key", key);
    }
    setSessionKey(key);
  }, []);

  // Load balance from localStorage on mount
  useEffect(() => {
    if (!address) return;
    const savedBalance =
      localStorage.getItem(`edge60_yellow_balance_${address}`) || "0.0";
    setOffChainBalance(savedBalance);
  }, [address]);

  // Initialize NitroliteClient
  useEffect(() => {
    if (!walletClient || !publicClient || !walletClient.account) {
      clientRef.current = null;
      return;
    }

    try {
      const stateSigner = new WalletStateSigner(walletClient as any);

      const client = new NitroliteClient({
        publicClient,
        walletClient: walletClient as any,
        stateSigner,
        chainId: CHAIN_ID,
        challengeDuration: BigInt(86400), // 1 day
        addresses: {
          custody: YELLOW_CUSTODY,
          adjudicator: YELLOW_CUSTODY, // Using same address as Agentropolis
        },
      });

      clientRef.current = client;
      setClientReady(true);
      console.log("[Yellow] NitroliteClient initialized");
    } catch (error) {
      console.error("[Yellow] Failed to initialize client:", error);
      clientRef.current = null;
      setClientReady(false);
    }
  }, [walletClient, publicClient]);

  // Connect to Yellow Network
  const connect = useCallback(async () => {
    if (!address) {
      console.error("[Yellow] Wallet not connected");
      return;
    }

    setIsLoading(true);

    try {
      if (MOCK_MODE) {
        console.log("[Yellow] Connecting in mock mode...");
        await new Promise((r) => setTimeout(r, 500));
      } else {
        console.log("[Yellow] Connecting with NitroliteClient...");
        // Client is already initialized via useEffect
        if (!clientRef.current) {
          throw new Error("NitroliteClient not initialized");
        }
        await new Promise((r) => setTimeout(r, 500));
      }

      setIsConnected(true);
      setIsAuthenticated(true);
      console.log("[Yellow] Connection successful");
    } catch (error) {
      console.error("[Yellow] Connection failed:", error);
      setIsConnected(false);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Disconnect
  const disconnect = useCallback(() => {
    setIsConnected(false);
    setIsAuthenticated(false);
    console.log("[Yellow] Disconnected");
  }, []);

  // Deposit
  const deposit = useCallback(
    async (amount: string) => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      setIsLoading(true);
      try {
        const amountWei = parseUnits(amount, 6); // ytest.USD has 6 decimals

        if (MOCK_MODE) {
          // Mock deposit
          console.log(`[Yellow] Mock depositing ${amount} ytest.USD...`);
          await new Promise((r) => setTimeout(r, 1000));

          const currentBalance = parseFloat(offChainBalance);
          const newBalance = (currentBalance + parseFloat(amount)).toFixed(2);

          localStorage.setItem(`edge60_yellow_balance_${address}`, newBalance);
          setOffChainBalance(newBalance);
          console.log("[Yellow] Mock deposit successful:", newBalance);
        } else {
          // Real deposit using NitroliteClient
          if (!clientRef.current) {
            throw new Error("NitroliteClient not initialized");
          }

          console.log(`[Yellow] Approving ${amount} ytest.USD...`);
          await clientRef.current.approveTokens(YTEST_USD_TOKEN, amountWei);
          console.log("[Yellow] Approval complete");

          console.log(`[Yellow] Depositing ${amount} ytest.USD...`);
          const txHash = await clientRef.current.deposit(YTEST_USD_TOKEN, amountWei);
          console.log("[Yellow] Deposit complete:", txHash);

          // Update balance
          const currentBalance = parseFloat(offChainBalance);
          const newBalance = (currentBalance + parseFloat(amount)).toFixed(2);
          localStorage.setItem(`edge60_yellow_balance_${address}`, newBalance);
          setOffChainBalance(newBalance);
        }
      } catch (error) {
        console.error("[Yellow] Deposit failed:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [address, offChainBalance]
  );

  const generateNewSession = useCallback(() => {
    const key = generatePrivateKey();
    localStorage.setItem("edge60_yellow_session_key", key);
    setSessionKey(key);
    disconnect();
    console.log("[Yellow] New session key generated");
  }, [disconnect]);

  const sessionId = useMemo(() => {
    if (!sessionKey) return null;
    return privateKeyToAccount(sessionKey).address;
  }, [sessionKey]);

  // Auto-connect when wallet is connected and client is ready
  useEffect(() => {
    if (MOCK_MODE) {
      // Mock mode doesn't need client
      if (walletConnected && !isConnected && !isLoading) {
        connect();
      }
    } else {
      // Real mode needs client to be ready
      if (walletConnected && clientReady && !isConnected && !isLoading) {
        connect();
      }
    }
  }, [walletConnected, clientReady, isConnected, isLoading, connect]);

  return {
    sessionId,
    offChainBalance,
    isInitialised: isAuthenticated,
    isConnected,
    isAuthenticated,
    deposit,
    generateNewSession,
    isLoading,
    connect,
    disconnect,
  };
}
