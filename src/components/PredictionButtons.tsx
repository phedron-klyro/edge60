"use client";

import { useState } from "react";

type Prediction = "UP" | "DOWN" | null;

interface PredictionButtonsProps {
  onPredict?: (prediction: Prediction) => void;
  disabled?: boolean;
  selected?: Prediction;
  locked?: boolean; // Once locked, no changes allowed
}

export function PredictionButtons({
  onPredict,
  disabled = false,
  selected = null,
  locked = false,
}: PredictionButtonsProps) {
  const [prediction, setPrediction] = useState<Prediction>(selected);

  // Use parent's selected value if provided (controlled mode)
  const currentPrediction = selected ?? prediction;

  // Prevent any changes once a prediction is made (either via prop or local state)
  const isLocked = locked || currentPrediction !== null;

  const handlePredict = (value: "UP" | "DOWN") => {
    if (disabled || isLocked) return;
    setPrediction(value);
    onPredict?.(value);
  };

  const isDisabledOrLocked = disabled || isLocked;

  return (
    <div className="flex flex-col sm:flex-row gap-4 w-full">
      {/* UP Button */}
      <button
        onClick={() => handlePredict("UP")}
        disabled={isDisabledOrLocked}
        className={`
          flex-1 py-8 px-6
          text-headline
          border-4 border-black
          transition-all duration-100
          ${currentPrediction === "UP"
            ? "bg-[var(--color-up)] text-black shadow-[6px_6px_0_0_var(--color-up)] translate-x-[-2px] translate-y-[-2px]"
            : "bg-[var(--color-surface)] text-[var(--color-up)] shadow-[6px_6px_0_0_var(--color-up)]"
          }
          ${isDisabledOrLocked ? "opacity-50 cursor-not-allowed" : "hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_0_var(--color-up)]"}
          active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_var(--color-up)]
        `}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-4xl">▲</span>
          <span>UP</span>
        </div>
      </button>

      {/* DOWN Button */}
      <button
        onClick={() => handlePredict("DOWN")}
        disabled={isDisabledOrLocked}
        className={`
          flex-1 py-8 px-6
          text-headline
          border-4 border-black
          transition-all duration-100
          ${currentPrediction === "DOWN"
            ? "bg-[var(--color-down)] text-white shadow-[6px_6px_0_0_var(--color-down)] translate-x-[-2px] translate-y-[-2px]"
            : "bg-[var(--color-surface)] text-[var(--color-down)] shadow-[6px_6px_0_0_var(--color-down)]"
          }
          ${isDisabledOrLocked ? "opacity-50 cursor-not-allowed" : "hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_0_var(--color-down)]"}
          active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_var(--color-down)]
        `}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-4xl">▼</span>
          <span>DOWN</span>
        </div>
      </button>
    </div>
  );
}
