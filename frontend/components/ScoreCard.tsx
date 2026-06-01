"use client";

import type { ScoreBreakdown } from "@/lib/scoring";

interface Props {
  breakdown: ScoreBreakdown;
  loading:   boolean;
  onRefresh: () => void;
}

const TIER_LABELS = ["No tier", "Tier 1", "Tier 2", "Tier 3", "Tier 4 (Uncollateralized)"];
const TIER_COLORS = [
  "text-slate-500", "text-violet-400", "text-violet-400", "text-cyan-400", "text-cyan-400",
];

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="w-full rounded-full bg-slate-800 h-1.5 overflow-hidden">
      <div
        className="h-1.5 rounded-full transition-all duration-700"
        style={{
          width: `${(score / 650) * 100}%`,
          background: "linear-gradient(90deg, #7c3aed, #22d3ee)",
        }}
      />
    </div>
  );
}

export function ScoreCard({ breakdown, loading, onRefresh }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-5 animate-pulse space-y-3">
        <div className="h-7 w-20 bg-slate-800 rounded" />
        <div className="h-1.5 w-full bg-slate-800 rounded-full" />
        <div className="h-4 w-28 bg-slate-800 rounded" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-5 space-y-4 text-slate-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Credit Score</p>
          <p className="text-4xl font-bold tracking-tight mt-0.5 bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            {breakdown.score}
          </p>
          <p className={`text-xs font-medium mt-1 ${TIER_COLORS[breakdown.tier]}`}>
            {TIER_LABELS[breakdown.tier]}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Max Loan</p>
          <p className="text-xl font-semibold text-white mt-0.5">{breakdown.maxLoanEth} ETH</p>
          <p className="text-xs text-slate-500 mt-1">
            {breakdown.collateralPct === 0
              ? "No collateral required"
              : `${breakdown.collateralPct}% collateral`}
          </p>
        </div>
      </div>

      <ScoreBar score={breakdown.score} />

      <div className="grid grid-cols-2 gap-2 text-sm">
        {[
          { label: "Web3 Contributions", value: `+${breakdown.web3Points} pts` },
          { label: "Other Open Source",  value: `+${breakdown.ossPoints} pts` },
          { label: "Personal Activity",  value: `+${breakdown.personalPoints} pts` },
          { label: "Account Age",        value: `+${breakdown.ageBonus} pts` },
        ].map((item) => (
          <div key={item.label} className="rounded-lg bg-slate-800/50 border border-slate-700/40 p-3">
            <p className="text-xs text-slate-500">{item.label}</p>
            <p className="font-semibold text-white mt-0.5">{item.value}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onRefresh}
        className="w-full text-center text-xs text-slate-600 hover:text-slate-400 transition-colors"
      >
        Refresh score
      </button>
    </div>
  );
}
