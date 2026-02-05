/**
 * Edge60 Backend - WebSocket Event Handlers
 *
 * Handles all WebSocket message events from clients
 */

import type { WebSocket } from "@fastify/websocket";
import { v4 as uuidv4 } from "uuid";
import { ClientEvent, Prediction } from "../types/index.js";
import { PlayerStore, MatchmakingQueue } from "../stores/index.js";
import { matchService, matchmakingService } from "../services/index.js";

/**
 * Handle new WebSocket connection
 */
export function handleConnection(socket: WebSocket): string {
  // Generate a temporary player ID (in production, this would be the wallet address)
  const playerId = `player_${uuidv4().slice(0, 8)}`;

  PlayerStore.add(playerId, socket);

  // Send welcome message with assigned ID
  socket.send(
    JSON.stringify({
      type: "CONNECTED",
      playerId,
      message: "Welcome to Edge60! Ready to duel.",
    }),
  );

  console.log(`\n🔌 [CONNECTED] ${playerId}`);
  return playerId;
}

/**
 * Handle WebSocket disconnection
 */
export function handleDisconnect(playerId: string): void {
  // Remove from queue if present
  MatchmakingQueue.remove(playerId);

  // Check if player is in an active match
  const player = PlayerStore.get(playerId);
  if (player?.currentMatchId) {
    const match = matchService.getMatch(player.currentMatchId);
    if (match && match.status === "WAITING") {
      // Cancel waiting match
      matchService.cancelMatch(match.id, "Player disconnected");
    }
    // For active matches, let them complete normally
  }

  // Remove player connection
  PlayerStore.remove(playerId);
  console.log(`🔌 [DISCONNECTED] ${playerId}\n`);
}

/**
 * Handle incoming WebSocket message
 */
export async function handleMessage(
  playerId: string,
  data: string,
): Promise<void> {
  let event: ClientEvent;

  try {
    event = JSON.parse(data) as ClientEvent;
  } catch {
    PlayerStore.send(playerId, {
      type: "ERROR",
      message: "Invalid JSON message",
    });
    return;
  }

  console.log(`📨 [MESSAGE] ${playerId}: ${event.type}`);

  switch (event.type) {
    case "JOIN_QUEUE":
      await handleJoinQueue(
        playerId,
        event.stake,
        event.walletAddress,
        event.yellowSessionId,
      );
      break;

    case "LEAVE_QUEUE":
      handleLeaveQueue(playerId);
      break;

    case "SUBMIT_PREDICTION":
      handleSubmitPrediction(playerId, event.matchId, event.prediction);
      break;

    case "PING":
      PlayerStore.send(playerId, { type: "PONG" });
      break;

    default:
      PlayerStore.send(playerId, {
        type: "ERROR",
        message: `Unknown event type`,
      });
  }
}

/**
 * Handle JOIN_QUEUE event
 */
async function handleJoinQueue(
  playerId: string,
  stake: number,
  walletAddress?: string,
  yellowSessionId?: string,
): Promise<void> {
  let activePlayerId = playerId;

  // Associate session and re-identify if wallet address is provided
  // We prioritize the real wallet address over session ID
  const newIdentity =
    walletAddress ||
    (yellowSessionId?.startsWith("0x") ? yellowSessionId : null);

  if (newIdentity) {
    const success = PlayerStore.rename(playerId, newIdentity);
    if (success) {
      activePlayerId = newIdentity;
      // Send message to client about the ID change
      PlayerStore.send(activePlayerId, {
        type: "CONNECTED",
        playerId: activePlayerId,
        message: `Identity updated to ${walletAddress ? "wallet address" : "session address"}.`,
      });
    }
    if (yellowSessionId) {
      PlayerStore.setYellowSession(activePlayerId, yellowSessionId);
    }
  }

  // Validate stake amount (1 USDC is the fixed stake for Edge60)
  const validStakes = [1, 10, 25, 50, 100];
  if (!validStakes.includes(stake)) {
    PlayerStore.send(playerId, {
      type: "ERROR",
      message: `Invalid stake amount. Valid options: ${validStakes.join(", ")} USDC`,
    });
    return;
  }

  // Async: may involve price fetching if match is found
  const result = await matchmakingService.joinQueue(
    activePlayerId,
    stake,
    walletAddress,
    yellowSessionId,
  );

  if (result.match) {
    console.log(
      `✓ [MATCHED] ${activePlayerId} → Match ${result.match.id.slice(0, 8)}...`,
    );
  } else {
    console.log(`⏳ [QUEUED] ${activePlayerId} at position ${result.position}`);
  }
}

/**
 * Handle LEAVE_QUEUE event
 */
function handleLeaveQueue(playerId: string): void {
  const removed = matchmakingService.leaveQueue(playerId);

  PlayerStore.send(playerId, {
    type: removed ? "QUEUE_LEFT" : "ERROR",
    message: removed ? "Left queue" : "Not in queue",
  });

  if (removed) {
    console.log(`👋 [LEFT QUEUE] ${playerId}`);
  }
}

/**
 * Handle SUBMIT_PREDICTION event
 */
function handleSubmitPrediction(
  playerId: string,
  matchId: string,
  prediction: Prediction,
): void {
  // Validate prediction
  if (prediction !== "UP" && prediction !== "DOWN") {
    PlayerStore.send(playerId, {
      type: "ERROR",
      message: "Invalid prediction. Must be 'UP' or 'DOWN'",
    });
    return;
  }

  const success = matchService.submitPrediction(matchId, playerId, prediction);

  if (success) {
    PlayerStore.send(playerId, {
      type: "PREDICTION_RECEIVED",
      matchId,
    });
  } else {
    PlayerStore.send(playerId, {
      type: "ERROR",
      message:
        "Could not submit prediction. Match may be invalid or not active.",
    });
  }
}
