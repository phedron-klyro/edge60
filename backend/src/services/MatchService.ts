/**
 * Edge60 Backend - Match Service
 *
 * Core match lifecycle logic and state machine
 * WAITING → PROPOSED → ACTIVE → COMPLETED → SETTLED
 */

import { v4 as uuidv4 } from "uuid";
import {
  Match,
  MatchStatus,
  GameType,
  SettlementInfo,
} from "../types/index.js";
import { MatchStore, PlayerStore } from "../stores/index.js";
import { TreasuryService } from "./TreasuryService.js";
import { dbService } from "./DatabaseService.js";
import { Address } from "viem";

import { IGameEngine } from "../games/IGameEngine.js";
import { AssetPredictionEngine } from "../games/AssetPredictionEngine.js";
import { TradeDuelEngine } from "../games/TradeDuelEngine.js";

// ============================================
// CONFIGURATION
// ============================================

const DEFAULT_DURATION = 60; // seconds
const CONFIRMATION_TIMEOUT = 10000; // 10 seconds to accept match

/**
 * Match Service - handles all match logic
 * Backend is authoritative for all game decisions
 */
export class MatchService {
  // Track active timers for cleanup
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();
  private proposalTimers: Map<string, NodeJS.Timeout> = new Map();

  // Registry of Game Engines
  private engines: Record<GameType, IGameEngine> = {
    PREDICTION: new AssetPredictionEngine(),
    TRADE_DUEL: new TradeDuelEngine(),
  };

  /**
   * Get engine for a match
   */
  private getEngine(gameType: GameType): IGameEngine {
    return this.engines[gameType] || this.engines["PREDICTION"];
  }

  /**
   * Create a new match with Player A
   */
  createMatch(
    playerA: string,
    stake: number,
    gameType: GameType,
    asset: string,
  ): Match {
    const match: Match = {
      id: uuidv4(),
      playerA,
      playerB: null,
      stake,
      status: MatchStatus.WAITING,
      startTime: null,
      endTime: null,
      duration: DEFAULT_DURATION, // Could be customizable per game type
      winner: null,
      predictionA: null,
      predictionB: null,
      gameType,
      asset,
      startPrice: null,
      endPrice: null,
      matchData: null,
    };

    MatchStore.create(match);
    PlayerStore.setMatch(playerA, match.id);

    console.log(
      `[MatchService] Created ${gameType} match for ${playerA} on ${asset} ($${stake})`,
    );

    return match;
  }

  /**
   * Propose a match between Player A (waiting) and Player B (new)
   * Transitions: WAITING → PROPOSED
   */
  async proposeMatch(matchId: string, playerB: string): Promise<Match | null> {
    const match = MatchStore.get(matchId);
    if (!match || match.status !== MatchStatus.WAITING) return null;

    // Update match with player B and PROPOSED status
    const updated = MatchStore.update(matchId, {
      playerB,
      status: MatchStatus.PROPOSED,
    });

    if (!updated) return null;

    // Set player B's match
    PlayerStore.setMatch(playerB, matchId);

    console.log(
      `[MatchService] Match ${matchId} PROPOSED. Waiting for accept...`,
    );

    // Notify both players
    const expiresAt = Date.now() + CONFIRMATION_TIMEOUT;
    const players = [updated.playerA, updated.playerB!];

    PlayerStore.broadcast(players, {
      type: "MATCH_PROPOSED",
      matchId,
      stake: updated.stake,
      gameType: updated.gameType,
      asset: updated.asset,
      expiresAt,
    });

    // Start timeout to cancel if not accepted
    const timeout = setTimeout(() => {
      this.handleProposalTimeout(matchId);
    }, CONFIRMATION_TIMEOUT);

    this.proposalTimers.set(matchId, timeout);

    return updated || null;
  }

  /**
   * Handle proposal timeout
   */
  private handleProposalTimeout(matchId: string) {
    const match = MatchStore.get(matchId);
    if (!match || match.status !== MatchStatus.PROPOSED) return;

    console.log(`[MatchService] Match ${matchId} proposal timed out.`);
    this.cancelMatch(matchId, "Match proposal timed out");
    this.proposalTimers.delete(matchId);
  }

  /**
   * Handle player accepting the match
   * If both accept -> Start Match
   */
  async acceptMatch(matchId: string, playerId: string): Promise<boolean> {
    // Need track acceptance state per match.
    // For MVP, we can store generic "acceptedPlayers" in matchData or a local map.
    // Let's use a local map for simplicity in this service since it's transient.
    // Or safer: add it to matchData? No, matchData is for Game Engine.
    // We'll trust the generic update mechanism or better yet, verify via a simple set.

    const match = MatchStore.get(matchId);
    if (!match || match.status !== MatchStatus.PROPOSED) return false;

    // We need to track who accepted.
    // Reuse the 'timer' map or a new one? Let's use a new simple map.
    // Actually, we can just check if state transitions.
    // We need a way to store "A_ACCEPTED" and "B_ACCEPTED".
    // Let's use matchData temporarily if it's null, or a private map.
    // Private map is safest.

    const accepted = this.getAcceptedPlayers(matchId);
    accepted.add(playerId);
    this.acceptedPlayers.set(matchId, accepted);

    console.log(`[MatchService] Player ${playerId} accepted match ${matchId}`);

    if (
      accepted.has(match.playerA) &&
      match.playerB &&
      accepted.has(match.playerB)
    ) {
      // Both accepted! Clear timeout and start.
      if (this.proposalTimers.has(matchId)) {
        clearTimeout(this.proposalTimers.get(matchId)!);
        this.proposalTimers.delete(matchId);
      }
      this.acceptedPlayers.delete(matchId);
      await this.startMatch(matchId);
    }

    return true;
  }

  // Temporary storage for accepted players during proposal
  private acceptedPlayers: Map<string, Set<string>> = new Map();

  private getAcceptedPlayers(matchId: string): Set<string> {
    if (!this.acceptedPlayers.has(matchId)) {
      this.acceptedPlayers.set(matchId, new Set());
    }
    return this.acceptedPlayers.get(matchId)!;
  }

  /**
   * Start the match (Transition to ACTIVE)
   * Calls GameEngine.onStart()
   */
  private async startMatch(matchId: string) {
    const match = MatchStore.get(matchId);
    if (!match) return;

    console.log(`[MatchService] Starting match ${matchId}...`);

    // 1. Get Game Engine
    const engine = this.getEngine(match.gameType);

    // 2. Call onStart to get initial state (prices, etc)
    const engineState = await engine.onStart(match);

    const startTime = Date.now();

    // 3. Update Match
    const updated = MatchStore.update(matchId, {
      status: MatchStatus.ACTIVE,
      startTime,
      ...engineState, // Merge engine state (matchData, startPrice, etc)
    });

    if (!updated) return;

    // 4. Notify Players
    // Notify match starting with full state
    const players = [updated.playerA, updated.playerB!];

    // For legacy support (frontend expecting START_MATCH with price)
    const startPrice = updated.startPrice || updated.matchData?.startPrice || 0;

    PlayerStore.broadcast(players, {
      type: "START_MATCH",
      matchId,
      startTime,
      startPrice,
    });

    // Also send generic game state
    PlayerStore.broadcast(players, {
      type: "GAME_STATE_UPDATE",
      matchId,
      state: updated.matchData,
    });

    // 5. Start Timer
    this.startMatchTimer(matchId);
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
    this.proposalTimers.forEach((timer) => clearTimeout(timer));
    this.proposalTimers.clear();
  }

  /**
   * Handle generic game action (Prediction, Trade, etc)
   */
  handleGameAction(
    matchId: string,
    playerId: string,
    action: string,
    payload: any,
  ): boolean {
    const match = MatchStore.get(matchId);
    if (!match || match.status !== MatchStatus.ACTIVE) return false;

    const engine = this.getEngine(match.gameType);

    // Engine handles logic and mutations
    const success = engine.onAction(match, playerId, action, payload);

    if (success) {
      // Update store with new matchData (engine modified match.matchData directly or we need re-save?)
      // In-memory objects in JS are references, so match.matchData is likely mutated.
      // But MatchStore.update triggers persistence usually.
      // Let's force an update call to be safe and trigger generic events if potential "watchers" exist.
      MatchStore.update(matchId, { matchData: match.matchData });

      // Broadcast new state to opponents
      const opponentId =
        match.playerA === playerId ? match.playerB : match.playerA;
      if (opponentId) {
        PlayerStore.send(opponentId, {
          type: "GAME_STATE_UPDATE",
          matchId,
          state: match.matchData,
        });
      }

      // Also send back to sender for confirmation?
      // Usually UI optimistically updates, but good to sync.
      PlayerStore.send(playerId, {
        type: "GAME_STATE_UPDATE",
        matchId,
        state: match.matchData,
      });
    }

    return success;
  }

  /**
   * Start the match timer
   */
  private startMatchTimer(matchId: string): void {
    const match = MatchStore.get(matchId);
    if (!match) return;

    const timer = setTimeout(async () => {
      await this.completeMatch(matchId);
    }, match.duration * 1000);

    this.activeTimers.set(matchId, timer);
  }

  /**
   * Complete the match
   * Calls GameEngine.onComplete()
   */
  async completeMatch(matchId: string): Promise<Match | null> {
    const match = MatchStore.get(matchId);
    if (!match || match.status !== MatchStatus.ACTIVE) return null;

    this.clearTimer(matchId);

    console.log(`[MatchService] completing match ${matchId}`);

    const engine = this.getEngine(match.gameType);

    // Engine calculates winner and final state
    const completionData = await engine.onComplete(match);

    const updated = MatchStore.update(matchId, {
      status: MatchStatus.COMPLETED,
      endTime: Date.now(),
      ...completionData,
    });

    if (updated) {
      this.notifyMatchResult(updated);
      dbService.saveMatch(updated);
    }

    return updated || null;
  }

  /**
   * Settle the match on-chain via Arc Treasury
   */
  async settleMatch(matchId: string): Promise<Match | null> {
    const match = MatchStore.get(matchId);
    if (!match || match.status !== MatchStatus.COMPLETED) return null;

    MatchStore.update(matchId, { status: MatchStatus.SETTLING });

    const players = [match.playerA, match.playerB].filter(Boolean) as string[];
    PlayerStore.broadcast(players, { type: "SETTLEMENT_STARTED", matchId });

    let settlement: SettlementInfo;

    // Settle winner
    if (match.winner) {
      const winnerAddress = match.winner as Address;
      const prizePool = match.stake * 2;

      console.log(
        `[MatchService] Settling WIN for ${winnerAddress}: $${prizePool}`,
      );

      const result = await TreasuryService.settleMatch(
        winnerAddress,
        prizePool,
        matchId,
      );
      settlement = {
        status: result.status,
        txHash: result.txHash,
        grossAmount: result.grossAmount,
        rake: result.rake,
        netPayout: result.netPayout,
        error: result.error,
        explorerUrl: result.explorerUrl,
      };
    } else {
      // Draw
      console.log(`[MatchService] Settling DRAW`);
      settlement = {
        status: "confirmed",
        grossAmount: "0",
        rake: "0",
        netPayout: "0",
      };
    }

    const updated = MatchStore.update(matchId, {
      status: MatchStatus.SETTLED,
      settlement,
    });

    if (updated) {
      // Release players
      PlayerStore.setMatch(match.playerA, null);
      if (match.playerB) PlayerStore.setMatch(match.playerB, null);

      const msgType =
        settlement.status === "confirmed"
          ? "SETTLEMENT_COMPLETE"
          : "SETTLEMENT_FAILED";
      PlayerStore.broadcast(players, {
        type: msgType,
        match: updated,
        settlement,
        error: settlement.error,
      } as any);

      await dbService.saveMatch(updated);
    }

    return updated || null;
  }

  /**
   * Cancel a match
   */
  cancelMatch(matchId: string, reason: string): void {
    const match = MatchStore.get(matchId);
    if (!match) return;

    this.clearTimer(matchId);
    if (this.proposalTimers.has(matchId)) {
      clearTimeout(this.proposalTimers.get(matchId)!);
      this.proposalTimers.delete(matchId);
      this.acceptedPlayers.delete(matchId);
    }

    MatchStore.delete(matchId);

    const players = [match.playerA, match.playerB].filter(Boolean) as string[];
    PlayerStore.broadcast(players, {
      type: "ERROR",
      message: `Match cancelled: ${reason}`,
    });

    players.forEach((p) => PlayerStore.setMatch(p, null));
  }

  private notifyMatchResult(match: Match): void {
    const players = [match.playerA, match.playerB].filter(Boolean) as string[];
    PlayerStore.broadcast(players, {
      type: "MATCH_RESULT",
      match,
    });

    setTimeout(async () => {
      await this.settleMatch(match.id);
    }, 3000);
  }

  private clearTimer(matchId: string): void {
    const timer = this.activeTimers.get(matchId);
    if (timer) {
      clearTimeout(timer);
      this.activeTimers.delete(matchId);
    }
  }
}

export const matchService = new MatchService();
