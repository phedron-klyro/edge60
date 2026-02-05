import { MatchModel } from "../db/models/Match.js";
import { PlayerModel } from "../db/models/Player.js";
import { Match } from "../types/index.js";

/**
 * Database Service - handles persistence logic
 */
export class DatabaseService {
  /**
   * Save or update a match in the database
   */
  async saveMatch(match: Match): Promise<void> {
    try {
      await MatchModel.findOneAndUpdate({ id: match.id }, match, {
        upsert: true,
        new: true,
      });
      console.log(`[Database] Saved match ${match.id}`);
    } catch (error) {
      console.error(`[Database] Failed to save match ${match.id}:`, error);
    }
  }

  /**
   * Update player stats after a match
   */
  async updatePlayerStats(
    playerId: string,
    isWinner: boolean,
    stake: number,
    ensName: string | null = null,
  ): Promise<void> {
    try {
      const update: any = {
        $inc: {
          wins: isWinner ? 1 : 0,
          losses: isWinner ? 0 : 1,
          duelsPlayed: 1,
          totalVolume: stake,
        },
        $set: {
          lastSeen: new Date(),
        },
      };

      if (ensName) {
        update.$set.ensName = ensName;
      }

      await PlayerModel.findOneAndUpdate({ address: playerId }, update, {
        upsert: true,
        new: true,
      });
      console.log(`[Database] Updated stats for player ${playerId}`);
    } catch (error) {
      console.error(
        `[Database] Failed to update player ${playerId} stats:`,
        error,
      );
    }
  }

  /**
   * Get leaderboard data
   */
  async getLeaderboard(limit: number = 10) {
    try {
      const players = await PlayerModel.find()
        .sort({ wins: -1, duelsPlayed: -1 })
        .limit(limit);
      return players;
    } catch (error) {
      console.error("[Database] Failed to fetch leaderboard:", error);
      return [];
    }
  }

  /**
   * Get player stats
   */
  async getPlayerStats(address: string) {
    try {
      return await PlayerModel.findOne({ address });
    } catch (error) {
      console.error(
        `[Database] Failed to fetch player ${address} stats:`,
        error,
      );
      return null;
    }
  }
}

export const dbService = new DatabaseService();
