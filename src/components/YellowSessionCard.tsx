/**
 * Edge60 Frontend - Yellow Session Card
 */

"use client";

import { useState } from "react";
import { YellowSession } from "@/hooks/useYellowSession";

interface YellowSessionCardProps {
  yellow: YellowSession;
}

export function YellowSessionCard({ yellow }: YellowSessionCardProps) {
  const [depositAmount, setDepositAmount] = useState("1.0");

  const handleDeposit = async () => {
    try {
      await yellow.deposit(depositAmount);
      alert(`Successfully deposited ${depositAmount} USDC off-chain!`);
    } catch (error: any) {
      alert(`Deposit failed: ${error.message || "Unknown error"}`);
    }
  };

  return (
    <div className="brutal-card bg-indigo-900/20 border-indigo-500">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-indigo-400 font-bold">
            Yellow Network Session
          </p>
          <h3 className="text-2xl font-black mt-1">
            ${yellow.offChainBalance}{" "}
            <span className="text-sm font-normal text-zinc-400">
              USDC (Off-chain)
            </span>
          </h3>
        </div>
        <div
          className={`px-2 py-1 rounded text-xs font-bold ${yellow.isInitialised ? "bg-green-500" : "bg-red-500"}`}
        >
          {yellow.isInitialised ? "ACTIVE" : "OFFLINE"}
        </div>
      </div>

      <div className="space-y-4">
        <div className="text-xs text-zinc-500 font-mono truncate">
          Session ID: {yellow.sessionId || "initializing..."}
        </div>

        <div className="flex gap-4 items-center">
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            className="w-1/2 bg-zinc-900 border-2 border-white p-2 text-white font-bold outline-none focus:border-indigo-500 transition-colors"
            placeholder="Amount"
            step="1"
            min="1"
          />
          <button
            onClick={handleDeposit}
            disabled={!yellow.isInitialised || yellow.isLoading}
            className="brutal-btn bg-indigo-600 px-4 py-2 text-sm disabled:opacity-50"
          >
            {yellow.isLoading ? "..." : "➕ DEPOSIT"}
          </button>
        </div>

        <p className="text-[10px] text-zinc-400 leading-tight">
          * Off-chain funds are locked in a Yellow state channel for instant,
          gasless matches.
        </p>
      </div>
    </div>
  );
}
