/**
 * Edge60 - Memory Match Game Engine
 *
 * Skill-based memory game: 5x6 grid (15 pairs of emojis).
 * Both players play simultaneously on the same grid layout (their own copy).
 * Winner = highest matched pairs in 60 seconds. Equal scores = draw.
 */

import { IGameEngine } from "./IGameEngine.js";
import { Match } from "../types/index.js";

// 15 visually distinct emojis for pairs
const EMOJI_POOL = [
  "🍎", "🎸", "💎", "🍇", "🔥",
  "🍓", "🍕", "🍩", "🎮", "🎯",
  "🍎", "🎸", "💎", "🍇", "🍉",
  // "🎸", "🌟", "🔥", "💎", "🚀",
];

interface MemoryPlayerState {
  score: number;
  matchedPairs: number[];   // indices of matched cards
  flippedCards: number[];   // currently flipped cards (0, 1, or 2)
  lastFlipTime: number;
  totalFlips: number;
}

interface MemoryGameResults {
  playerAScore: number;
  playerBScore: number;
  playerATotalFlips: number;
  playerBTotalFlips: number;
}

interface MemoryGameData {
  grid: string[];               // 30 emojis (5 cols x 6 rows)
  playerAState: MemoryPlayerState;
  playerBState: MemoryPlayerState;
  results?: MemoryGameResults;
}

export class MemoryGameEngine implements IGameEngine {
  /**
   * Initialize game: generate shuffled 5x6 grid with 15 emoji pairs.
   * Both players share the same grid layout.
   */
  async onStart(match: Match): Promise<Partial<Match>> {
    // Create 15 pairs (30 cards total)
    const pairs = [...EMOJI_POOL];
    const grid = [...pairs, ...pairs];
    this.shuffleArray(grid);

    const initialPlayerState: MemoryPlayerState = {
      score: 0,
      matchedPairs: [],
      flippedCards: [],
      lastFlipTime: 0,
      totalFlips: 0,
    };

    const matchData: MemoryGameData = {
      grid,
      playerAState: JSON.parse(JSON.stringify(initialPlayerState)),
      playerBState: JSON.parse(JSON.stringify(initialPlayerState)),
    };

    console.log(`[MemoryGame] Started match ${match.id} with 15 pairs on 5x6 grid`);

    return {
      startPrice: 0, // Not applicable for memory game
      matchData,
    };
  }

  /**
   * Handle FLIP_CARD action from a player.
   *
   * Logic:
   * - If player already has 2 unmatched flipped cards, reset them first
   * - Flip the requested card
   * - If 2 cards are now flipped, check for a match
   * - If match: +1 score, add to matchedPairs, clear flippedCards
   * - If no match: keep flippedCards (client shows briefly, resets on next flip)
   */
  onAction(
    match: Match,
    playerId: string,
    actionType: string,
    payload: any,
  ): boolean {
    if (actionType !== "GAME_ACTION") return false;

    const action = payload.action;
    if (action !== "FLIP_CARD") return false;

    const cardIndex = payload.cardIndex;
    const data = match.matchData as MemoryGameData;

    // Validate card index
    if (typeof cardIndex !== "number" || cardIndex < 0 || cardIndex >= 30) {
      return false;
    }

    // Get player state
    let state: MemoryPlayerState;
    if (match.playerA === playerId) {
      state = data.playerAState;
    } else if (match.playerB === playerId) {
      state = data.playerBState;
    } else {
      return false;
    }

    // If player has 2 unmatched flipped cards, reset them
    if (state.flippedCards.length >= 2) {
      state.flippedCards = [];
    }

    // Can't flip a card that's already matched
    if (state.matchedPairs.includes(cardIndex)) {
      return false;
    }

    // Can't flip a card that's already flipped
    if (state.flippedCards.includes(cardIndex)) {
      return false;
    }

    // Flip the card
    state.flippedCards.push(cardIndex);
    state.totalFlips++;
    state.lastFlipTime = Date.now();

    // Check for match when 2 cards are flipped
    if (state.flippedCards.length === 2) {
      const [first, second] = state.flippedCards;

      if (data.grid[first] === data.grid[second]) {
        // Match found!
        state.score++;
        state.matchedPairs.push(first, second);
        state.flippedCards = [];

        console.log(
          `[MemoryGame] Player ${playerId} matched pair! Score: ${state.score}/15 (${data.grid[first]})`,
        );

        // Check if player found all pairs
        if (state.score === 15) {
          console.log(
            `[MemoryGame] Player ${playerId} found ALL 15 pairs!`,
          );
        }
      }
      // If no match, flippedCards stays at [first, second]
      // Client will show them briefly, then they'll be reset on next flip
    }

    return true;
  }

  /**
   * No periodic updates needed for memory game.
   * State changes happen only on player actions.
   */
  async onUpdate(match: Match): Promise<Partial<Match>> {
    return { matchData: match.matchData };
  }

  /**
   * Determine winner by comparing scores (matched pairs).
   * Highest score wins. Equal scores = draw.
   */
  async onComplete(match: Match): Promise<Partial<Match>> {
    const data = match.matchData as MemoryGameData;

    const scoreA = data.playerAState.score;
    const scoreB = data.playerBState.score;

    let winner: string | null = null;

    if (scoreA > scoreB) {
      winner = match.playerA;
      console.log(
        `[MemoryGame] Player A wins! Score: ${scoreA} vs ${scoreB}`,
      );
    } else if (scoreB > scoreA && match.playerB) {
      winner = match.playerB;
      console.log(
        `[MemoryGame] Player B wins! Score: ${scoreB} vs ${scoreA}`,
      );
    } else {
      winner = null; // Draw
      console.log(
        `[MemoryGame] DRAW! Both players scored ${scoreA}`,
      );
    }

    // Store results
    data.results = {
      playerAScore: scoreA,
      playerBScore: scoreB,
      playerATotalFlips: data.playerAState.totalFlips,
      playerBTotalFlips: data.playerBState.totalFlips,
    };

    return {
      winner,
      startPrice: 0,
      endPrice: 0,
      matchData: data,
    };
  }

  /**
   * Fisher-Yates shuffle
   */
  private shuffleArray(array: any[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}
