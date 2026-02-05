"use client";

import React, { useState, useEffect } from "react";

interface MatchProposalProps {
  proposal: {
    matchId: string;
    stake: number;
    gameType: string;
    asset: string;
    expiresAt: number;
  };
  onAccept: () => void;
  onDecline: () => void;
}

export function MatchProposal({
  proposal,
  onAccept,
  onDecline,
}: MatchProposalProps) {
  const [timeLeft, setTimeLeft] = useState(10);

  useEffect(() => {
    const updateTime = () => {
      const remaining = Math.max(
        0,
        Math.ceil((proposal.expiresAt - Date.now()) / 1000),
      );
      setTimeLeft(remaining);
      if (remaining === 0) {
        onDecline(); // Auto-decline on timeout
      }
    };

    updateTime(); // init
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [proposal.expiresAt, onDecline]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#1A1A1A] w-full max-w-md rounded-2xl border border-yellow-500/30 p-8 text-center shadow-[0_0_50px_rgba(234,179,8,0.1)] relative overflow-hidden">
        {/* Animated Background Gradient */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent animate-pulse" />

        <div className="mb-6">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 to-yellow-500">
            MATCH FOUND!
          </h2>
          <p className="text-gray-400 mt-2">An opponent is ready to duel.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
          <div className="bg-black/30 p-3 rounded-lg border border-white/5">
            <div className="text-gray-500 text-xs mb-1">STAKE</div>
            <div className="text-xl font-bold text-white">
              ${proposal.stake}
            </div>
          </div>
          <div className="bg-black/30 p-3 rounded-lg border border-white/5">
            <div className="text-gray-500 text-xs mb-1">ASSET</div>
            <div className="text-xl font-bold text-white">{proposal.asset}</div>
          </div>
          <div className="bg-black/30 p-3 rounded-lg border border-white/5 col-span-2">
            <div className="text-gray-500 text-xs mb-1">GAME TYPE</div>
            <div className="text-lg font-bold text-yellow-500">
              {proposal.gameType === "TRADE_DUEL"
                ? "⚡ SKILL TRADE DUEL"
                : "🔮 PREDICTION"}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onAccept}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 rounded-xl transition-all active:scale-95 shadow-[0_0_20px_rgba(234,179,8,0.4)]"
          >
            ACCEPT MATCH ({timeLeft}s)
          </button>
          <button
            onClick={onDecline}
            className="w-full bg-white/5 hover:bg-white/10 text-gray-400 font-bold py-3 rounded-xl transition-all"
          >
            DECLINE
          </button>
        </div>
      </div>
    </div>
  );
}
