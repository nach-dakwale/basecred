"use client";

import type { ScoreBreakdown } from "@/lib/scoring";

interface Props {
  breakdown: ScoreBreakdown;
  loading:   boolean;
  onRefresh: () => void;
}

const TIER_LABELS = ["No tier", "Tier 1", "Tier 2", "Tier 3", "Tier 4 (Uncollateralized)"];
const TIER_COLORS = [
  "text-[#8B949E]", "text-[#3FB950]", "text-[#3FB950]", "text-[#3FB950]", "text-[#3FB950]",
];

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: "#21262D" }}>
      <div
        className="h-1.5 rounded-full transition-all duration-700"
        style={{
          width: `${(score / 650) * 100}%`,
          background: "linear-gradient(90deg, #196C2E, #3FB950)",
        }}
      />
    </div>
  );
}

export function ScoreCard({ breakdown, loading, onRefresh }: Props) {
  if (loading) {
    return (
      <div className="rounded-md border border-[#30363D] bg-[#161B22] p-5 animate-pulse space-y-3">
        <div className="h-7 w-20 rounded" style={{ background: "#21262D" }} />
        <div className="h-1.5 w-full rounded-full" style={{ background: "#21262D" }} />
        <div className="h-4 w-28 rounded" style={{ background: "#21262D" }} />
      </div>
    );
  }

  return (
    <div className="rounded-md border border-[#30363D] bg-[#161B22] p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[#8B949E] uppercase tracking-wider font-medium">Credit Score</p>
          <p className="text-4xl font-bold tracking-tight text-white mt-0.5">{breakdown.score}</p>
          <p className={`text-xs font-medium mt-1 ${TIER_COLORS[breakdown.tier]}`}>
            {TIER_LABELS[breakdown.tier]}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#8B949E] uppercase tracking-wider font-medium">Max Loan</p>
          <p className="text-xl font-semibold text-white mt-0.5">{breakdown.maxLoanEth} ETH</p>
          <p className="text-xs text-[#8B949E] mt-1">
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
          <div key={item.label} className="rounded-md border border-[#30363D] p-3" style={{ background: "#0D1117" }}>
            <p className="text-xs text-[#8B949E]">{item.label}</p>
            <p className="font-semibold text-white mt-0.5">{item.value}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onRefresh}
        className="w-full text-center text-xs text-[#6E7681] hover:text-[#8B949E] transition-colors"
      >
        Refresh score
      </button>
    </div>
  );
}
