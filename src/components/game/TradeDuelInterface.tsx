"use client";

import React, { useState, useEffect, useMemo } from "react";

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
  matchId,
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

  // Current Price (from last trade or start price)
  // Ideally this comes from a hook with live websocket price,
  // but for now we use state updates or passed props if available.
  // In a real app, we'd have a `usePrice(asset)` hook.
  // Simulating live price update from matchData if available, usually matchData
  // only updates on action.

  const [localPrice, setLocalPrice] = useState(matchData?.startPrice || 0);

  useEffect(() => {
    // Simulate price ticker for better UI feel (random walk around start price)
    // In production, this would be a real price feed subscription.
    const interval = setInterval(() => {
      setLocalPrice((p: number) => p * (1 + (Math.random() - 0.5) * 0.001));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleBuy = () => {
    onAction("GAME_ACTION", { action: "BUY" });
  };

  const handleSell = () => {
    onAction("GAME_ACTION", { action: "SELL" });
  };

  // Calculate PnL locally for display
  const calculateEquity = (state: any) => {
    if (!state) return 0;
    let equity = state.virtualBalance;
    if (state.position) {
      const { entryPrice, size, side } = state.position;
      const currentVal =
        side === "LONG"
          ? size * localPrice
          : size * (2 * entryPrice - localPrice); // Simplified short logic
      if (side === "LONG") {
        equity = size * localPrice;
      } else {
        // Short PnL = (Entry - Current) * Size
        // Equity = Collateral + PnL
        // We assumed full balance used as collateral
        const pnl = (entryPrice - localPrice) * size;
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
      <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center bg-black/20 rounded-xl relative overflow-hidden">
        {/* Chart Placeholder */}
        <div className="absolute inset-0 opacity-10 flex items-center justify-center">
          <span className="text-9xl font-bold text-white">CHART</span>
        </div>

        <div className="z-10 text-center mb-8">
          <div className="text-sm text-gray-400 mb-2">{asset}</div>
          <div className="text-5xl font-mono font-bold text-white tracking-tighter">
            {formatCurrency(localPrice)}
          </div>
        </div>

        {/* Position Info */}
        {myState?.position && (
          <div className="z-10 bg-white/5 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 mb-8">
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
            <span className="font-mono">
              ${myState.position.entryPrice.toFixed(2)}
            </span>
          </div>
        )}

        {/* Controls */}
        <div className="z-10 flex gap-4 w-full px-8">
          <button
            onClick={handleBuy}
            className="flex-1 bg-green-500 hover:bg-green-400 text-black font-bold py-4 rounded-xl transition-all active:scale-95 shadow-[0_0_30px_rgba(34,197,94,0.3)]"
          >
            BUY / LONG
          </button>
          <button
            onClick={handleSell}
            className="flex-1 bg-red-500 hover:bg-red-400 text-black font-bold py-4 rounded-xl transition-all active:scale-95 shadow-[0_0_30px_rgba(239,68,68,0.3)]"
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
