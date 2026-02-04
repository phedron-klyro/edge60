/**
 * Edge60 Backend - Match Store
 * 
 * In-memory storage for matches using Map
 */

import { Match, MatchStatus } from "../types/index.js";

/**
 * Match Store - manages all match state
 * Uses Map for O(1) lookups by match ID
 */
class MatchStoreClass {
  private matches: Map<string, Match> = new Map();

  /**
   * Create a new match
   */
  create(match: Match): Match {
    this.matches.set(match.id, match);
    console.log(`[MatchStore] Created match ${match.id}`);
    return match;
  }

  /**
   * Get match by ID
   */
  get(matchId: string): Match | undefined {
    return this.matches.get(matchId);
  }

  /**
   * Update match state
   */
  update(matchId: string, updates: Partial<Match>): Match | undefined {
    const match = this.matches.get(matchId);
    if (!match) return undefined;

    const updated = { ...match, ...updates };
    this.matches.set(matchId, updated);
    console.log(`[MatchStore] Updated match ${matchId} → ${updated.status}`);
    return updated;
  }

  /**
   * Delete a match
   */
  delete(matchId: string): boolean {
    return this.matches.delete(matchId);
  }

  /**
   * Get all matches with a specific status
   */
  getByStatus(status: MatchStatus): Match[] {
    return Array.from(this.matches.values()).filter((m) => m.status === status);
  }

  /**
   * Get all active matches (WAITING or ACTIVE)
   */
  getActive(): Match[] {
    return Array.from(this.matches.values()).filter(
      (m) => m.status === MatchStatus.WAITING || m.status === MatchStatus.ACTIVE
    );
  }

  /**
   * Get match by player ID
   */
  getByPlayer(playerId: string): Match | undefined {
    return Array.from(this.matches.values()).find(
      (m) =>
        (m.playerA === playerId || m.playerB === playerId) &&
        (m.status === MatchStatus.WAITING || m.status === MatchStatus.ACTIVE)
    );
  }

  /**
   * Get total match count
   */
  count(): number {
    return this.matches.size;
  }

  /**
   * Clear all matches (for testing)
   */
  clear(): void {
    this.matches.clear();
  }
}

// Singleton export
export const MatchStore = new MatchStoreClass();
