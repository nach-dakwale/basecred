"use client";

import type { ScoreBreakdown } from "@/lib/scoring";

interface Props {
  breakdown: ScoreBreakdown;
  loading:   boolean;
  onRefresh: () => void;
}

const TIER_LABELS = ["No tier", "Tier 1", "Tier 2", "Tier 3", "Tier 4 (Uncollateralized)"];
const TIER_COLORS = [
  "text-zinc-500", "text-blue-400", "text-blue-400", "text-blue-400", "text-blue-400",
];

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="w-full rounded-full bg-zinc-800 h-1.5 overflow-hidden">
      <div
        className="h-1.5 rounded-full bg-blue-600 transition-all duration-700"
        style={{ width: `${(score / 650) * 100}%` }}
      />
    </div>
  );
}

export function ScoreCard({ breakdown, loading, onRefresh }: Props) {
  if (loading) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 animate-pulse space-y-3">
        <div className="h-7 w-20 bg-zinc-800 rounded" />
        <div className="h-1.5 w-full bg-zinc-800 rounded-full" />
        <div className="h-4 w-28 bg-zinc-800 rounded" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 space-y-4 text-zinc-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Credit Score</p>
          <p className="text-4xl font-bold tracking-tight text-white mt-0.5">{breakdown.score}</p>
          <p className={`text-xs font-medium mt-1 ${TIER_COLORS[breakdown.tier]}`}>
            {TIER_LABELS[breakdown.tier]}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Max Loan</p>
          <p className="text-xl font-semibold text-white mt-0.5">{breakdown.maxLoanEth} ETH</p>
          <p className="text-xs text-zinc-500 mt-1">
            {breakdown.collateralPct === 0
              ? "No collateral required"
              : `${breakdown.collateralPct}% collateral`}
          </p>
        </div>
      </div>

      <ScoreBar score={breakdown.score} />

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-md bg-zinc-800/60 border border-zinc-700/50 p-3">
          <p className="text-xs text-zinc-500">Web3 Contributions</p>
          <p className="font-medium text-white mt-0.5">+{breakdown.web3Points} pts</p>
        </div>
        <div className="rounded-md bg-zinc-800/60 border border-zinc-700/50 p-3">
          <p className="text-xs text-zinc-500">Other Open Source</p>
          <p className="font-medium text-white mt-0.5">+{breakdown.ossPoints} pts</p>
        </div>
        <div className="rounded-md bg-zinc-800/60 border border-zinc-700/50 p-3">
          <p className="text-xs text-zinc-500">Personal Activity</p>
          <p className="font-medium text-white mt-0.5">+{breakdown.personalPoints} pts</p>
        </div>
        <div className="rounded-md bg-zinc-800/60 border border-zinc-700/50 p-3">
          <p className="text-xs text-zinc-500">Account Age</p>
          <p className="font-medium text-white mt-0.5">+{breakdown.ageBonus} pts</p>
        </div>
      </div>

      <button
        onClick={onRefresh}
        className="w-full text-center text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        Refresh score
      </button>
    </div>
  );
}
