/**
 * Edge60 Backend - Matchmaking Service
 * 
 * Handles queue management and player matching
 */

import { MatchmakingQueue, PlayerStore } from "../stores/index.js";
import { matchService } from "./MatchService.js";
import type { Match } from "../types/index.js";

/**
 * Matchmaking Service
 */
export class MatchmakingService {
  /**
   * Add player to matchmaking queue and try to find a match
   * Returns immediately with queue position, or triggers async match start
   */
  async joinQueue(playerId: string, stake: number, yellowSessionId?: string): Promise<{ position: number; match: Match | null }> {
    // Check if player is already in a match
    const existingMatch = PlayerStore.get(playerId)?.currentMatchId;
    if (existingMatch) {
      console.log(`[Matchmaking] Player ${playerId} already in match ${existingMatch}`);
      return { position: 0, match: null };
    }

    // Check if player is already in queue
    if (MatchmakingQueue.isInQueue(playerId)) {
      console.log(`[Matchmaking] Player ${playerId} already in queue`);
      return { position: MatchmakingQueue.getQueueLength(stake), match: null };
    }

    // Try to find a match first
    const opponent = MatchmakingQueue.findMatch(playerId, stake);

    if (opponent) {
      // Found an opponent - create and start match immediately
      const match = matchService.createMatch(opponent.playerId, stake);
      
      // Async: fetch price and start match
      const startedMatch = await matchService.joinMatch(match.id, playerId);

      if (startedMatch) {
        // Notify both players
        this.notifyMatchFound(startedMatch);
        return { position: 0, match: startedMatch };
      }
    }

    // No match found - add to queue
    const position = MatchmakingQueue.add(playerId, stake, yellowSessionId);
    
    // Notify player they're in queue
    PlayerStore.send(playerId, {
      type: "QUEUE_JOINED",
      position,
    });

    return { position, match: null };
  }

  /**
   * Remove player from queue
   */
  leaveQueue(playerId: string): boolean {
    return MatchmakingQueue.remove(playerId);
  }

  /**
   * Notify both players that a match was found
   */
  private notifyMatchFound(match: Match): void {
    const message = {
      type: "MATCH_FOUND",
      match,
    };

    // Notify Player A
    PlayerStore.send(match.playerA, message);

    // Notify Player B
    if (match.playerB) {
      PlayerStore.send(match.playerB, message);
    }

    // Also send START_MATCH event with real price data
    const startMessage = {
      type: "START_MATCH",
      matchId: match.id,
      startTime: match.startTime,
      startPrice: match.startPrice,
      asset: match.asset,
      duration: match.duration,
    };

    PlayerStore.send(match.playerA, startMessage);
    if (match.playerB) {
      PlayerStore.send(match.playerB, startMessage);
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): { totalInQueue: number; queuesByStake: Record<number, number> } {
    // Common stake amounts (1 USDC fixed for now)
    const stakes = [1, 10, 25, 50, 100];
    const queuesByStake: Record<number, number> = {};

    stakes.forEach((stake) => {
      queuesByStake[stake] = MatchmakingQueue.getQueueLength(stake);
    });

    return {
      totalInQueue: MatchmakingQueue.totalPlayers(),
      queuesByStake,
    };
  }
}

// Singleton export
export const matchmakingService = new MatchmakingService();
