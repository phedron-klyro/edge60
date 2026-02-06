"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { PriceChart } from "./PriceChart";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

interface TradeDuelInterfaceProps {
  matchId: string;
  asset: string;
  matchData: any;
  onAction: (action: string, payload: any) => void;
  isMePlayerA: boolean;
}

export function TradeDuelInterface({
  asset,
  matchData,
  onAction,
  isMePlayerA,
}: TradeDuelInterfaceProps) {
  // Extract my state
  const myState = useMemo(() => {
    return isMePlayerA ? matchData?.playerAState : matchData?.playerBState;
  }, [matchData, isMePlayerA]);

  const opponentState = useMemo(() => {
    return isMePlayerA ? matchData?.playerBState : matchData?.playerAState;
  }, [matchData, isMePlayerA]);

  // Use the authoritative price from backend (updated every ~2s via GAME_STATE_UPDATE)
  const currentPrice: number =
    matchData?.currentPrice || matchData?.startPrice || 0;

  // Build chart history from backend price updates
  const [history, setHistory] = useState<
    Array<{ time: number; value: number }>
  >(() =>
    matchData?.startPrice
      ? [{ time: Math.floor(Date.now() / 1000), value: matchData.startPrice }]
      : [],
  );

  // Track last price to detect real changes from backend
  const lastPriceRef = useRef<number>(currentPrice);

  useEffect(() => {
    if (!currentPrice || currentPrice === lastPriceRef.current) return;
    lastPriceRef.current = currentPrice;

    const now = Math.floor(Date.now() / 1000);
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      // Ensure time is strictly increasing for lightweight-charts
      if (last && last.time >= now) return prev;
      return [...prev, { time: now, value: currentPrice }].slice(-100);
    });
  }, [currentPrice]);

  const handleBuy = () => {
    onAction("GAME_ACTION", { action: "BUY" });
  };

  const handleSell = () => {
    onAction("GAME_ACTION", { action: "SELL" });
  };

  // Calculate PnL using the real backend price
  const calculateEquity = (state: any) => {
    if (!state) return 0;
    let equity = state.virtualBalance;
    if (state.position) {
      const { entryPrice, size, side } = state.position;
      if (side === "LONG") {
        // Long equity = current value of holdings
        equity = size * currentPrice;
      } else {
        // Short PnL = (Entry - Current) * Size
        // Equity = Collateral + PnL
        const pnl = (entryPrice - currentPrice) * size;
        const collateral = size * entryPrice;
        equity = collateral + pnl;
      }
    }
    return equity;
  };

  const myEquity = calculateEquity(myState);
  const oppEquity = calculateEquity(opponentState);

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Header Stat Bar */}
      <div className="grid grid-cols-2 gap-4 bg-gray-900/50 p-4 rounded-xl border border-white/5">
        <div>
          <div className="text-xs text-gray-400 mb-1">MY EQUITY</div>
          <div
            className={`text-2xl font-bold font-mono ${myEquity >= 10000 ? "text-green-400" : "text-red-400"}`}
          >
            {formatCurrency(myEquity)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {myEquity - 10000 > 0 ? "+" : ""}
            {(myEquity - 10000).toFixed(2)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400 mb-1">OPPONENT EQUITY</div>
          <div className="text-2xl font-bold font-mono text-gray-300">
            {formatCurrency(oppEquity)}
          </div>
        </div>
      </div>

      {/* Main Trading Area */}
      <div className="flex-1 min-h-[400px] flex flex-col bg-black/40 rounded-xl border-4 border-white overflow-hidden relative">
        {/* Chart Background */}
        <div className="absolute inset-0 z-0">
          <PriceChart
            data={history}
            colors={{
              lineColor: "#facc15", // Amber for theme consistency
              areaTopColor: "rgba(250, 204, 21, 0.4)",
              areaBottomColor: "rgba(0, 0, 0, 0)",
            }}
          />
        </div>

        {/* Floating Price Overlay */}
        <div className="relative z-10 p-6 flex flex-col items-center">
          <div className="text-sm uppercase tracking-widest text-zinc-400 mb-1">
            {asset}
          </div>
          <div className="text-5xl font-mono font-bold text-white tracking-tighter drop-shadow-[0_0_10px_rgba(0,0,0,1)]">
            {formatCurrency(currentPrice)}
          </div>

          {/* Position Info */}
          {myState?.position && (
            <div className="mt-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg border-2 border-white/20">
              <span
                className={
                  myState.position.side === "LONG"
                    ? "text-green-400 font-bold"
                    : "text-red-400 font-bold"
                }
              >
                {myState.position.side}
              </span>
              <span className="text-gray-400 mx-2">@</span>
              <span className="font-mono text-white">
                ${myState.position.entryPrice.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Controls */}
        <div className="relative z-10 flex gap-4 w-full px-6 pb-6">
          <button
            onClick={handleBuy}
            className="flex-1 bg-green-500 hover:bg-green-400 text-black font-bold py-4 rounded-xl transition-all active:scale-95 shadow-[0_0_20px_rgba(34,197,94,0.3)] border-b-4 border-green-700"
          >
            BUY / LONG
          </button>
          <button
            onClick={handleSell}
            className="flex-1 bg-red-500 hover:bg-red-400 text-black font-bold py-4 rounded-xl transition-all active:scale-95 shadow-[0_0_20px_rgba(239,68,68,0.3)] border-b-4 border-red-700"
          >
            SELL / SHORT
          </button>
        </div>
      </div>

      {/* Trade History (Mini) */}
      <div className="bg-gray-900/30 rounded-lg p-3 text-xs font-mono h-[100px] overflow-y-auto">
        {myState?.tradeHistory
          ?.slice()
          .reverse()
          .map((trade: any, i: number) => (
            <div
              key={i}
              className="flex justify-between py-1 border-b border-white/5 last:border-0"
            >
              <span
                className={
                  trade.type.includes("LONG") || trade.pnl > 0
                    ? "text-green-400"
                    : "text-red-400"
                }
              >
                {trade.type}
              </span>
              <span className="text-gray-400">
                ${trade.price.toFixed(2)}
                {trade.pnl !== undefined && ` | PnL: ${trade.pnl.toFixed(2)}`}
              </span>
            </div>
          ))}
        {(!myState?.tradeHistory || myState.tradeHistory.length === 0) && (
          <div className="text-gray-600 text-center italic mt-4">
            No trades yet
          </div>
        )}
      </div>
    </div>
  );
}
