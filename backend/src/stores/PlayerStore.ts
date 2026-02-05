/**
 * Edge60 Backend - Player Store
 *
 * Manages WebSocket connections and player state
 */

import type { WebSocket } from "@fastify/websocket";

interface ConnectedPlayer {
  id: string;
  socket: WebSocket;
  currentMatchId: string | null;
  connectedAt: number;
  yellowSessionId: string | null;
}

/**
 * Player Store - manages WebSocket connections
 */
class PlayerStoreClass {
  private players: Map<string, ConnectedPlayer> = new Map();
  private socketToPlayer: Map<WebSocket, string> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Prune dead connections every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.pruneConnections();
    }, 30000);
  }

  /**
   * Add a connected player
   */
  add(playerId: string, socket: WebSocket): void {
    this.players.set(playerId, {
      id: playerId,
      socket,
      currentMatchId: null,
      connectedAt: Date.now(),
      yellowSessionId: null,
    });
    this.socketToPlayer.set(socket, playerId);
    console.log(
      `[PlayerStore] Player ${playerId} connected. Total: ${this.players.size}`,
    );
  }

  /**
   * Remove a player by ID
   */
  remove(playerId: string): boolean {
    const player = this.players.get(playerId);
    if (player) {
      this.socketToPlayer.delete(player.socket);
    }
    const removed = this.players.delete(playerId);
    if (removed) {
      console.log(
        `[PlayerStore] Player ${playerId} disconnected. Total: ${this.players.size}`,
      );
    }
    return removed;
  }

  /**
   * Get player by ID
   */
  get(playerId: string): ConnectedPlayer | undefined {
    return this.players.get(playerId);
  }

  /**
   * Get player's WebSocket
   */
  getSocket(playerId: string): WebSocket | undefined {
    return this.players.get(playerId)?.socket;
  }

  /**
   * Set player's current match
   */
  setMatch(playerId: string, matchId: string | null): void {
    const player = this.players.get(playerId);
    if (player) {
      player.currentMatchId = matchId;
    }
  }

  /**
   * Set player's Yellow session ID
   */
  setYellowSession(playerId: string, sessionId: string | null): void {
    const player = this.players.get(playerId);
    if (player) {
      player.yellowSessionId = sessionId;
    }
  }

  /**
   * Rename a player (update ID)
   */
  rename(oldId: string, newId: string): boolean {
    if (this.players.has(newId)) return false; // Already exists

    const player = this.players.get(oldId);
    if (player) {
      player.id = newId;
      this.players.delete(oldId);
      this.players.set(newId, player);
      this.socketToPlayer.set(player.socket, newId);
      console.log(`[PlayerStore] Player ${oldId} renamed to ${newId}`);
      return true;
    }
    return false;
  }

  /**
   * Get player ID by socket
   */
  getIdBySocket(socket: WebSocket): string | undefined {
    return this.socketToPlayer.get(socket);
  }

  /**
   * Send message to a specific player
   */
  send(playerId: string, message: object): boolean {
    const socket = this.getSocket(playerId);
    if (socket && socket.readyState === 1) {
      // WebSocket.OPEN = 1
      socket.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  /**
   * Broadcast message to multiple players
   */
  broadcast(playerIds: string[], message: object): void {
    playerIds.forEach((id) => this.send(id, message));
  }

  /**
   * Check if player is connected
   */
  isConnected(playerId: string): boolean {
    const player = this.players.get(playerId);
    return player?.socket?.readyState === 1;
  }

  /**
   * Get all connected player IDs
   */
  getAllIds(): string[] {
    return Array.from(this.players.keys());
  }

  /**
   * Get connected player count
   */
  count(): number {
    return this.players.size;
  }

  /**
   * Prune disconnected or dead connections
   */
  private pruneConnections(): void {
    let pruned = 0;
    for (const [playerId, player] of this.players.entries()) {
      if (player.socket.readyState !== 1) {
        // WebSocket.OPEN = 1
        this.remove(playerId);
        pruned++;
      }
    }
    if (pruned > 0) {
      console.log(`[PlayerStore] Pruned ${pruned} dead connections.`);
    }
  }

  /**
   * Clear all connections (for testing)
   */
  clear(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.players.clear();
    this.socketToPlayer.clear();
  }
}

// Singleton export
export const PlayerStore = new PlayerStoreClass();
