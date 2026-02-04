/**
 * Edge60 Backend - Fastify Server
 * 
 * HTTP + WebSocket server setup
 */

import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { handleConnection, handleDisconnect, handleMessage } from "./handlers/websocket.js";
import { MatchStore, PlayerStore, MatchmakingQueue } from "./stores/index.js";
import { matchmakingService, matchService } from "./services/index.js";

// Create Fastify instance
const fastify = Fastify({
  logger: true, // Simple logger without pino-pretty
});

/**
 * Setup routes and WebSocket
 */
async function setupServer() {
  // Register WebSocket plugin
  await fastify.register(websocket);

  // ============================================
  // HTTP ROUTES
  // ============================================

  /**
   * Health check endpoint
   */
  fastify.get("/health", async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  /**
   * Server stats endpoint
   */
  fastify.get("/stats", async () => {
    const queueStats = matchmakingService.getStats();
    return {
      players: {
        connected: PlayerStore.count(),
      },
      matches: {
        total: MatchStore.count(),
        active: MatchStore.getActive().length,
      },
      queue: queueStats,
    };
  });

  /**
   * Get match by ID
   */
  fastify.get<{ Params: { id: string } }>("/match/:id", async (request, reply) => {
    const match = matchService.getMatch(request.params.id);
    if (!match) {
      reply.status(404);
      return { error: "Match not found" };
    }
    return match;
  });

  // ============================================
  // WEBSOCKET ROUTE
  // ============================================

  fastify.get("/ws", { websocket: true }, (socket, request) => {
    // Handle new connection
    const playerId = handleConnection(socket);

    // Handle incoming messages
    socket.on("message", (message: Buffer) => {
      const data = message.toString();
      handleMessage(playerId, data);
    });

    // Handle disconnection
    socket.on("close", () => {
      handleDisconnect(playerId);
    });

    // Handle errors
    socket.on("error", (error: any) => {
      console.error(`[WS] Error for ${playerId}:`, error.message);
      handleDisconnect(playerId);
    });
  });

  return fastify;
}

export { setupServer };
