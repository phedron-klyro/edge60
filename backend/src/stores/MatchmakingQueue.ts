/**
 * Edge60 Backend - Matchmaking Queue
 * 
 * Simple FIFO queue for matching players with same stake amount
 */

import { QueueEntry } from "../types/index.js";

/**
 * Matchmaking Queue
 * Groups players by stake amount for fair matching
 */
class MatchmakingQueueClass {
  // Queue entries grouped by stake amount
  private queues: Map<number, QueueEntry[]> = new Map();

  /**
   * Add player to queue
   * Returns queue position
   */
  add(playerId: string, stake: number, yellowSessionId?: string): number {
    const entry: QueueEntry = {
      playerId,
      stake,
      joinedAt: Date.now(),
      yellowSessionId,
    };

    const queue = this.queues.get(stake) || [];
    queue.push(entry);
    this.queues.set(stake, queue);

    console.log(`[Queue] Player ${playerId} joined $${stake} queue. Position: ${queue.length}`);
    return queue.length;
  }

  /**
   * Remove player from queue
   */
  remove(playerId: string): boolean {
    for (const [stake, queue] of this.queues.entries()) {
      const index = queue.findIndex((e) => e.playerId === playerId);
      if (index !== -1) {
        queue.splice(index, 1);
        console.log(`[Queue] Player ${playerId} left $${stake} queue`);
        return true;
      }
    }
    return false;
  }

  /**
   * Try to find a match for a player
   * Returns the other player's entry if found, null otherwise
   */
  findMatch(playerId: string, stake: number): QueueEntry | null {
    const queue = this.queues.get(stake);
    if (!queue || queue.length === 0) return null;

    // Find another player (not self) in the same stake queue
    const matchIndex = queue.findIndex((e) => e.playerId !== playerId);
    if (matchIndex === -1) return null;

    // Remove matched player from queue
    const [matched] = queue.splice(matchIndex, 1);
    
    // Also remove the current player from queue
    const selfIndex = queue.findIndex((e) => e.playerId === playerId);
    if (selfIndex !== -1) {
      queue.splice(selfIndex, 1);
    }

    console.log(`[Queue] Match found: ${playerId} vs ${matched.playerId} for $${stake}`);
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
   * Get queue length for a stake amount
   */
  getQueueLength(stake: number): number {
    return this.queues.get(stake)?.length || 0;
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
