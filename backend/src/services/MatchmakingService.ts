/**
 * Edge60 Backend - Matchmaking Service
 *
 * Handles queue management and player matching
 */

import { MatchmakingQueue, PlayerStore } from "../stores/index.js";
import { matchService } from "./MatchService.js";
import type { Match, GameType } from "../types/index.js";

/**
 * Matchmaking Service
 */
export class MatchmakingService {
  /**
   * Add player to matchmaking queue and try to find a match
   */
  async joinQueue(
    playerId: string,
    stake: number,
    gameType: GameType,
    asset: string,
    walletAddress?: string,
    yellowSessionId?: string,
  ): Promise<{ position: number; match: Match | null }> {
    // Check if player is already in a match
    const existingMatch = PlayerStore.get(playerId)?.currentMatchId;
    if (existingMatch) {
      console.log(
        `[Matchmaking] Player ${playerId} already in match ${existingMatch}`,
      );
      return { position: 0, match: null };
    }

    // Check if player is already in queue
    if (MatchmakingQueue.isInQueue(playerId)) {
      console.log(`[Matchmaking] Player ${playerId} already in queue`);
      return {
        position: MatchmakingQueue.getQueueLength(stake, gameType, asset),
        match: null,
      };
    }

    // Try to find a match first
    const opponent = MatchmakingQueue.findMatch(
      playerId,
      stake,
      gameType,
      asset,
    );

    if (opponent) {
      // Found an opponent - create and PROPOSE match (not start immediately)
      const match = matchService.createMatch(
        opponent.playerId,
        stake,
        gameType,
        asset,
      );

      // Add Player B (current player) to the proposal
      const proposedMatch = await matchService.proposeMatch(match.id, playerId);

      if (proposedMatch) {
        return { position: 0, match: proposedMatch };
      }
    }

    // No match found - add to queue
    const position = MatchmakingQueue.add(
      playerId,
      stake,
      gameType,
      asset,
      walletAddress,
      yellowSessionId,
    );

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
   * Get queue statistics
   */
  getStats(): { totalInQueue: number } {
    return {
      totalInQueue: MatchmakingQueue.totalPlayers(),
    };
  }
}

// Singleton export
export const matchmakingService = new MatchmakingService();
