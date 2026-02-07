/**
 * Edge60 Backend - Type Definitions
 *
 * Core data models for matchmaking and game state
 */

// ============================================
// MATCH STATUS ENUM
// ============================================

/**
 * Match lifecycle states
 * WAITING → ACTIVE → COMPLETED → SETTLING → SETTLED
 */
export enum MatchStatus {
  /** Player A joined, waiting for Player B */
  WAITING = "WAITING",
  /** Match found, waiting for both players to accept */
  PROPOSED = "PROPOSED",
  /** Both players accepted/active, timer running */
  ACTIVE = "ACTIVE",
  /** Timer ended, winner calculated */
  COMPLETED = "COMPLETED",
  /** On-chain settlement in progress */
  SETTLING = "SETTLING",
  /** Results finalized (payment processed on-chain) */
  SETTLED = "SETTLED",
}

// ============================================
// SETTLEMENT STATUS
// ============================================

/**
 * On-chain settlement status
 */
export type SettlementStatus =
  | "pending" // Waiting to start
  | "approving" // Waiting for approval
  | "submitting" // Tx being submitted
  | "confirming" // Waiting for confirmation
  | "confirmed" // Successfully settled on-chain
  | "failed"; // Settlement failed

/**
 * Settlement details from Arc Treasury
 */
export interface SettlementInfo {
  status: SettlementStatus;
  txHash?: string;
  blockNumber?: number;
  grossAmount?: string;
  rake?: string;
  netPayout?: string;
  error?: string;
  explorerUrl?: string;
}

// ============================================
// PREDICTION TYPE
// ============================================

// ============================================
// GAME TYPES
// ============================================

export type GameType = "PREDICTION" | "TRADE_DUEL" | "MEMORY_GAME";

export type Prediction = "UP" | "DOWN";

// ============================================
// MATCH INTERFACE
// ============================================

export interface Match {
  /** Unique match identifier */
  id: string;
  /** Player A's wallet address or session ID */
  playerA: string;
  /** Player B's wallet address or session ID */
  playerB: string | null;
  /** Stake amount in USDC (both players must stake equally) */
  stake: number;
  /** Current match status */
  status: MatchStatus;
  /** Unix timestamp when match started (timer began) */
  startTime: number | null;
  /** Unix timestamp when match ended */
  endTime: number | null;
  /** Duration in seconds (default 60) */
  duration: number;
  /** Winner's player ID */
  winner: string | null;
  /** Player A's price prediction */
  predictionA: Prediction | null;
  /** Player B's price prediction */
  predictionB: Prediction | null;

  /** Game Type (Prediction or Trade Duel) */
  gameType: GameType;
  /** Asset (e.g., "ETH/USD", "BTC/USD") */
  asset: string;

  /** Starting price (T0) */
  startPrice: number | null;
  /** Ending price (T1) */
  endPrice: number | null;

  /** Generic container for Game Engine state */
  matchData?: any;

  /** On-chain settlement info (populated after settlement) */
  settlement?: SettlementInfo;
}

// ============================================
// PLAYER INTERFACE
// ============================================

export interface Player {
  /** Player's unique ID (wallet address or session) */
  id: string;
  /** Player's ENS name if resolved */
  ensName: string | null;
  /** Current match ID if in a match */
  currentMatchId: string | null;
  /** WebSocket connection status */
  isConnected: boolean;
  /** Yellow Network session ID */
  yellowSessionId: string | null;
}

// ============================================
// WEBSOCKET EVENTS
// ============================================

/**
 * Events sent from Client → Server
 */
export type ClientEvent =
  | {
      type: "JOIN_QUEUE";
      playerId: string;
      stake: number;
      gameType: GameType;
      asset: string;
      walletAddress?: string;
      yellowSessionId?: string;
    }
  | { type: "ACCEPT_MATCH"; matchId: string; playerId: string }
  | { type: "DECLINE_MATCH"; matchId: string; playerId: string }
  | { type: "GAME_ACTION"; matchId: string; action: string; payload: any }
  | { type: "SUBMIT_PREDICTION"; matchId: string; prediction: Prediction }
  | { type: "LEAVE_QUEUE"; playerId: string }
  | { type: "PING" };

/**
 * Events sent from Server → Client
 */
export type ServerEvent =
  | { type: "QUEUE_JOINED"; position: number }
  | {
      type: "MATCH_PROPOSED";
      matchId: string;
      stake: number;
      gameType: GameType;
      asset: string;
      expiresAt: number;
    }
  | { type: "MATCH_FOUND"; match: Match }
  | {
      type: "START_MATCH";
      matchId: string;
      startTime: number;
      startPrice: number;
    }
  | { type: "GAME_STATE_UPDATE"; matchId: string; state: any }
  | { type: "PREDICTION_RECEIVED"; matchId: string }
  | { type: "MATCH_RESULT"; match: Match }
  | { type: "SETTLEMENT_STARTED"; matchId: string }
  | { type: "SETTLEMENT_COMPLETE"; match: Match; settlement: SettlementInfo }
  | { type: "SETTLEMENT_FAILED"; matchId: string; error: string }
  | { type: "ERROR"; message: string }
  | { type: "PONG" };

// ============================================
// QUEUE ENTRY
// ============================================

export interface QueueEntry {
  playerId: string;
  stake: number;
  gameType: GameType;
  asset: string;
  joinedAt: number;
  walletAddress?: string;
  yellowSessionId?: string;
}
