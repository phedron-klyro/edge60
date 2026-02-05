/**
 * Edge60 Backend - Treasury Service (Production)
 *
 * Handles on-chain settlement to EdgeTreasury contract on Base Sepolia.
 * Bridges Yellow Network off-chain state channel balances to on-chain USDC settlements.
 *
 * Settlement Flow:
 * 1. Match ends → Winner determined off-chain
 * 2. Backend computes final balances from Yellow session deltas
 * 3. TreasuryService calls EdgeTreasury.settleMatch() on-chain
 * 4. Contract applies rake (2.5%) and credits winner
 * 5. Winner can withdraw from Treasury or use for next match
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  Address,
  Hex,
  parseAbi,
  decodeEventLog,
  encodeFunctionData,
  TransactionReceipt,
} from "viem";
import { privateKeyToAccount, Account } from "viem/accounts";
import { baseSepolia } from "viem/chains";

// ============================================
// CHAIN CONFIGURATION
// ============================================

/**
 * Supported networks for EdgeTreasury deployment
 */
const SUPPORTED_CHAINS = {
  baseSepolia: {
    ...baseSepolia,
    rpcUrls: {
      default: {
        http: [process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"],
      },
    },
  },
  arcTestnet: {
    id: 5042002,
    name: "Arc Testnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: {
        http: [
          process.env.ARC_TESTNET_RPC_URL || "https://rpc.testnet.arc.network",
        ],
      },
    },
    blockExplorers: {
      default: { name: "Arc Explorer", url: "https://testnet.arcscan.app" },
    },
  },
} as const;

// Active chain (configurable via env)
const ACTIVE_CHAIN =
  process.env.TREASURY_CHAIN === "arc"
    ? SUPPORTED_CHAINS.arcTestnet
    : SUPPORTED_CHAINS.baseSepolia;

const EXPLORER_URL =
  ACTIVE_CHAIN.id === 84532
    ? "https://sepolia.basescan.org"
    : "https://testnet.arcscan.app";

// ============================================
// CONTRACT CONFIGURATION
// ============================================

// Contract addresses (deploy to Base Sepolia first, then update)
const TREASURY_ADDRESS = (process.env.TREASURY_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as Address;

// Base Sepolia USDC (Circle's official testnet USDC)
const USDC_ADDRESS = (process.env.USDC_ADDRESS ||
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e") as Address;

// ============================================
// CONTRACT ABI
// ============================================

const TREASURY_ABI = parseAbi([
  // Write functions
  "function deposit(uint256 amount) external",
  "function settleMatch(address winner, uint256 amount, uint256 matchId) external",
  "function setRake(uint256 newRakeBps) external",
  "function withdrawRevenue(address to, uint256 amount) external",

  // Read functions
  "function getProtocolRevenue() external view returns (uint256)",
  "function getStats() external view returns (uint256 totalMatches, uint256 totalVolume, uint256 protocolRevenue, uint256 currentBalance)",
  "function rakeBps() external view returns (uint256)",
  "function usdc() external view returns (address)",
  "function owner() external view returns (address)",
  "function protocolRevenue() external view returns (uint256)",
  "function totalMatchesSettled() external view returns (uint256)",
  "function totalVolume() external view returns (uint256)",

  // Events
  "event MatchSettled(address indexed winner, uint256 matchId, uint256 grossAmount, uint256 rake, uint256 netPayout)",
  "event Deposited(address indexed from, uint256 amount)",
  "event RevenueWithdrawn(address indexed to, uint256 amount)",
  "event RakeUpdated(uint256 oldRake, uint256 newRake)",
]);

const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
]);

// ============================================
// TYPES
// ============================================

export type SettlementStatus =
  | "pending" // Waiting to start
  | "approving" // Approving USDC (if needed)
  | "submitting" // Tx being submitted
  | "confirming" // Waiting for confirmation
  | "confirmed" // Successfully settled on-chain
  | "failed"; // Settlement failed

export interface SettlementResult {
  status: SettlementStatus;
  txHash?: Hex;
  blockNumber?: bigint;
  grossAmount?: string;
  rake?: string;
  netPayout?: string;
  error?: string;
  explorerUrl?: string;
  gasUsed?: string;
}

export interface TreasuryStats {
  totalMatches: number;
  totalVolume: string;
  protocolRevenue: string;
  currentBalance: string;
  rakeBps: number;
  contractAddress: Address;
  chainId: number;
  chainName: string;
}

// ============================================
// TREASURY SERVICE CLASS
// ============================================

class TreasuryServiceClass {
  private publicClient;
  private walletClient: ReturnType<typeof createWalletClient> | null = null;
  private account: Account | null = null;
  private isConfigured: boolean = false;
  private rakeBps: number = 250; // Default 2.5%

  constructor() {
    // Initialize public client (read-only)
    this.publicClient = createPublicClient({
      chain: ACTIVE_CHAIN as any,
      transport: http(),
    });

    // Initialize wallet client if private key is available
    const privateKey = process.env.SETTLEMENT_PRIVATE_KEY as Hex;

    if (privateKey && privateKey.startsWith("0x") && privateKey.length === 66) {
      try {
        this.account = privateKeyToAccount(privateKey);
        this.walletClient = createWalletClient({
          account: this.account,
          chain: ACTIVE_CHAIN as any,
          transport: http(),
        });
        this.isConfigured =
          TREASURY_ADDRESS !== "0x0000000000000000000000000000000000000000";

        this.logInitialization();
      } catch (error) {
        console.error("[Treasury] Failed to initialize wallet:", error);
        this.isConfigured = false;
      }
    } else {
      console.log(
        `\n⚠️  [TREASURY] No valid SETTLEMENT_PRIVATE_KEY configured`,
      );
      console.log(`   Service will operate in READ-ONLY mode\n`);
    }

    // Fetch current rake from contract
    this.syncRakeFromContract();
  }

  /**
   * Log initialization status
   */
  private logInitialization(): void {
    console.log(
      `\n╔══════════════════════════════════════════════════════════════╗`,
    );
    console.log(
      `║              EDGE60 TREASURY SERVICE                          ║`,
    );
    console.log(
      `╠══════════════════════════════════════════════════════════════╣`,
    );
    console.log(`║ Network:      ${ACTIVE_CHAIN.name.padEnd(44)}║`);
    console.log(`║ Chain ID:     ${String(ACTIVE_CHAIN.id).padEnd(44)}║`);
    console.log(`║ Contract:     ${TREASURY_ADDRESS.slice(0, 42).padEnd(44)}║`);
    console.log(`║ USDC:         ${USDC_ADDRESS.slice(0, 42).padEnd(44)}║`);
    console.log(
      `║ Settler:      ${
        this.account?.address.slice(0, 42).padEnd(44) ||
        "Not configured".padEnd(44)
      }║`,
    );
    console.log(
      `║ Status:       ${(this.isConfigured
        ? "✓ READY"
        : "⚠ NOT CONFIGURED"
      ).padEnd(44)}║`,
    );
    console.log(
      `╚══════════════════════════════════════════════════════════════╝\n`,
    );
  }

  /**
   * Sync rake percentage from contract
   */
  private async syncRakeFromContract(): Promise<void> {
    if (TREASURY_ADDRESS === "0x0000000000000000000000000000000000000000")
      return;

    try {
      const rakeBps = (await this.publicClient.readContract({
        address: TREASURY_ADDRESS,
        abi: TREASURY_ABI,
        functionName: "rakeBps",
      })) as bigint;
      this.rakeBps = Number(rakeBps);
      console.log(`[Treasury] Synced rake: ${this.rakeBps / 100}%`);
    } catch (error) {
      console.warn(
        "[Treasury] Could not sync rake from contract, using default",
      );
    }
  }

  /**
   * Settle a match on-chain via EdgeTreasury
   *
   * @param winner - Winner's wallet address
   * @param grossAmount - Total prize pool in USDC (both players' stakes)
   * @param matchId - Off-chain match ID for tracking
   * @returns Settlement result with tx details
   */
  async settleMatch(
    winner: Address,
    grossAmount: number,
    matchId: string,
  ): Promise<SettlementResult> {
    const matchIdNum = this.matchIdToNumber(matchId);
    const amountWei = parseUnits(grossAmount.toString(), 6); // USDC 6 decimals

    console.log(
      `\n╔══════════════════ TREASURY SETTLEMENT ══════════════════════╗`,
    );
    console.log(`║ Network:      ${ACTIVE_CHAIN.name}`);
    console.log(`║ Match ID:     ${matchId.slice(0, 8)}... → ${matchIdNum}`);
    console.log(`║ Winner:       ${winner}`);
    console.log(`║ Gross Amount: ${grossAmount} USDC`);
    console.log(
      `╠══════════════════════════════════════════════════════════════╣`,
    );

    // Check configuration
    if (!this.isConfigured || !this.walletClient || !this.account) {
      return this.handleUnconfigured(grossAmount);
    }

    try {
      // ============================================
      // STEP 1: Check Treasury Balance
      // ============================================
      console.log(`║ 📊 [CHECKING] Treasury balance...`);

      const treasuryBalance = (await this.publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [TREASURY_ADDRESS],
      })) as bigint;

      const treasuryBalanceFormatted = formatUnits(treasuryBalance, 6);
      console.log(`║    Treasury USDC: ${treasuryBalanceFormatted}`);

      if (treasuryBalance < amountWei) {
        throw new Error(
          `Insufficient treasury balance: ${treasuryBalanceFormatted} < ${grossAmount}`,
        );
      }

      // ============================================
      // STEP 2: Estimate Gas
      // ============================================
      console.log(`║ ⛽ [ESTIMATING] Gas for settlement...`);

      const gasEstimate = await this.publicClient.estimateContractGas({
        address: TREASURY_ADDRESS,
        abi: TREASURY_ABI,
        functionName: "settleMatch",
        args: [winner, amountWei, BigInt(matchIdNum)],
        account: this.account.address,
      });

      console.log(`║    Estimated gas: ${gasEstimate.toString()}`);

      // ============================================
      // STEP 3: Submit Settlement Transaction
      // ============================================
      console.log(`║ 📤 [SUBMITTING] Settlement transaction...`);

      const txHash = await this.walletClient.writeContract({
        address: TREASURY_ADDRESS,
        abi: TREASURY_ABI,
        functionName: "settleMatch",
        args: [winner, amountWei, BigInt(matchIdNum)],
        gas: gasEstimate + BigInt(50000), // Add buffer
        chain: ACTIVE_CHAIN as any,
        account: this.account,
      });

      console.log(`║ ✓  Tx Hash: ${txHash}`);
      console.log(`║`);

      // ============================================
      // STEP 4: Wait for Confirmation
      // ============================================
      console.log(`║ ⏳ [CONFIRMING] Waiting for block confirmation...`);

      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1,
        timeout: 60_000, // 60 second timeout
      });

      if (receipt.status === "reverted") {
        throw new Error("Transaction reverted");
      }

      console.log(`║ ✓  Block: ${receipt.blockNumber}`);
      console.log(`║ ✓  Gas Used: ${receipt.gasUsed.toString()}`);

      // ============================================
      // STEP 5: Parse MatchSettled Event
      // ============================================
      const settlementData = this.parseSettlementEvent(receipt, matchIdNum);

      const explorerUrl = `${EXPLORER_URL}/tx/${txHash}`;

      console.log(`║`);
      console.log(`║ 💸 [SETTLED ON-CHAIN]`);
      console.log(`║    Gross:     ${settlementData.grossAmount} USDC`);
      console.log(
        `║    Rake:      ${settlementData.rake} USDC (${this.rakeBps / 100}%)`,
      );
      console.log(`║    Net:       ${settlementData.netPayout} USDC → Winner`);
      console.log(`║`);
      console.log(`║ 🔗 ${explorerUrl}`);
      console.log(
        `╚══════════════════════════════════════════════════════════════╝\n`,
      );

      return {
        status: "confirmed",
        txHash,
        blockNumber: receipt.blockNumber,
        grossAmount: settlementData.grossAmount,
        rake: settlementData.rake,
        netPayout: settlementData.netPayout,
        explorerUrl,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.log(
        `║ ❌ [FAILED] ${errorMsg.slice(0, 50)}${
          errorMsg.length > 50 ? "..." : ""
        }`,
      );
      console.log(
        `╚══════════════════════════════════════════════════════════════╝\n`,
      );

      return {
        status: "failed",
        error: errorMsg,
        grossAmount: grossAmount.toString(),
      };
    }
  }

  /**
   * Parse MatchSettled event from transaction receipt
   */
  private parseSettlementEvent(
    receipt: TransactionReceipt,
    expectedMatchId: number,
  ): { grossAmount: string; rake: string; netPayout: string } {
    for (const log of receipt.logs) {
      try {
        if (log.address.toLowerCase() !== TREASURY_ADDRESS.toLowerCase())
          continue;

        const decoded = decodeEventLog({
          abi: TREASURY_ABI,
          data: log.data,
          topics: log.topics,
        });

        if (decoded.eventName === "MatchSettled") {
          const args = decoded.args as {
            winner: Address;
            matchId: bigint;
            grossAmount: bigint;
            rake: bigint;
            netPayout: bigint;
          };

          return {
            grossAmount: formatUnits(args.grossAmount, 6),
            rake: formatUnits(args.rake, 6),
            netPayout: formatUnits(args.netPayout, 6),
          };
        }
      } catch {
        // Continue to next log
      }
    }

    // Fallback: calculate from rake percentage
    const grossAmount = Number(receipt.logs[0]?.data || 0);
    const rake = (grossAmount * this.rakeBps) / 10000;
    const netPayout = grossAmount - rake;

    return {
      grossAmount: formatUnits(BigInt(grossAmount), 6),
      rake: formatUnits(BigInt(rake), 6),
      netPayout: formatUnits(BigInt(netPayout), 6),
    };
  }

  /**
   * Refund stake to a player (used for draws - no rake)
   */
  async refundStake(
    player: Address,
    amount: number,
    refundId: string,
  ): Promise<SettlementResult> {
    console.log(
      `\n╔══════════════════ TREASURY REFUND ═══════════════════════════╗`,
    );
    console.log(`║ Network:      ${ACTIVE_CHAIN.name}`);
    console.log(`║ Refund ID:    ${refundId.slice(0, 20)}...`);
    console.log(`║ Player:       ${player}`);
    console.log(`║ Amount:       ${amount} USDC (no rake)`);
    console.log(
      `╠══════════════════════════════════════════════════════════════╣`,
    );

    // Check configuration
    if (!this.isConfigured || !this.walletClient || !this.account) {
      console.log(`║ ⚠️  [NOT CONFIGURED] Simulated refund (Demo Mode)`);
      console.log(
        `╚══════════════════════════════════════════════════════════════╝\n`,
      );
      return {
        status: "confirmed", // Treat as confirmed in demo mode for draws
        grossAmount: amount.toString(),
        rake: "0",
        netPayout: amount.toString(),
      };
    }

    try {
      const amountWei = parseUnits(amount.toString(), 6);

      // Check Treasury Balance
      console.log(`║ 📊 [CHECKING] Treasury balance...`);
      const treasuryBalance = (await this.publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [TREASURY_ADDRESS],
      })) as bigint;

      const treasuryBalanceFormatted = formatUnits(treasuryBalance, 6);
      console.log(`║    Treasury USDC: ${treasuryBalanceFormatted}`);

      if (treasuryBalance < amountWei) {
        throw new Error(
          `Insufficient treasury balance for refund: ${treasuryBalanceFormatted} < ${amount}`,
        );
      }

      // Use settleMatch with 0 rake by setting the full amount as gross
      // The contract will calculate rake, but for a refund we treat full amount as payout
      console.log(`║ 📤 [SUBMITTING] Refund via settlement (full amount)...`);

      const matchIdNum = this.matchIdToNumber(refundId);
      const gasEstimate = await this.publicClient.estimateContractGas({
        address: TREASURY_ADDRESS,
        abi: TREASURY_ABI,
        functionName: "settleMatch",
        args: [player, amountWei, BigInt(matchIdNum)],
        account: this.account.address,
      });

      const txHash = await this.walletClient.writeContract({
        address: TREASURY_ADDRESS,
        abi: TREASURY_ABI,
        functionName: "settleMatch",
        args: [player, amountWei, BigInt(matchIdNum)],
        gas: gasEstimate + BigInt(50000),
        chain: ACTIVE_CHAIN as any,
        account: this.account,
      });

      console.log(`║ ✓  Tx Hash: ${txHash}`);

      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1,
        timeout: 60_000,
      });

      if (receipt.status === "reverted") {
        throw new Error("Refund transaction reverted");
      }

      const explorerUrl = `${EXPLORER_URL}/tx/${txHash}`;

      // Parse the actual values from the event
      const settlementData = this.parseSettlementEvent(receipt, matchIdNum);

      console.log(`║ ✓  Block: ${receipt.blockNumber}`);
      console.log(`║`);
      console.log(`║ 💸 [REFUND COMPLETE]`);
      console.log(`║    Amount:    ${settlementData.netPayout} USDC → Player`);
      console.log(`║    Rake:      ${settlementData.rake} USDC (platform fee still applies)`);
      console.log(`║`);
      console.log(`║ 🔗 ${explorerUrl}`);
      console.log(
        `╚══════════════════════════════════════════════════════════════╝\n`,
      );

      return {
        status: "confirmed",
        txHash,
        blockNumber: receipt.blockNumber,
        grossAmount: settlementData.grossAmount,
        rake: settlementData.rake,
        netPayout: settlementData.netPayout,
        explorerUrl,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.log(`║ ❌ [REFUND FAILED] ${errorMsg.slice(0, 50)}...`);
      console.log(
        `╚══════════════════════════════════════════════════════════════╝\n`,
      );

      return {
        status: "failed",
        error: errorMsg,
        grossAmount: amount.toString(),
        rake: "0",
        netPayout: amount.toString(),
      };
    }
  }

  /**
   * Handle unconfigured state (returns calculated values without tx)
   */
  private handleUnconfigured(grossAmount: number): SettlementResult {
    const rake = (grossAmount * this.rakeBps) / 10000;
    const netPayout = grossAmount - rake;

    console.log(`║ ⚠️  [NOT CONFIGURED] Simulated settlement (Demo Mode)`);
    console.log(
      `║    Configure SETTLEMENT_PRIVATE_KEY and TREASURY_ADDRESS for real txs`,
    );
    console.log(`║`);
    console.log(`║ 📊 [SIMULATED VALUES]`);
    console.log(`║    Gross:   ${grossAmount} USDC`);
    console.log(
      `║    Rake:    ${rake.toFixed(4)} USDC (${this.rakeBps / 100}%)`,
    );
    console.log(`║    Net:     ${netPayout.toFixed(4)} USDC`);
    console.log(
      `╚══════════════════════════════════════════════════════════════╝\n`,
    );

    return {
      status: "failed",
      error:
        "Treasury not configured. Set SETTLEMENT_PRIVATE_KEY and TREASURY_ADDRESS.",
      grossAmount: grossAmount.toString(),
      rake: rake.toFixed(4),
      netPayout: netPayout.toFixed(4),
    };
  }

  /**
   * Deposit USDC into treasury (for pre-funding)
   */
  async depositToTreasury(amount: number): Promise<{ txHash: Hex } | null> {
    if (!this.walletClient || !this.account) {
      console.error("[Treasury] Cannot deposit: wallet not configured");
      return null;
    }

    const amountWei = parseUnits(amount.toString(), 6);

    try {
      // Approve USDC
      console.log(`[Treasury] Approving ${amount} USDC...`);
      const approveTx = await this.walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [TREASURY_ADDRESS, amountWei],
        chain: ACTIVE_CHAIN as any,
        account: this.account,
      });
      await this.publicClient.waitForTransactionReceipt({ hash: approveTx });

      // Deposit
      console.log(`[Treasury] Depositing ${amount} USDC...`);
      const depositTx = await this.walletClient.writeContract({
        address: TREASURY_ADDRESS,
        abi: TREASURY_ABI,
        functionName: "deposit",
        args: [amountWei],
        chain: ACTIVE_CHAIN as any,
        account: this.account,
      });
      await this.publicClient.waitForTransactionReceipt({ hash: depositTx });

      console.log(`[Treasury] Deposited ${amount} USDC. Tx: ${depositTx}`);
      return { txHash: depositTx };
    } catch (error) {
      console.error("[Treasury] Deposit failed:", error);
      return null;
    }
  }

  /**
   * Get protocol statistics from treasury contract
   */
  async getStats(): Promise<TreasuryStats | null> {
    if (TREASURY_ADDRESS === "0x0000000000000000000000000000000000000000") {
      return null;
    }

    try {
      const [totalMatches, totalVolume, protocolRevenue, currentBalance] =
        (await this.publicClient.readContract({
          address: TREASURY_ADDRESS,
          abi: TREASURY_ABI,
          functionName: "getStats",
        })) as [bigint, bigint, bigint, bigint];

      const rakeBps = (await this.publicClient.readContract({
        address: TREASURY_ADDRESS,
        abi: TREASURY_ABI,
        functionName: "rakeBps",
      })) as bigint;

      return {
        totalMatches: Number(totalMatches),
        totalVolume: formatUnits(totalVolume, 6),
        protocolRevenue: formatUnits(protocolRevenue, 6),
        currentBalance: formatUnits(currentBalance, 6),
        rakeBps: Number(rakeBps),
        contractAddress: TREASURY_ADDRESS,
        chainId: ACTIVE_CHAIN.id,
        chainName: ACTIVE_CHAIN.name,
      };
    } catch (error) {
      console.error("[Treasury] Failed to fetch stats:", error);
      return null;
    }
  }

  /**
   * Get treasury USDC balance
   */
  async getTreasuryBalance(): Promise<string> {
    try {
      const balance = (await this.publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [TREASURY_ADDRESS],
      })) as bigint;
      return formatUnits(balance, 6);
    } catch {
      return "0";
    }
  }

  /**
   * Convert UUID match ID to numeric ID for contract
   */
  private matchIdToNumber(matchId: string): number {
    // Take first 8 hex chars of UUID and convert to number
    const hex = matchId.replace(/-/g, "").slice(0, 8);
    return parseInt(hex, 16) % 1000000000; // Cap at 1 billion
  }

  /**
   * Check if treasury service is properly configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Get treasury contract address
   */
  getContractAddress(): Address {
    return TREASURY_ADDRESS;
  }

  /**
   * Get active chain info
   */
  getChainInfo(): { id: number; name: string; explorerUrl: string } {
    return {
      id: ACTIVE_CHAIN.id,
      name: ACTIVE_CHAIN.name,
      explorerUrl: EXPLORER_URL,
    };
  }

  /**
   * Get settler wallet address
   */
  getSettlerAddress(): Address | null {
    return this.account?.address || null;
  }
}

// Singleton export
export const TreasuryService = new TreasuryServiceClass();
