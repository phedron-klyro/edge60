/**
 * Edge60 Backend - Matchmaking Queue
 *
 * FIFO queue for matching players.
 * Matches players based on:
 * 1. Stake Amount
 * 2. Game Type (Prediction vs Trade Duel)
 * 3. Asset (ETH/USD vs BTC/USD)
 */

import { QueueEntry, GameType } from "../types/index.js";

/**
 * Matchmaking Queue
 */
class MatchmakingQueueClass {
  // Queue entries grouped by a composite key string
  private queues: Map<string, QueueEntry[]> = new Map();

  /**
   * Helper to generate a unique key for the queue
   */
  private getQueueKey(
    stake: number,
    gameType: GameType,
    asset: string,
  ): string {
    return `${stake}:${gameType}:${asset}`;
  }

  /**
   * Add player to queue
   * Returns queue position
   */
  add(
    playerId: string,
    stake: number,
    gameType: GameType,
    asset: string,
    walletAddress?: string,
    yellowSessionId?: string,
  ): number {
    const entry: QueueEntry = {
      playerId,
      stake,
      gameType,
      asset,
      joinedAt: Date.now(),
      walletAddress,
      yellowSessionId,
    };

    const key = this.getQueueKey(stake, gameType, asset);
    const queue = this.queues.get(key) || [];
    queue.push(entry);
    this.queues.set(key, queue);

    console.log(
      `[Queue] Player ${playerId} joined queue [${key}]. Position: ${queue.length}`,
    );
    return queue.length;
  }

  /**
   * Remove player from queue
   */
  remove(playerId: string): boolean {
    for (const [key, queue] of this.queues.entries()) {
      const index = queue.findIndex((e) => e.playerId === playerId);
      if (index !== -1) {
        queue.splice(index, 1);
        console.log(`[Queue] Player ${playerId} left queue [${key}]`);
        return true;
      }
    }
    return false;
  }

  /**
   * Try to find a match for a player
   * Returns the other player's entry if found, null otherwise
   */
  findMatch(
    playerId: string,
    stake: number,
    gameType: GameType,
    asset: string,
  ): QueueEntry | null {
    const key = this.getQueueKey(stake, gameType, asset);
    const queue = this.queues.get(key);

    if (!queue || queue.length === 0) return null;

    // Find another player (not self) in the exact same queue
    const matchIndex = queue.findIndex((e) => e.playerId !== playerId);
    if (matchIndex === -1) return null;

    // Remove matched player from queue
    const [matched] = queue.splice(matchIndex, 1);

    // Also remove the current player from queue
    const selfIndex = queue.findIndex((e) => e.playerId === playerId);
    if (selfIndex !== -1) {
      queue.splice(selfIndex, 1);
    }

    console.log(
      `[Queue] Match found in [${key}]: ${playerId} vs ${matched.playerId}`,
    );
    return matched;
  }

  /**
   * Check if player is in queue
   */
  isInQueue(playerId: string): boolean {
    for (const queue of this.queues.values()) {
      if (queue.some((e) => e.playerId === playerId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get queue length for a specific segment
   */
  getQueueLength(stake: number, gameType: GameType, asset: string): number {
    const key = this.getQueueKey(stake, gameType, asset);
    return this.queues.get(key)?.length || 0;
  }

  /**
   * Get total players in all queues
   */
  totalPlayers(): number {
    let total = 0;
    for (const queue of this.queues.values()) {
      total += queue.length;
    }
    return total;
  }

  /**
   * Clear all queues (for testing)
   */
  clear(): void {
    this.queues.clear();
  }
}

// Singleton export
export const MatchmakingQueue = new MatchmakingQueueClass();
