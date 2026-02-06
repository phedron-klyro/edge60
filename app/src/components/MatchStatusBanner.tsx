"use client";

type MatchStatus = "waiting" | "active" | "finished";

interface MatchStatusBannerProps {
  status: MatchStatus;
  message?: string;
}

const statusConfig = {
  waiting: {
    bg: "bg-[var(--color-accent)]",
    text: "text-black",
    icon: "⏳",
    defaultMessage: "WAITING FOR OPPONENT",
  },
  active: {
    bg: "bg-[var(--color-primary)]",
    text: "text-black",
    icon: "⚡",
    defaultMessage: "MATCH IN PROGRESS",
  },
  finished: {
    bg: "bg-[var(--color-surface)]",
    text: "text-white",
    icon: "🏁",
    defaultMessage: "MATCH COMPLETE",
  },
};

export function MatchStatusBanner({ status, message }: MatchStatusBannerProps) {
  const config = statusConfig[status];

  return (
    <div
      className={`
        ${config.bg} ${config.text}
        py-4 px-6
        border-4 border-black
        shadow-[4px_4px_0_0_#000]
        flex items-center justify-center gap-4
      `}
    >
      <span className="text-2xl">{config.icon}</span>
      <span className="text-title tracking-wider">
        {message || config.defaultMessage}
      </span>
      <span className="text-2xl">{config.icon}</span>
    </div>
  );
}
