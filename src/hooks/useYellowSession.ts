/**
 * Edge60 Frontend - Yellow Network Session Hook
 * 
 * Manages off-chain state channels using Yellow Network SDK
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWalletClient, usePublicClient, useAccount, useChainId } from 'wagmi';
import { NitroliteClient, SessionKeyStateSigner } from '@erc7824/nitrolite';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { Address, parseUnits, formatUnits, Hex } from 'viem';

// Constants for Yellow Network (Base Sepolia defaults)
const DEFAULT_ADJUDICATOR = process.env.NEXT_PUBLIC_YELLOW_ADJUDICATOR as Address || '0x0000000000000000000000000000000000000000';
const DEFAULT_CUSTODY = process.env.NEXT_PUBLIC_YELLOW_CUSTODY as Address || '0x0000000000000000000000000000000000000000';
const USDC_TOKEN = process.env.NEXT_PUBLIC_USDC_ADDRESS as Address || '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Base Sepolia USDC

export interface YellowSession {
  sessionId: string | null;
  offChainBalance: string;
  isInitialised: boolean;
  deposit: (amount: string) => Promise<void>;
  generateNewSession: () => void;
  isLoading: boolean;
}

export function useYellowSession(): YellowSession {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const chainId = useChainId();

  const [sessionKey, setSessionKey] = useState<Hex | null>(null);
  const [offChainBalance, setOffChainBalance] = useState<string>("0.0");
  const [client, setClient] = useState<NitroliteClient | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load or generate session key
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let key = localStorage.getItem('edge60_yellow_session_key') as Hex;
    if (!key) {
      key = generatePrivateKey();
      localStorage.setItem('edge60_yellow_session_key', key);
    }
    setSessionKey(key);
  }, []);

  // Initialize Nitrolite Client
  useEffect(() => {
    if (!isConnected || !walletClient || !publicClient || !sessionKey) {
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
        challengeDuration: BigInt(3600), // 1 hour (minimum required)
        addresses: {
          adjudicator: DEFAULT_ADJUDICATOR,
          custody: DEFAULT_CUSTODY,
        }
      });

      setClient(nitroliteClient);
      console.log("[Yellow] Client initialized with session key:", stateSigner.getAddress());
    } catch (error) {
      console.error("[Yellow] Failed to initialize client:", error);
    }
  }, [isConnected, walletClient, publicClient, sessionKey, chainId]);

  // Sync balance
  const refreshBalance = useCallback(async () => {
    if (!client || !address) return;
    
    // Check if contract addresses are configured. If not, fallback to mock balance.
    if (DEFAULT_ADJUDICATOR === '0x0000000000000000000000000000000000000000') {
      const mockBalance = localStorage.getItem(`edge60_mock_balance_${address}`) || "0.0";
      setOffChainBalance(mockBalance);
      return;
    }
    
    try {
      const balance = await client.getAccountBalance(USDC_TOKEN);
      setOffChainBalance(formatUnits(balance, 6)); // USDC 6 decimals
    } catch (error) {
      console.error("[Yellow] Failed to fetch balance:", error);
    //   // Fallback/Mock - for demo purposes if contract addresses are 0x0
    //   if (DEFAULT_ADJUDICATOR === '0x0000000000000000000000000000000000000000') {
    //     const mockBalance = localStorage.getItem(`edge60_mock_balance_${address}`) || "0.0";
    //     setOffChainBalance(mockBalance);
    //   }
    }
  }, [client, address]);

  useEffect(() => {
    refreshBalance();
    const interval = setInterval(refreshBalance, 10000);
    return () => clearInterval(interval);
  }, [refreshBalance]);

  const deposit = useCallback(async (amount: string) => {
    if (!client || !address) throw new Error("Client not initialized");
    
    setIsLoading(true);
    try {
      const amountBigInt = parseUnits(amount, 6);
      
      // 1. Approve
      console.log("[Yellow] Approving USDC...");
      await client.approveTokens(USDC_TOKEN, amountBigInt);
      
      // 2. Deposit
      console.log("[Yellow] Depositing USDC into state channel...");
      const hash = await client.deposit(USDC_TOKEN, amountBigInt);
      console.log("[Yellow] Deposit successful:", hash);
      
      await refreshBalance();
    } catch (error) {
      console.error("[Yellow] Deposit failed:", error);
      // For demo/stub purposes if on-chain fails (e.g. 0x0 addresses)
      if (DEFAULT_ADJUDICATOR === '0x0000000000000000000000000000000000000000') {
        const currentMock = parseFloat(localStorage.getItem(`edge60_mock_balance_${address}`) || "0.0");
        const newMock = (currentMock + parseFloat(amount)).toString();
        localStorage.setItem(`edge60_mock_balance_${address}`, newMock);
        setOffChainBalance(newMock);
        console.log("[Yellow] Stub Deposit updated mock balance:", newMock);
      } else {
        throw error;
      }
    } finally {
      setIsLoading(false);
    }
  }, [client, address, refreshBalance]);

  const generateNewSession = useCallback(() => {
    const key = generatePrivateKey();
    localStorage.setItem('edge60_yellow_session_key', key);
    setSessionKey(key);
    console.log("[Yellow] New session key generated");
  }, []);

  const sessionId = useMemo(() => {
    if (!sessionKey) return null;
    return privateKeyToAccount(sessionKey).address;
  }, [sessionKey]);

  return {
    sessionId,
    offChainBalance,
    isInitialised: !!client,
    deposit,
    generateNewSession,
    isLoading
  };
}
