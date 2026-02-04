"use client";

import { useState, useEffect } from "react";

interface CountdownTimerProps {
  duration: number; // seconds
  onComplete?: () => void;
  autoStart?: boolean;
}

export function CountdownTimer({
  duration,
  onComplete,
  autoStart = true,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(autoStart);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, timeLeft, onComplete]);

  const percentage = (timeLeft / duration) * 100;
  const isUrgent = timeLeft <= 10;

  return (
    <div className="brutal-card text-center">
      <p className="text-sm uppercase tracking-widest text-(--color-text-muted) mb-4">
        Time Remaining
      </p>

      <div
        className={`text-display ${
          isUrgent
            ? "text-(--color-secondary) animate-countdown"
            : "text-(--color-primary)"
        }`}
      >
        {timeLeft.toString().padStart(2, "0")}
      </div>

      <p className="text-title text-(--color-text-muted) mt-2">SECONDS</p>

      {/* Progress bar */}
      <div className="mt-6 h-4 bg-(--color-surface-alt) border-2 border-(--border-color)">
        <div
          className={`h-full transition-all duration-1000 ${
            isUrgent ? "bg-(--color-secondary)" : "bg-(--color-primary)"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
