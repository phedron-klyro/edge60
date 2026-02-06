/**
 * Edge60 Backend - Fastify Server
 *
 * HTTP + WebSocket server setup
 */

import Fastify from "fastify";
import websocket from "@fastify/websocket";
import {
  handleConnection,
  handleDisconnect,
  handleMessage,
} from "./handlers/websocket.js";
import { MatchStore, PlayerStore, MatchmakingQueue } from "./stores/index.js";
import {
  matchmakingService,
  matchService,
  dbService,
  TreasuryService,
} from "./services/index.js";
import cors from "@fastify/cors";

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

  // Register CORS
  await fastify.register(cors, {
    origin: true, // Allow all origins in dev
  });

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
  fastify.get<{ Params: { id: string } }>(
    "/match/:id",
    async (request, reply) => {
      const match = matchService.getMatch(request.params.id);
      if (!match) {
        reply.status(404);
        return { error: "Match not found" };
      }
      return match;
    },
  );

  /**
   * Get leaderboard
   */
  fastify.get("/api/leaderboard", async () => {
    return await dbService.getLeaderboard();
  });

  /**
   * Get contract stats (live from EdgeTreasury)
   */
  fastify.get("/api/contract-stats", async () => {
    return await TreasuryService.getStats();
  });

  /**
   * Get player stats
   */
  fastify.get<{ Params: { address: string } }>(
    "/api/player/:address",
    async (request, reply) => {
      const stats = await dbService.getPlayerStats(request.params.address);
      if (!stats) {
        reply.status(404);
        return { error: "Player not found" };
      }
      return stats;
    },
  );

  /**
   * Get player match history
   */
  fastify.get<{ Params: { address: string } }>(
    "/api/player/:address/history",
    async (request, reply) => {
      const history = await dbService.getPlayerHistory(request.params.address);
      return history;
    },
  );

  // ============================================
  // WEBSOCKET ROUTE
  // ============================================

  fastify.get("/ws", { websocket: true }, (socket, request) => {
    // Handle new connection
    handleConnection(socket);

    // Handle incoming messages
    socket.on("message", (message: Buffer) => {
      const data = message.toString();
      const currentPlayerId = PlayerStore.getIdBySocket(socket);
      if (currentPlayerId) {
        handleMessage(currentPlayerId, data);
      }
    });

    // Handle disconnection
    socket.on("close", () => {
      const currentPlayerId = PlayerStore.getIdBySocket(socket);
      if (currentPlayerId) {
        handleDisconnect(currentPlayerId);
      }
    });

    // Handle errors
    socket.on("error", (error: any) => {
      const currentPlayerId = PlayerStore.getIdBySocket(socket);
      console.error(
        `[WS] Error for ${currentPlayerId || "unknown"}:`,
        error.message,
      );
      if (currentPlayerId) {
        handleDisconnect(currentPlayerId);
      }
    });
  });

  return fastify;
}

export { setupServer };
