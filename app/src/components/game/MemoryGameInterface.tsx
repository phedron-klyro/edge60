"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";

interface MemoryGameInterfaceProps {
  matchId: string;
  matchData: any;
  onAction: (action: string, payload: any) => void;
  isMePlayerA: boolean;
}

export function MemoryGameInterface({
  matchId,
  matchData,
  onAction,
  isMePlayerA,
}: MemoryGameInterfaceProps) {
  const grid: string[] = matchData?.grid || [];

  const myState = useMemo(() => {
    return isMePlayerA ? matchData?.playerAState : matchData?.playerBState;
  }, [matchData, isMePlayerA]);

  const opponentState = useMemo(() => {
    return isMePlayerA ? matchData?.playerBState : matchData?.playerAState;
  }, [matchData, isMePlayerA]);

  // Local state for responsive card flipping (optimistic UI)
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [localMatchedCards, setLocalMatchedCards] = useState<Set<number>>(new Set());
  const [isLocked, setIsLocked] = useState(false);
  const [lastMatchedPair, setLastMatchedPair] = useState<number[] | null>(null);
  const lockTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync matched cards from server state (authoritative)
  useEffect(() => {
    if (myState?.matchedPairs) {
      setLocalMatchedCards(new Set(myState.matchedPairs));
    }
  }, [myState?.matchedPairs]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
      }
    };
  }, []);

  const handleCardClick = useCallback(
    (index: number) => {
      // Ignore if locked, already matched, or already selected
      if (isLocked) return;
      if (localMatchedCards.has(index)) return;
      if (selectedCards.includes(index)) return;
      if (selectedCards.length >= 2) return;

      const newSelected = [...selectedCards, index];
      setSelectedCards(newSelected);

      // Send action to server
      onAction("GAME_ACTION", { action: "FLIP_CARD", cardIndex: index });

      // Check for match when 2 cards selected (optimistic)
      if (newSelected.length === 2) {
        setIsLocked(true);
        const [first, second] = newSelected;

        if (grid[first] === grid[second]) {
          // Match found! Brief celebration, then remove
          setLastMatchedPair([first, second]);
          lockTimeoutRef.current = setTimeout(() => {
            setLocalMatchedCards((prev) => {
              const next = new Set(prev);
              next.add(first);
              next.add(second);
              return next;
            });
            setSelectedCards([]);
            setLastMatchedPair(null);
            setIsLocked(false);
          }, 700);
        } else {
          // No match - show cards briefly, then flip back
          lockTimeoutRef.current = setTimeout(() => {
            setSelectedCards([]);
            setIsLocked(false);
          }, 1000);
        }
      }
    },
    [selectedCards, localMatchedCards, isLocked, grid, onAction],
  );

  const isCardRevealed = (index: number) => {
    return selectedCards.includes(index) || localMatchedCards.has(index);
  };

  const isCardMatched = (index: number) => {
    return localMatchedCards.has(index);
  };

  const isJustMatched = (index: number) => {
    return lastMatchedPair?.includes(index) || false;
  };

  const myScore = myState?.score || 0;
  const opponentScore = opponentState?.score || 0;
  const totalPairs = 15;
  const allFound = myScore >= totalPairs;

  // Score bar progress
  const myProgress = (myScore / totalPairs) * 100;
  const oppProgress = (opponentScore / totalPairs) * 100;

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Score Board */}
      <div className="grid grid-cols-3 gap-3 bg-gray-900/60 p-5 rounded-2xl border border-white/10 backdrop-blur-sm">
        {/* My Score */}
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.2em] text-indigo-400/80 mb-1 font-medium">
            You
          </div>
          <div className="text-4xl font-black font-mono text-indigo-400 leading-none">
            {myScore}
          </div>
          <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${myProgress}%` }}
            />
          </div>
          <div className="text-[10px] text-gray-500 mt-1">{myScore}/{totalPairs} pairs</div>
        </div>

        {/* VS */}
        <div className="flex flex-col items-center justify-center">
          <div className="text-xs text-gray-600 uppercase tracking-widest">vs</div>
          <div className="text-lg font-black text-amber-400/60 mt-1">
            {myScore > opponentScore ? "LEADING" : myScore < opponentScore ? "BEHIND" : "TIED"}
          </div>
        </div>

        {/* Opponent Score */}
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.2em] text-rose-400/80 mb-1 font-medium">
            Opponent
          </div>
          <div className="text-4xl font-black font-mono text-rose-400 leading-none">
            {opponentScore}
          </div>
          <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${oppProgress}%` }}
            />
          </div>
          <div className="text-[10px] text-gray-500 mt-1">{opponentScore}/{totalPairs} pairs</div>
        </div>
      </div>

      {/* All Pairs Found Banner */}
      {allFound && (
        <div className="text-center py-3 px-6 bg-green-500/10 border border-green-500/30 rounded-xl animate-pulse">
          <span className="text-green-400 font-bold text-lg">
            All 15 Pairs Found! Waiting for timer...
          </span>
        </div>
      )}

      {/* Memory Grid (5 columns x 6 rows) */}
      <div className="bg-black/50 rounded-2xl border border-white/10 p-4 backdrop-blur-sm">
        <div className="grid grid-cols-6 gap-2.5 max-w-[600px] mx-auto">
          {grid.map((emoji, index) => {
            const revealed = isCardRevealed(index);
            const matched = isCardMatched(index);
            const justMatched = isJustMatched(index);

            return (
              <div
                key={index}
                onClick={() => handleCardClick(index)}
                className="relative aspect-square select-none"
              >
                {/* Card Container */}
                <div
                  className={`memory-card w-full h-full ${revealed ? "flipped" : ""}`}
                >
                  {/* Card Back (hidden state) */}
                  <div
                    className={`memory-card-face memory-card-back ${
                      matched
                        ? "opacity-0 scale-75"
                        : "cursor-pointer hover:brightness-125 active:scale-95"
                    } transition-all duration-300`}
                  >
                    <div className="w-full h-full rounded-xl bg-linear-to-br from-indigo-600 via-purple-600 to-pink-600 border-2 border-white/20 flex items-center justify-center shadow-lg hover:shadow-indigo-500/20 hover:border-white/40">
                      <span className="text-white/40 text-xl font-bold">?</span>
                    </div>
                  </div>

                  {/* Card Front (revealed state) */}
                  <div
                    className={`memory-card-face memory-card-front ${
                      matched && !justMatched
                        ? "opacity-0 scale-75"
                        : justMatched
                          ? "ring-2 ring-green-400 rounded-xl shadow-[0_0_20px_rgba(74,222,128,0.4)]"
                          : ""
                    } transition-all duration-300`}
                  >
                    <div
                      className={`w-full h-full rounded-xl border-2 flex items-center justify-center shadow-lg ${
                        justMatched
                          ? "bg-green-900/60 border-green-400"
                          : "bg-gray-800 border-amber-400/60 shadow-amber-500/10"
                      }`}
                    >
                      <span className="text-3xl sm:text-4xl">{emoji}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Game Info Footer */}
      <div className="flex justify-between items-center text-xs text-gray-500 px-2">
        <span>Total Flips: {myState?.totalFlips || 0}</span>
        <span>
          {localMatchedCards.size / 2} of {totalPairs} pairs matched
        </span>
      </div>

      {/* Card Flip CSS */}
      <style jsx>{`
        .memory-card {
          perspective: 800px;
          transform-style: preserve-3d;
        }
        .memory-card-face {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transition: transform 0.4s ease-in-out;
        }
        .memory-card-back {
          transform: rotateY(0deg);
        }
        .memory-card-front {
          transform: rotateY(180deg);
        }
        .memory-card.flipped .memory-card-back {
          transform: rotateY(180deg);
        }
        .memory-card.flipped .memory-card-front {
          transform: rotateY(0deg);
        }
      `}</style>
    </div>
  );
}
