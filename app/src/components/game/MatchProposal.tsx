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
  const [timeLeft, setTimeLeft] = useState(30);

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

  const [hasAccepted, setHasAccepted] = useState(false);

  const handleAccept = () => {
    setHasAccepted(true);
    onAccept();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
      <div className="bg-zinc-900 w-full max-w-lg border-4 border-yellow-500 p-10 shadow-[20px_20px_0px_0px_rgba(234,179,8,0.2)] relative overflow-hidden">
        {/* Retro Header Accent */}
        <div className="absolute top-0 left-0 w-full h-2 bg-yellow-500" />
        <div className="absolute top-4 right-4 text-yellow-500/20 text-6xl font-black italic select-none">
          FOUND
        </div>

        <div className="relative z-10 text-center mb-8">
          <div className="inline-block bg-yellow-500 text-black px-6 py-2 mb-4 font-black italic skew-x-[-15deg] shadow-[4px_4px_0px_#fff]">
            MATCH FOUND
          </div>
          <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase mt-2">
            Opponent{" "}
            <span className="text-yellow-500 underline decoration-4">
              Ready
            </span>
          </h2>
          <p className="text-zinc-500 font-bold mt-2 uppercase tracking-widest text-xs">
            Duel request incoming...
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-10">
          <div className="bg-black/40 border-2 border-white/5 p-4 relative group">
            <div className="absolute -top-3 left-4 bg-zinc-900 px-2 text-[10px] font-black tracking-widest text-zinc-500 uppercase">
              Stake
            </div>
            <div className="text-3xl font-black text-green-500">
              ${proposal.stake}
            </div>
          </div>
          <div className="bg-black/40 border-2 border-white/5 p-4 relative group">
            <div className="absolute -top-3 left-4 bg-zinc-900 px-2 text-[10px] font-black tracking-widest text-zinc-500 uppercase">
              Asset
            </div>
            <div className="text-2xl font-black text-white italic">
              {proposal.asset}
            </div>
          </div>
          <div className="bg-black/40 border-2 border-white/5 p-4 relative col-span-2">
            <div className="absolute -top-3 left-4 bg-zinc-900 px-2 text-[10px] font-black tracking-widest text-zinc-500 uppercase">
              Game Type
            </div>
            <div className="text-xl font-black text-yellow-500">
              {proposal.gameType === "TRADE_DUEL"
                ? "⚡ SKILL TRADE DUEL"
                : "🔮 PRICE PREDICTION"}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 relative z-10">
          {hasAccepted ? (
            <div className="w-full bg-green-600/20 border-2 border-green-500 text-green-500 font-black py-5 text-center flex items-center justify-center gap-3 animate-pulse">
              <span className="text-2xl">✓</span>
              <span>STATE: READY</span>
            </div>
          ) : (
            <button
              onClick={handleAccept}
              className="w-full brutal-btn bg-yellow-500 text-black text-xl font-black py-5 hover:bg-yellow-400 active:translate-x-1 active:translate-y-1 active:shadow-none shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)]"
            >
              ACCEPT DUEL ({timeLeft}s)
            </button>
          )}

          <button
            onClick={onDecline}
            disabled={hasAccepted}
            className="w-full text-zinc-500 font-black uppercase tracking-widest text-sm hover:text-rose-500 transition-colors py-2 disabled:opacity-0"
          >
            DECLINE
          </button>
        </div>

        {/* Static Background Grid Decoration */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
      </div>
    </div>
  );
}
