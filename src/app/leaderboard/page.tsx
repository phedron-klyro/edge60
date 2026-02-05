"use client";

import Link from "next/link";
import { WalletConnectButton, LeaderboardTable } from "@/components";

export default function Leaderboard() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b-4 border-white p-6 flex items-center justify-between">
        <Link href="/dashboard">
          <h1 className="text-title hover:text-indigo-500 transition-colors">
            EDGE60
          </h1>
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-sm font-bold hover:text-indigo-400 transition-colors"
          >
            ← BACK TO DASHBOARD
          </Link>
          <WalletConnectButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Title Section */}
          <div className="space-y-4 text-center">
            <h2 className="text-display">
              <span className="text-indigo-500">GLOBAL</span> LEADERBOARD
            </h2>
            <p className="text-body text-zinc-400 max-w-2xl mx-auto">
              The world&apos;s most accurate market predictors. High win rates
              can be rewarded with exclusive ENS badges.
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="brutal-card text-center bg-zinc-800 border-indigo-500">
              <p className="text-sm uppercase tracking-widest text-zinc-400">
                Total Wagered
              </p>
              <p className="text-headline text-indigo-400">$2.4M+</p>
            </div>
            <div className="brutal-card text-center bg-zinc-800 border-green-500">
              <p className="text-sm uppercase tracking-widest text-zinc-400">
                Total Payouts
              </p>
              <p className="text-headline text-green-500">$4.1M+</p>
            </div>
            <div className="brutal-card text-center bg-zinc-800 border-rose-500">
              <p className="text-sm uppercase tracking-widest text-zinc-400">
                Active Duels
              </p>
              <p className="text-headline text-rose-500">142</p>
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="brutal-card p-0 overflow-hidden">
            <LeaderboardTable />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-white p-6 text-center">
        <p className="text-sm text-zinc-500 uppercase tracking-widest">
          ENS Profiles update every 24 hours
        </p>
      </footer>
    </div>
  );
}
