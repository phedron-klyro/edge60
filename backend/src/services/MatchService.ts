/**
 * Edge60 Backend - Match Service
 * 
 * Core match lifecycle logic and state machine
 * WAITING → ACTIVE → COMPLETED → SETTLED
 * 
 * Enhanced with real ETH/USD price fetching
 */

import { v4 as uuidv4 } from "uuid";
import { Match, MatchStatus, Prediction } from "../types/index.js";
import { MatchStore, PlayerStore } from "../stores/index.js";
import { PriceService } from "./PriceService.js";

// ============================================
// CONFIGURATION
// ============================================

const DEFAULT_DURATION = 60; // seconds
const DEFAULT_STAKE = 1; // 1 USDC fixed stake
const DEFAULT_ASSET = "ETH/USD";

/**
 * Match Service - handles all match logic
 * Backend is authoritative for all game decisions
 */
export class MatchService {
  // Track active timers for cleanup
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Create a new match with Player A
   */
  createMatch(playerA: string, stake: number = DEFAULT_STAKE): Match {
    const match: Match = {
      id: uuidv4(),
      playerA,
      playerB: null,
      stake: DEFAULT_STAKE, // Fixed stake for now
      status: MatchStatus.WAITING,
      startTime: null,
      endTime: null,
      duration: DEFAULT_DURATION,
      winner: null,
      predictionA: null,
      predictionB: null,
      asset: DEFAULT_ASSET,
      startPrice: null,
      endPrice: null,
    };

    MatchStore.create(match);
    PlayerStore.setMatch(playerA, match.id);
    
    console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
    console.log(`║ [MATCH CREATED] ID: ${match.id.slice(0, 8)}...`);
    console.log(`║ Player A: ${playerA}`);
    console.log(`║ Stake: $${match.stake} USDC | Duration: ${match.duration}s`);
    console.log(`╚══════════════════════════════════════════════════════════════╝\n`);
    
    return match;
  }

  /**
   * Add Player B to an existing match
   * Transitions: WAITING → ACTIVE
   * Fetches real T₀ price at match start
   */
  async joinMatch(matchId: string, playerB: string): Promise<Match | null> {
    const match = MatchStore.get(matchId);
    if (!match || match.status !== MatchStatus.WAITING) {
      console.log(`[MatchService] ✗ Cannot join match ${matchId} - invalid state`);
      return null;
    }

    console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
    console.log(`║ [MATCH STARTING] ID: ${matchId.slice(0, 8)}...`);
    console.log(`╠══════════════════════════════════════════════════════════════╣`);

    // ============================================
    // FETCH T₀ PRICE (Real ETH/USD from CoinGecko)
    // ============================================
    console.log(`║ Fetching T₀ price...`);
    const priceData = await PriceService.getEthUsdPrice();
    const startPrice = priceData.price;
    const startTime = Date.now();

    console.log(`║ ✓ T₀ Price: $${startPrice.toFixed(2)} (source: ${priceData.source})`);
    console.log(`║ ✓ Start Time: ${new Date(startTime).toISOString()}`);
    console.log(`║ ✓ Player A: ${match.playerA}`);
    console.log(`║ ✓ Player B: ${playerB}`);
    console.log(`║ ✓ Timer: ${match.duration} seconds`);
    
    // Yellow Network - Off-chain Locking
    const sessionA = PlayerStore.get(match.playerA)?.yellowSessionId;
    const sessionB = PlayerStore.get(playerB)?.yellowSessionId;
    
    console.log(`║`);
    console.log(`║ 🏦 [OFF-CHAIN ESCROW] Locking stakes...`);
    console.log(`║    Player A ${sessionA ? `(Session: ${sessionA.slice(0, 10)}...)` : "(No Session)"}: $${match.stake} USDC`);
    console.log(`║    Player B ${sessionB ? `(Session: ${sessionB.slice(0, 10)}...)` : "(No Session)"}: $${match.stake} USDC`);
    console.log(`║    Total Escrow: $${match.stake * 2} USDC [OFF-CHAIN]`);
    console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

    const updated = MatchStore.update(matchId, {
      playerB,
      status: MatchStatus.ACTIVE,
      startTime,
      startPrice,
    });

    if (updated) {
      PlayerStore.setMatch(playerB, matchId);
      this.startMatchTimer(matchId);
    }

    return updated || null;
  }

  /**
   * Submit a player's prediction
   */
  submitPrediction(
    matchId: string,
    playerId: string,
    prediction: Prediction
  ): boolean {
    const match = MatchStore.get(matchId);
    if (!match || match.status !== MatchStatus.ACTIVE) {
      console.log(`[MatchService] ✗ Cannot submit prediction - match not active`);
      return false;
    }

    const updates: Partial<Match> = {};
    let playerLabel = "";

    if (match.playerA === playerId) {
      updates.predictionA = prediction;
      playerLabel = "A";
    } else if (match.playerB === playerId) {
      updates.predictionB = prediction;
      playerLabel = "B";
    } else {
      console.log(`[MatchService] ✗ Player ${playerId} not in match`);
      return false;
    }

    MatchStore.update(matchId, updates);
    
    console.log(`║ [PREDICTION] Player ${playerLabel} (${playerId.slice(0, 12)}...) → ${prediction}`);
    
    return true;
  }

  /**
   * Start the match timer (60 seconds)
   */
  private startMatchTimer(matchId: string): void {
    const match = MatchStore.get(matchId);
    if (!match) return;

    console.log(`\n⏱️  [TIMER STARTED] Match ${matchId.slice(0, 8)}... (${match.duration}s)`);
    console.log(`   Players have ${match.duration} seconds to submit predictions...\n`);

    const timer = setTimeout(async () => {
      await this.completeMatch(matchId);
    }, match.duration * 1000);

    this.activeTimers.set(matchId, timer);
  }

  /**
   * Complete the match and determine winner
   * Transitions: ACTIVE → COMPLETED
   * Fetches real T₁ price and calculates winner deterministically
   */
  async completeMatch(matchId: string): Promise<Match | null> {
    const match = MatchStore.get(matchId);
    if (!match || match.status !== MatchStatus.ACTIVE) {
      return null;
    }

    // Clear timer
    this.clearTimer(matchId);

    console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
    console.log(`║ [MATCH ENDING] ID: ${matchId.slice(0, 8)}...`);
    console.log(`╠══════════════════════════════════════════════════════════════╣`);

    // ============================================
    // FETCH T₁ PRICE (Fresh price for comparison)
    // ============================================
    console.log(`║ Fetching T₁ price...`);
    const priceData = await PriceService.getFreshPrice();
    const endPrice = priceData.price;
    const endTime = Date.now();

    console.log(`║ ✓ T₀ Price: $${match.startPrice?.toFixed(2)}`);
    console.log(`║ ✓ T₁ Price: $${endPrice.toFixed(2)}`);
    
    // ============================================
    // DETERMINE PRICE MOVEMENT
    // ============================================
    const priceDiff = endPrice - (match.startPrice || 0);
    const priceChangePercent = ((priceDiff / (match.startPrice || 1)) * 100).toFixed(4);
    const priceWentUp = priceDiff > 0;
    const priceWentDown = priceDiff < 0;
    const priceUnchanged = priceDiff === 0;
    
    let actualMovement: string;
    let correctPrediction: Prediction | null;
    
    if (priceUnchanged) {
      actualMovement = "UNCHANGED";
      correctPrediction = null; // Draw if price unchanged
    } else if (priceWentUp) {
      actualMovement = "UP";
      correctPrediction = "UP";
    } else {
      actualMovement = "DOWN";
      correctPrediction = "DOWN";
    }

    console.log(`║`);
    console.log(`║ ═══════════ PRICE ANALYSIS ═══════════`);
    console.log(`║ Change: ${priceDiff >= 0 ? '+' : ''}$${priceDiff.toFixed(2)} (${priceChangePercent}%)`);
    console.log(`║ Movement: ${actualMovement}`);
    console.log(`║`);
    
    // ============================================
    // LOG PREDICTIONS
    // ============================================
    console.log(`║ ═══════════ PREDICTIONS ═══════════`);
    console.log(`║ Player A: ${match.predictionA || "NO PREDICTION"}`);
    console.log(`║ Player B: ${match.predictionB || "NO PREDICTION"}`);
    console.log(`║`);

    // ============================================
    // DETERMINE WINNER (Deterministic Logic)
    // ============================================
    let winner: string | null = null;
    let result: string;

    if (priceUnchanged) {
      // Price unchanged = DRAW (no winner)
      result = "DRAW (Price unchanged)";
      winner = null;
    } else if (!match.predictionA && !match.predictionB) {
      // Neither player predicted
      result = "DRAW (No predictions submitted)";
      winner = null;
    } else if (!match.predictionA && match.predictionB) {
      // Only B predicted - B wins by default
      result = "Player B wins (Player A didn't predict)";
      winner = match.playerB;
    } else if (match.predictionA && !match.predictionB) {
      // Only A predicted - A wins by default
      result = "Player A wins (Player B didn't predict)";
      winner = match.playerA;
    } else if (match.predictionA === correctPrediction && match.predictionB !== correctPrediction) {
      // A correct, B wrong
      result = `Player A wins (Predicted ${match.predictionA} correctly)`;
      winner = match.playerA;
    } else if (match.predictionB === correctPrediction && match.predictionA !== correctPrediction) {
      // B correct, A wrong
      result = `Player B wins (Predicted ${match.predictionB} correctly)`;
      winner = match.playerB;
    } else if (match.predictionA === correctPrediction && match.predictionB === correctPrediction) {
      // Both correct - DRAW
      result = "DRAW (Both predicted correctly)";
      winner = null;
    } else {
      // Both wrong - DRAW
      result = "DRAW (Both predicted incorrectly)";
      winner = null;
    }

    console.log(`║ ═══════════ RESULT ═══════════`);
    console.log(`║ ${result}`);
    if (winner) {
      console.log(`║ Winner: ${winner}`);
      console.log(`║ Prize: $${match.stake * 2} USDC`);
    } else {
      console.log(`║ Stakes returned to both players`);
    }
    console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

    // ============================================
    // UPDATE MATCH STATE
    // ============================================
    const updated = MatchStore.update(matchId, {
      status: MatchStatus.COMPLETED,
      endTime,
      endPrice,
      winner,
    });

    if (updated) {
      this.notifyMatchResult(updated);
    }

    return updated || null;
  }

  /**
   * Settle the match (finalize payouts - mock for now)
   * Transitions: COMPLETED → SETTLED
   */
  settleMatch(matchId: string): Match | null {
    const match = MatchStore.get(matchId);
    if (!match || match.status !== MatchStatus.COMPLETED) {
      return null;
    }

    const updated = MatchStore.update(matchId, {
      status: MatchStatus.SETTLED,
    });

    if (updated) {
      // Clear player match associations
      PlayerStore.setMatch(match.playerA, null);
      if (match.playerB) {
        PlayerStore.setMatch(match.playerB, null);
      }
      
      console.log(`\n╔═══════════════════ YELLOW SETTLEMENT ═══════════════════╗`);
      if (match.winner) {
        const winnerSession = PlayerStore.get(match.winner)?.yellowSessionId;
        console.log(`║ 💸 [TRANSFER] $${match.stake * 2} USDC → ${match.winner}`);
        console.log(`║ 📄 [RECEIPT] Session ${winnerSession ? winnerSession.slice(0, 10) + "..." : "N/A"} balance updated.`);
      } else {
        console.log(`║ 🔄 [RETURN] Stakes returned off-chain to both players.`);
      }
      console.log(`║ ✓ [SETTLED] Match ${matchId.slice(0, 8)}... finalized`);
      console.log(`╚══════════════════════════════════════════════════════════╝\n`);
    }

    return updated || null;
  }

  /**
   * Cancel a match (player disconnect, etc.)
   */
  cancelMatch(matchId: string, reason: string): void {
    const match = MatchStore.get(matchId);
    if (!match) return;

    this.clearTimer(matchId);
    MatchStore.delete(matchId);

    // Notify players
    const players = [match.playerA, match.playerB].filter(Boolean) as string[];
    PlayerStore.broadcast(players, {
      type: "ERROR",
      message: `Match cancelled: ${reason}`,
    });

    // Clear player associations
    players.forEach((p) => PlayerStore.setMatch(p, null));
    
    console.log(`✗ [CANCELLED] Match ${matchId.slice(0, 8)}... - ${reason}\n`);
  }

  /**
   * Notify players of match result
   */
  private notifyMatchResult(match: Match): void {
    const players = [match.playerA, match.playerB].filter(Boolean) as string[];
    PlayerStore.broadcast(players, {
      type: "MATCH_RESULT",
      match,
    });

    // Auto-settle after a short delay
    setTimeout(() => {
      this.settleMatch(match.id);
    }, 3000);
  }

  /**
   * Clear a match timer
   */
  private clearTimer(matchId: string): void {
    const timer = this.activeTimers.get(matchId);
    if (timer) {
      clearTimeout(timer);
      this.activeTimers.delete(matchId);
    }
  }

  /**
   * Get a match by ID
   */
  getMatch(matchId: string): Match | undefined {
    return MatchStore.get(matchId);
  }

  /**
   * Cleanup on shutdown
   */
  cleanup(): void {
    this.activeTimers.forEach((timer) => clearTimeout(timer));
    this.activeTimers.clear();
  }
}

// Singleton export
export const matchService = new MatchService();
