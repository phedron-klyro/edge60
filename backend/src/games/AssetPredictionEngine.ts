/**
 * Edge60 - Asset Prediction Game Engine
 *
 * Handles the classic "Up/Down" prediction game.
 * Supports ETH/USD, BTC/USD, SOL/USD
 */

import { IGameEngine } from "./IGameEngine.js";
import { Match, Prediction } from "../types/index.js";
import { PriceService } from "../services/PriceService.js";

interface PredictionMatchData {
  startPrice: number;
  endPrice: number | null;
  predictionA: Prediction | null;
  predictionB: Prediction | null;
}

export class AssetPredictionEngine implements IGameEngine {
  /**
   * Initialize match with start price
   */
  async onStart(match: Match): Promise<Partial<Match>> {
    console.log(
      `[PredictionEngine] Starting match ${match.id} for ${match.asset}`,
    );

    const priceData = await PriceService.getPrice(match.asset);

    return {
      matchData: {
        startPrice: priceData.price,
        endPrice: null,
        predictionA: null,
        predictionB: null,
      } as PredictionMatchData,
    };
  }

  /**
   * Handle prediction submission
   */
  onAction(
    match: Match,
    playerId: string,
    actionType: string,
    payload: any,
  ): boolean {
    if (actionType !== "SUBMIT_PREDICTION") return false;

    const prediction = payload.prediction as Prediction;
    const data = match.matchData as PredictionMatchData;

    if (match.playerA === playerId) {
      data.predictionA = prediction;
    } else if (match.playerB === playerId) {
      data.predictionB = prediction;
    } else {
      return false;
    }

    return true;
  }

  /**
   * No periodic updates needed for Prediction game
   */
  async onUpdate(match: Match): Promise<Partial<Match>> {
    return {};
  }

  /**
   * Calculate winner based on price movement
   */
  async onComplete(match: Match): Promise<Partial<Match>> {
    const data = match.matchData as PredictionMatchData;
    const startPrice = data.startPrice;

    // Fetch end price
    const priceData = await PriceService.getFreshPrice(match.asset);
    const endPrice = priceData.price;

    data.endPrice = endPrice;

    // Calculate movement
    const priceDiff = endPrice - startPrice;
    const priceUnchanged = priceDiff === 0;
    const correctPrediction: Prediction | null = priceUnchanged
      ? null
      : priceDiff > 0
        ? "UP"
        : "DOWN";

    let winner: string | null = null;
    const predA = data.predictionA;
    const predB = data.predictionB;

    if (priceUnchanged) {
      winner = null; // Draw
    } else if (!predA && !predB) {
      winner = null; // Draw
    } else if (!predA && predB) {
      winner = match.playerB; // B wins by default
    } else if (predA && !predB) {
      winner = match.playerA; // A wins by default
    } else if (predA === correctPrediction && predB !== correctPrediction) {
      winner = match.playerA;
    } else if (predB === correctPrediction && predA !== correctPrediction) {
      winner = match.playerB;
    } else {
      winner = null; // Both correct or both wrong -> Draw
    }

    console.log(
      `[PredictionEngine] Result: ${winner ? "Winner " + winner : "Draw"}`,
    );
    console.log(
      `[PredictionEngine] Price: ${startPrice} -> ${endPrice} (${correctPrediction})`,
    );

    return {
      winner,
      matchData: data,
    };
  }
}
