/**
 * Edge60 Frontend - Game Context
 *
 * Global state for game/match management
 */

"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  ReactNode,
} from "react";
import { useWebSocket, ServerEvent } from "../hooks/useWebSocket";
import { useYellowSession, YellowSession } from "../hooks/useYellowSession";
import { useAccount } from "wagmi";

// ============================================
// TYPES
// ============================================

export type MatchStatus =
  | "WAITING"
  | "ACTIVE"
  | "COMPLETED"
  | "SETTLING"
  | "SETTLED";
export type Prediction = "UP" | "DOWN";
export type GamePhase = "idle" | "queuing" | "matched" | "playing" | "result";
export type SettlementStatus =
  | "pending"
  | "submitting"
  | "confirming"
  | "confirmed"
  | "failed";

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

export interface Match {
  id: string;
  playerA: string;
  playerB: string | null;
  stake: number;
  status: MatchStatus;
  startTime: number | null;
  endTime: number | null;
  duration: number;
  winner: string | null;
  predictionA: Prediction | null;
  predictionB: Prediction | null;
  asset: string;
  startPrice: number | null;
  endPrice: number | null;
  settlement?: SettlementInfo;
}

interface GameState {
  // Connection
  isConnected: boolean;
  playerId: string | null;

  // Game phase
  phase: GamePhase;
  queuePosition: number;

  // Match
  currentMatch: Match | null;
  myPrediction: Prediction | null;

  // Result
  isWinner: boolean | null;

  // Settlement
  settlementStatus: SettlementStatus | null;
  settlement: SettlementInfo | null;

  // Error
  error: string | null;
}

type GameAction =
  | { type: "SET_CONNECTED"; playerId: string }
  | { type: "SET_DISCONNECTED" }
  | { type: "SET_QUEUING"; position: number }
  | { type: "SET_MATCHED"; match: Match }
  | { type: "SET_PLAYING"; match: Match }
  | { type: "SET_PREDICTION"; prediction: Prediction }
  | { type: "SET_RESULT"; match: Match }
  | { type: "SET_SETTLEMENT_STARTED" }
  | {
      type: "SET_SETTLEMENT_COMPLETE";
      match: Match;
      settlement: SettlementInfo;
    }
  | { type: "SET_SETTLEMENT_FAILED"; error: string }
  | { type: "SET_ERROR"; error: string }
  | { type: "RESET" };

// ============================================
// REDUCER
// ============================================

const initialState: GameState = {
  isConnected: false,
  playerId: null,
  phase: "idle",
  queuePosition: 0,
  currentMatch: null,
  myPrediction: null,
  isWinner: null,
  settlementStatus: null,
  settlement: null,
  error: null,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "SET_CONNECTED":
      return {
        ...state,
        isConnected: true,
        playerId: action.playerId,
        error: null,
      };

    case "SET_DISCONNECTED":
      return { ...initialState };

    case "SET_QUEUING":
      return {
        ...state,
        phase: "queuing",
        queuePosition: action.position,
        error: null,
      };

    case "SET_MATCHED":
      return {
        ...state,
        phase: "matched",
        currentMatch: action.match,
        error: null,
      };

    case "SET_PLAYING":
      return {
        ...state,
        phase: "playing",
        currentMatch: action.match,
        error: null,
      };

    case "SET_PREDICTION":
      return { ...state, myPrediction: action.prediction };

    case "SET_RESULT": {
      const isWinner = action.match.winner === state.playerId;
      return {
        ...state,
        phase: "result",
        currentMatch: action.match,
        isWinner,
        settlementStatus: "pending",
      };
    }

    case "SET_SETTLEMENT_STARTED":
      return {
        ...state,
        settlementStatus: "submitting",
      };

    case "SET_SETTLEMENT_COMPLETE":
      return {
        ...state,
        currentMatch: action.match,
        settlement: action.settlement,
        settlementStatus: "confirmed",
      };

    case "SET_SETTLEMENT_FAILED":
      return {
        ...state,
        settlementStatus: "failed",
        error: action.error,
      };

    case "SET_ERROR":
      return { ...state, error: action.error };

    case "RESET":
      return {
        ...initialState,
        isConnected: state.isConnected,
        playerId: state.playerId,
      };

    default:
      return state;
  }
}

// ============================================
// CONTEXT
// ============================================

interface GameContextValue extends GameState {
  // Actions
  joinQueue: (stake?: number) => void;
  leaveQueue: () => void;
  submitPrediction: (prediction: Prediction) => void;
  playAgain: () => void;
  yellow: YellowSession;
  // Settlement helpers
  isSettling: boolean;
  isSettled: boolean;
}

const GameContext = createContext<GameContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { address } = useAccount();
  const yellow = useYellowSession();

  // Handle WebSocket events
  const handleMessage = useCallback(
    (event: ServerEvent) => {
      switch (event.type) {
        case "QUEUE_JOINED":
          dispatch({ type: "SET_QUEUING", position: event.position as number });
          break;

        case "QUEUE_LEFT":
          dispatch({ type: "RESET" });
          break;

        case "MATCH_FOUND":
          dispatch({ type: "SET_MATCHED", match: event.match as Match });
          break;

        case "START_MATCH":
          if (state.currentMatch) {
            const updatedMatch = {
              ...state.currentMatch,
              startTime: event.startTime as number,
              startPrice: event.startPrice as number,
              status: "ACTIVE" as MatchStatus,
            };
            dispatch({ type: "SET_PLAYING", match: updatedMatch });
          }
          break;

        case "PREDICTION_RECEIVED":
          // Confirmation from server
          break;

        case "MATCH_RESULT":
          dispatch({ type: "SET_RESULT", match: event.match as Match });
          break;

        case "SETTLEMENT_STARTED":
          dispatch({ type: "SET_SETTLEMENT_STARTED" });
          break;

        case "SETTLEMENT_COMPLETE":
          dispatch({
            type: "SET_SETTLEMENT_COMPLETE",
            match: event.match as Match,
            settlement: event.settlement as SettlementInfo,
          });
          break;

        case "SETTLEMENT_FAILED":
          dispatch({
            type: "SET_SETTLEMENT_FAILED",
            error: event.error as string,
          });
          break;

        case "ERROR":
          dispatch({ type: "SET_ERROR", error: event.message as string });
          break;
      }
    },
    [state.currentMatch],
  );

  const handleConnect = useCallback((playerId: string) => {
    dispatch({ type: "SET_CONNECTED", playerId });
  }, []);

  const handleDisconnect = useCallback(() => {
    dispatch({ type: "SET_DISCONNECTED" });
  }, []);

  // WebSocket connection
  const { send, isConnected } = useWebSocket({
    onMessage: handleMessage,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    autoConnect: true,
  });

  // Game actions
  const joinQueue = useCallback(
    (stake: number = 1) => {
      if (!yellow.isInitialised) {
        dispatch({ type: "SET_ERROR", error: "Yellow session not ready" });
        return;
      }

      const offChainBalance = parseFloat(yellow.offChainBalance);
      if (offChainBalance < stake) {
        dispatch({
          type: "SET_ERROR",
          error: `Insufficient off-chain balance. Have ${offChainBalance} USDC, need ${stake} USDC.`,
        });
        return;
      }

      send({
        type: "JOIN_QUEUE",
        stake,
        walletAddress: address,
        yellowSessionId: yellow.sessionId,
      });
    },
    [send, yellow, address],
  );

  const leaveQueue = useCallback(() => {
    send({ type: "LEAVE_QUEUE" });
    dispatch({ type: "RESET" });
  }, [send]);

  const submitPrediction = useCallback(
    (prediction: Prediction) => {
      if (state.currentMatch) {
        send({
          type: "SUBMIT_PREDICTION",
          matchId: state.currentMatch.id,
          prediction,
        });
        dispatch({ type: "SET_PREDICTION", prediction });
      }
    },
    [send, state.currentMatch],
  );

  const playAgain = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  // Settlement status helpers
  const isSettling =
    state.settlementStatus === "pending" ||
    state.settlementStatus === "submitting" ||
    state.settlementStatus === "confirming";
  const isSettled = state.settlementStatus === "confirmed";

  const value: GameContextValue = {
    ...state,
    isConnected,
    joinQueue,
    leaveQueue,
    submitPrediction,
    playAgain,
    yellow,
    isSettling,
    isSettled,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

// ============================================
// HOOK
// ============================================

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}
