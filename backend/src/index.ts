/**
 * Edge60 Backend - Entry Point
 * 
 * Real-time USDC prediction duels server
 * 
 * HTTP: http://localhost:3001
 * WebSocket: ws://localhost:3001/ws
 */

import { setupServer } from "./server.js";
import { matchService } from "./services/index.js";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3002;
const HOST = process.env.HOST || "0.0.0.0";

async function main() {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║          EDGE60 BACKEND               ║
  ║   Real-Time USDC Prediction Duels     ║
  ╚═══════════════════════════════════════╝
  `);

  try {
    const server = await setupServer();

    // Graceful shutdown
    const shutdown = async () => {
      console.log("\n[Server] Shutting down...");
      matchService.cleanup();
      await server.close();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    // Start server
    await server.listen({ port: PORT, host: HOST });

    console.log(`
  ┌─────────────────────────────────────────┐
  │ Server running!                         │
  │                                         │
  │ HTTP:      http://localhost:${PORT}        │
  │ WebSocket: ws://localhost:${PORT}/ws       │
  │                                         │
  │ Endpoints:                              │
  │   GET /health  - Health check           │
  │   GET /stats   - Server statistics      │
  │   GET /match/:id - Match details        │
  │   WS  /ws      - WebSocket connection   │
  └─────────────────────────────────────────┘
    `);
  } catch (error) {
    console.error("[Server] Failed to start:", error);
    process.exit(1);
  }
}

main();
