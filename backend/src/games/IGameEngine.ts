/**
 * Edge60 - Game Engine Interface
 *
 * Common interface for all game types (Prediction, Trade Duel, etc.)
 */

import { Match, MatchStatus } from "../types/index.js";

export interface IGameEngine {
  /**
   * Called when match transitions to ACTIVE
   * Initialize game state, fetch start price, etc.
   */
  onStart(match: Match): Promise<Partial<Match>>;

  /**
   * Handle player actions during the game
   * Returns true if action was valid and state was updated
   */
  onAction(
    match: Match,
    playerId: string,
    actionType: string,
    payload: any,
  ): boolean;

  /**
   * Called periodically or on price updates
   * Handle limit orders, liquidations, or simple pnl updates
   */
  onUpdate(match: Match): Promise<Partial<Match>>;

  /**
   * Called when timer ends
   * Calculate winner, final prices, etc.
   */
  onComplete(match: Match): Promise<Partial<Match>>;
}
