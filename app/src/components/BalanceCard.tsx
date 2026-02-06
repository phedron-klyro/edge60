"use client";

interface BalanceCardProps {
  balance: number;
  symbol?: string;
  label?: string;
}

export function BalanceCard({
  balance,
  symbol = "USDC",
  label = "Balance",
}: BalanceCardProps) {
  return (
    <div className="brutal-card">
      <p className="text-sm uppercase tracking-widest text-(--color-text-muted) mb-2">
        {label}
      </p>
      <div className="flex items-baseline gap-3">
        <span className="text-headline text-(--color-primary)">
          {balance.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
        <span className="text-title text-(--color-text-muted)">{symbol}</span>
      </div>
      <div className="mt-4 pt-4 border-t-2 border-(--color-surface-alt)">
        <p className="text-sm text-(--color-text-muted)">Ready to duel</p>
      </div>
    </div>
  );
}
