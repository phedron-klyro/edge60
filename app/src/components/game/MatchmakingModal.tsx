"use client";

import React from "react";
import Image from "next/image";

interface MatchmakingModalProps {
  onCancel: () => void;
  gameType: string;
  asset: string;
  stake: number;
}

export function MatchmakingModal({
  onCancel,
  gameType,
  asset,
  stake,
}: MatchmakingModalProps) {
  const isTradeDuel = gameType === "TRADE_DUEL";
  const thumbnail = isTradeDuel
    ? "/thumbnails/trade_duel_thumbnail_wide.png"
    : "/thumbnails/prediction_thumbnail.png";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-300">
      {/* Retro Grid Background */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, #444 1px, transparent 1px), linear-gradient(to bottom, #444 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-lg bg-zinc-900 border-4 border-white p-8 shadow-[12px_12px_0px_0px_rgba(255,255,255,0.1)] overflow-hidden">
        {/* Animated Scan Bar */}
        <div className="absolute inset-x-0 h-1 bg-indigo-500/50 shadow-[0_0_15px_#6366f1] animate-[scan_2s_ease-in-out_infinite] z-10" />

        <div className="flex flex-col items-center text-center gap-6 relative z-0">
          <div className="relative h-48 w-full border-2 border-white/20 overflow-hidden bg-black/50">
            <Image
              src={thumbnail}
              alt="Game Mode"
              fill
              className="object-cover opacity-50 contrast-125 grayscale-[0.5]"
            />
            {/* Radar Animation Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 border-2 border-indigo-500/30 rounded-full animate-ping" />
              <div className="absolute w-24 h-24 border-2 border-indigo-500/50 rounded-full animate-[ping_1.5s_infinite]" />
              <div className="absolute w-16 h-16 border-4 border-indigo-500 rounded-full animate-pulse shadow-[0_0_20px_#6366f1]" />
            </div>

            {/* Status Text Overlay */}
            <div className="absolute inset-x-0 bottom-4 flex justify-center">
              <span className="bg-black/80 px-4 py-1 border border-white text-xs font-black tracking-[0.2em] animate-pulse">
                INITIALIZING RADAR...
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-4xl font-black italic tracking-tighter text-white uppercase mt-4">
              Finding <span className="text-indigo-500">Opponent</span>
            </h2>
            <div className="flex items-center justify-center gap-4 text-sm font-bold tracking-widest text-zinc-400 uppercase">
              <span>{isTradeDuel ? "Trade Duel" : "Price Prediction"}</span>
              <span className="w-1 h-1 bg-zinc-700 rounded-full" />
              <span>{asset}</span>
              <span className="w-1 h-1 bg-zinc-700 rounded-full" />
              <span className="text-green-500">${stake} STAKE</span>
            </div>
          </div>

          <div className="w-full h-2 bg-zinc-800 border-2 border-white/10 relative overflow-hidden">
            <div
              className="absolute inset-y-0 bg-indigo-600 animate-[progress_3s_infinite]"
              style={{ width: "40%" }}
            />
          </div>

          <button
            onClick={onCancel}
            className="mt-4 brutal-btn bg-rose-600 text-white font-black py-4 px-12 text-sm hover:bg-rose-500 active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            CANCEL MATCHMAKING
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes scan {
          0%,
          100% {
            top: 0%;
          }
          50% {
            top: 100%;
          }
        }
        @keyframes progress {
          0% {
            left: -40%;
          }
          100% {
            left: 140%;
          }
        }
      `}</style>
    </div>
  );
}
