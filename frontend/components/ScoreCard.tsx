"use client";

import type { ScoreBreakdown } from "@/lib/scoring";

interface Props {
  breakdown: ScoreBreakdown;
  loading:   boolean;
  onRefresh: () => void;
}

const TIER_LABELS = ["No tier", "Tier 1", "Tier 2", "Tier 3", "Tier 4 (Uncollateralized)"];
const TIER_COLORS = [
  "text-zinc-400", "text-blue-600", "text-blue-600", "text-blue-600", "text-blue-600",
];

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="w-full rounded-full bg-zinc-100 h-3 overflow-hidden">
      <div
        className="h-3 rounded-full bg-blue-600 transition-all duration-700"
        style={{ width: `${(score / 650) * 100}%` }}
      />
    </div>
  );
}

export function ScoreCard({ breakdown, loading, onRefresh }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-200 p-6 animate-pulse space-y-4">
        <div className="h-8 w-24 bg-zinc-100 rounded" />
        <div className="h-3 w-full bg-zinc-100 rounded-full" />
        <div className="h-4 w-32 bg-zinc-100 rounded" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4 text-zinc-900">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-500">Credit Score</p>
          <p className="text-5xl font-bold tracking-tight">{breakdown.score}</p>
          <p className={`text-sm font-medium mt-1 ${TIER_COLORS[breakdown.tier]}`}>
            {TIER_LABELS[breakdown.tier]}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-zinc-500">Max Loan</p>
          <p className="text-2xl font-semibold">{breakdown.maxLoanEth} ETH</p>
          <p className="text-xs text-zinc-400 mt-1">
            {breakdown.collateralPct === 0
              ? "No collateral required"
              : `${breakdown.collateralPct}% collateral`}
          </p>
        </div>
      </div>

      <ScoreBar score={breakdown.score} />

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-zinc-50 p-3">
          <p className="text-zinc-500">Web3 Contributions</p>
          <p className="font-semibold">+{breakdown.web3Points} pts</p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3">
          <p className="text-zinc-500">Other Open Source</p>
          <p className="font-semibold">+{breakdown.ossPoints} pts</p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3">
          <p className="text-zinc-500">Personal Activity</p>
          <p className="font-semibold">+{breakdown.personalPoints} pts</p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3">
          <p className="text-zinc-500">Account Age</p>
          <p className="font-semibold">+{breakdown.ageBonus} pts</p>
        </div>
      </div>

      <button
        onClick={onRefresh}
        className="w-full text-center text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
      >
        Refresh score
      </button>
    </div>
  );
}
