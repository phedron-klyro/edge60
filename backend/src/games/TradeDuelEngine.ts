/**
 * Edge60 - Trade Duel Game Engine
 *
 * Skill-based game where players trade against live prices.
 * Goal: Highest PnL at end of session.
 */

import { IGameEngine } from "./IGameEngine.js";
import { Match } from "../types/index.js";
import { PriceService } from "../services/PriceService.js";

interface Position {
  entryPrice: number;
  size: number; // in units of asset
  side: "LONG" | "SHORT";
  openedAt: number;
}

interface PlayerState {
  virtualBalance: number; // Cash
  position: Position | null;
  tradeHistory: any[];
}

interface TradeDuelData {
  startPrice: number;
  endPrice: number | null;
  playerAState: PlayerState;
  playerBState: PlayerState;
}

const INITIAL_BALANCE = 10000; // $10,000 Virtual Cash

export class TradeDuelEngine implements IGameEngine {
  /**
   * Initialize with $10k virtual balance
   */
  async onStart(match: Match): Promise<Partial<Match>> {
    const priceData = await PriceService.getPrice(match.asset);

    const initialState: PlayerState = {
      virtualBalance: INITIAL_BALANCE,
      position: null,
      tradeHistory: [],
    };

    return {
      matchData: {
        startPrice: priceData.price,
        endPrice: null,
        playerAState: JSON.parse(JSON.stringify(initialState)),
        playerBState: JSON.parse(JSON.stringify(initialState)),
      } as TradeDuelData,
    };
  }

  /**
   * Handle BUY / SELL actions
   */
  onAction(
    match: Match,
    playerId: string,
    actionType: string,
    payload: any,
  ): boolean {
    if (actionType !== "GAME_ACTION") return false;

    const action = payload.action; // "BUY" or "SELL"
    const data = match.matchData as TradeDuelData;

    // Get player state
    let state: PlayerState;
    if (match.playerA === playerId) state = data.playerAState;
    else if (match.playerB === playerId) state = data.playerBState;
    else return false;

    const currentPrice =
      PriceService.getLastPrice(match.asset)?.price || data.startPrice;

    // Simple Logic:
    // BUY -> Close Short if exists, Open Long
    // SELL -> Close Long if exists, Open Short

    if (action === "BUY") {
      this.executeBuy(state, currentPrice);
    } else if (action === "SELL") {
      this.executeSell(state, currentPrice);
    } else {
      return false;
    }

    return true;
  }

  /**
   * Close Short, Open Long
   */
  private executeBuy(state: PlayerState, price: number) {
    // 1. Close existing position if any
    if (state.position) {
      this.closePosition(state, price);
    }

    // 2. Open LONG with full balance
    const size = state.virtualBalance / price;
    state.position = {
      entryPrice: price,
      size,
      side: "LONG",
      openedAt: Date.now(),
    };

    // Deduct cash (moved to asset)
    state.virtualBalance = 0;

    state.tradeHistory.push({
      type: "OPEN_LONG",
      price,
      size,
      time: Date.now(),
    });
  }

  /**
   * Close Long, Open Short
   */
  private executeSell(state: PlayerState, price: number) {
    // 1. Close existing position if any
    if (state.position) {
      this.closePosition(state, price);
    }

    // 2. Open SHORT (simulated)
    // For simplicity: We "sell" equivalent of full balance worth
    // Short PnL = (Entry - Current) * Size
    const notional = state.virtualBalance;
    const size = notional / price;

    state.position = {
      entryPrice: price,
      size,
      side: "SHORT",
      openedAt: Date.now(),
    };

    // Cash remains, we track PnL separately for Short?
    // Simplified: Lock cash as collateral
    state.virtualBalance = 0; // Locked in position

    state.tradeHistory.push({
      type: "OPEN_SHORT",
      price,
      size,
      time: Date.now(),
    });
  }

  /**
   * Close position and update balance
   */
  private closePosition(state: PlayerState, price: number) {
    if (!state.position) return;

    const { entryPrice, size, side } = state.position;
    let pnl = 0;

    if (side === "LONG") {
      // Value = Size * Price
      const currentValue = size * price;
      state.virtualBalance = currentValue;
      pnl = currentValue - size * entryPrice;
    } else {
      // Short PnL = (Entry - CMS) * Size
      pnl = (entryPrice - price) * size;
      // Return original collateral + PnL
      const originalCollateral = size * entryPrice;
      state.virtualBalance = originalCollateral + pnl;
    }

    state.tradeHistory.push({
      type: "CLOSE_" + side,
      price,
      pnl,
      time: Date.now(),
    });
    state.position = null;
  }

  /**
   * Periodic PnL updates could be sent here
   */
  async onUpdate(match: Match): Promise<Partial<Match>> {
    // We could calculate unrealized PnL here to broadcast
    return {};
  }

  /**
   * Determine winner by portfolio value
   */
  async onComplete(match: Match): Promise<Partial<Match>> {
    const data = match.matchData as TradeDuelData;
    const endPrice = (await PriceService.getFreshPrice(match.asset)).price;
    data.endPrice = endPrice;

    // Close all positions at end price
    this.closePosition(data.playerAState, endPrice);
    this.closePosition(data.playerBState, endPrice);

    const balanceA = data.playerAState.virtualBalance;
    const balanceB = data.playerBState.virtualBalance;

    console.log(
      `[TradeDuel] End Balances - A: $${balanceA.toFixed(2)}, B: $${balanceB.toFixed(2)}`,
    );

    let winner: string | null = null;
    if (balanceA > balanceB) winner = match.playerA;
    else if (balanceB > balanceA && match.playerB) winner = match.playerB;
    else winner = null; // Draw

    return {
      winner,
      matchData: data,
    };
  }
}
