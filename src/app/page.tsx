"use client";

import Link from "next/link";
import { WalletConnectButton } from "@/components";
import { useAccount } from "wagmi";

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b-4 border-white p-6 flex items-center justify-between">
        <h1 className="text-title">EDGE60</h1>
        <WalletConnectButton />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-4xl text-center space-y-8">
          {/* Hero */}
          <div className="space-y-4">
            <h2 className="text-display">
              <span className="text-[var(--color-primary)]">PREDICT.</span>
              <br />
              <span className="text-[var(--color-secondary)]">DUEL.</span>
              <br />
              <span className="text-[var(--color-accent)]">WIN.</span>
            </h2>
          </div>

          {/* Tagline */}
          <p className="text-body text-[var(--color-text-muted)] max-w-lg mx-auto">
            Real-time USDC prediction duels. Stake, predict the market in 60
            seconds, winner takes all. Powered by state channels for instant
            payouts.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 my-12">
            <div className="brutal-card text-center min-w-[150px]">
              <p className="text-headline text-[var(--color-primary)]">60</p>
              <p className="text-sm uppercase tracking-wider text-[var(--color-text-muted)]">
                Seconds
              </p>
            </div>
            <div className="brutal-card text-center min-w-[150px]">
              <p className="text-headline text-[var(--color-accent)]">$10</p>
              <p className="text-sm uppercase tracking-wider text-[var(--color-text-muted)]">
                Min Stake
              </p>
            </div>
            <div className="brutal-card text-center min-w-[150px]">
              <p className="text-headline text-[var(--color-secondary)]">2x</p>
              <p className="text-sm uppercase tracking-wider text-[var(--color-text-muted)]">
                Payout
              </p>
            </div>
          </div>

          {/* CTA */}
          {isConnected ? (
            <Link href="/dashboard">
              <button className="brutal-btn brutal-btn-primary text-xl">
                🎮 Enter Dashboard
              </button>
            </Link>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-[var(--color-text-muted)]">
                Connect your wallet to start dueling
              </p>
              <WalletConnectButton />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-white p-6 flex items-center justify-between">
        <p className="text-sm text-[var(--color-text-muted)]">
          Built for HackMoney 2026
        </p>
        <div className="flex gap-6">
          <span className="text-sm text-[var(--color-text-muted)]">
            Base Sepolia
          </span>
          <span className="text-sm text-[var(--color-primary)]">● LIVE</span>
        </div>
      </footer>
    </div>
  );
}
