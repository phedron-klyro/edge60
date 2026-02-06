"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

interface VersusAnimationProps {
  playerA: {
    name: string;
    avatar?: string;
  };
  playerB: {
    name: string;
    avatar?: string;
  };
  gameType: string;
  onComplete: () => void;
}

export function VersusAnimation({
  playerA,
  playerB,
  gameType,
  onComplete,
}: VersusAnimationProps) {
  const [phase, setPhase] = useState<"intro" | "vs" | "outro">("intro");

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase("vs"), 1000);
    const timer2 = setTimeout(() => setPhase("outro"), 2500);
    const timer3 = setTimeout(onComplete, 3500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  const isTradeDuel = gameType === "TRADE_DUEL";
  const bgImage = isTradeDuel
    ? "/thumbnails/trade_duel_thumbnail_wide.png"
    : "/thumbnails/prediction_thumbnail.png";

  return (
    <div className="fixed inset-0 z-100 bg-black flex items-center justify-center overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 opacity-40 grayscale contrast-150">
        <Image
          src={bgImage}
          alt="Background"
          fill
          className="object-cover blur-sm"
        />
      </div>

      {/* Retro Flash Overlay */}
      <div className="absolute inset-0 bg-white opacity-0 animate-[flash_0.5s_ease-out_2s_forwards] pointer-events-none" />

      {/* Player Left (A) */}
      <div
        className={`absolute left-0 top-1/2 -translate-y-1/2 w-1/2 h-[60vh] bg-indigo-900/80 border-y-8 border-white transition-all duration-700 ease-out flex items-center justify-end px-12 ${
          phase === "intro" ? "-translate-x-full" : "translate-x-0"
        }`}
      >
        <div className="text-right">
          <div className="w-48 h-48 border-4 border-white mb-4 relative overflow-hidden bg-black">
            <Image
              src="/thumbnails/prediction_thumbnail.png"
              alt={`${playerA.name} Avatar`}
              fill
              className="object-cover"
            />
          </div>
          <h3 className="text-4xl font-black text-white italic truncate uppercase">
            {playerA.name}
          </h3>
          <p className="text-indigo-400 font-bold tracking-widest uppercase">
            Challenger
          </p>
        </div>
      </div>

      {/* Player Right (B) */}
      <div
        className={`absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-[60vh] bg-rose-900/80 border-y-8 border-white transition-all duration-700 ease-out flex items-center justify-start px-12 ${
          phase === "intro" ? "translate-x-full" : "translate-x-0"
        }`}
      >
        <div className="text-left">
          <div className="w-48 h-48 border-4 border-white mb-4 relative overflow-hidden bg-black">
            <Image
              src="/thumbnails/trade_duel_thumbnail_wide.png"
              alt={`${playerB.name} Avatar`}
              fill
              className="object-cover"
            />
          </div>
          <h3 className="text-4xl font-black text-white italic truncate uppercase">
            {playerB.name}
          </h3>
          <p className="text-rose-400 font-bold tracking-widest uppercase">
            Opponent
          </p>
        </div>
      </div>

      {/* VS Splash */}
      <div
        className={`relative z-20 transition-all duration-300 ${
          phase === "vs"
            ? "opacity-100 scale-100 rotate-0"
            : "opacity-0 scale-[5] -rotate-12"
        }`}
      >
        <div className="bg-yellow-400 text-black px-8 py-4 border-4 border-white shadow-[8px_8px_0px_#000] rotate-[-5deg]">
          <span className="text-8xl font-black italic">VS</span>
        </div>
      </div>

      {/* Diagonal Line Transition */}
      <div
        className={`absolute inset-0 bg-black rotate-25 scale-[3] transition-all duration-1000 ease-in-out z-50 pointer-events-none ${
          phase === "outro"
            ? "translate-y-0 opacity-100"
            : "translate-y-[150%] opacity-0"
        }`}
      />

      <style jsx>{`
        @keyframes flash {
          0% {
            opacity: 0;
          }
          50% {
            opacity: 0.8;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
