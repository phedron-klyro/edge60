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

interface TradeDuelResults {
  initialBalance: number;
  playerAFinalBalance: number;
  playerBFinalBalance: number;
  playerAProfit: number;
  playerBProfit: number;
  playerAProfitPercent: number;
  playerBProfitPercent: number;
}

interface TradeDuelData {
  startPrice: number;
  endPrice: number | null;
  initialBalance: number;
  playerAState: PlayerState;
  playerBState: PlayerState;
  results?: TradeDuelResults;
}

const INITIAL_BALANCE = 10000; // $10,000 Virtual Cash

export class TradeDuelEngine implements IGameEngine {
  /**
   * Initialize with $10k virtual balance
   * Locks start price at match initiation
   */
  async onStart(match: Match): Promise<Partial<Match>> {
    const priceData = await PriceService.getPrice(match.asset);
    const startPrice = priceData.price;

    const initialState: PlayerState = {
      virtualBalance: INITIAL_BALANCE,
      position: null,
      tradeHistory: [],
    };

    return {
      // Sync start price to top-level for consistency
      startPrice,
      matchData: {
        startPrice,
        endPrice: null,
        initialBalance: INITIAL_BALANCE,
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
   * Determine winner by portfolio value (highest profit wins)
   * Locks end price at match completion
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
    const initialBalance = INITIAL_BALANCE;

    // Calculate profit/loss for each player
    const profitA = balanceA - initialBalance;
    const profitB = balanceB - initialBalance;

    console.log(
      `[TradeDuel] End Balances - A: $${balanceA.toFixed(2)} (PnL: ${profitA >= 0 ? '+' : ''}${profitA.toFixed(2)}), B: $${balanceB.toFixed(2)} (PnL: ${profitB >= 0 ? '+' : ''}${profitB.toFixed(2)})`,
    );

    // Determine winner based on profit
    let winner: string | null = null;
    
    // If both are non-profitable (both <= 0), it's a draw
    if (profitA <= 0 && profitB <= 0) {
      winner = null; // Draw - neither made profit
      console.log(`[TradeDuel] Result: DRAW (both non-profitable)`);
    } else if (profitA > profitB) {
      winner = match.playerA;
      console.log(`[TradeDuel] Result: Player A wins with higher profit`);
    } else if (profitB > profitA && match.playerB) {
      winner = match.playerB;
      console.log(`[TradeDuel] Result: Player B wins with higher profit`);
    } else {
      winner = null; // Draw - same profit
      console.log(`[TradeDuel] Result: DRAW (same profit)`);
    }

    // Store trade duel specific results in matchData
    (data as any).results = {
      initialBalance,
      playerAFinalBalance: balanceA,
      playerBFinalBalance: balanceB,
      playerAProfit: profitA,
      playerBProfit: profitB,
      playerAProfitPercent: (profitA / initialBalance) * 100,
      playerBProfitPercent: (profitB / initialBalance) * 100,
    };

    return {
      winner,
      // Sync prices to top-level for consistency
      startPrice: data.startPrice,
      endPrice,
      matchData: data,
    };
  }
}
