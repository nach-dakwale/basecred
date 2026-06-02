"use client";
export const dynamic = "force-dynamic";

import { useAccount, useReadContract } from "wagmi";
import Link from "next/link";
import { CRED_GOVERNOR_ABI, CRED_GOVERNOR_ADDRESS, ProposalState } from "@/lib/contracts/cred-governor";
import { SiteNav } from "@/components/SiteNav";
import { BASE_CREDIT_TOKEN_ABI, BASE_CREDIT_TOKEN_ADDRESS } from "@/lib/contracts/base-credit-token";
import { formatEther } from "viem";

const PROPOSAL_STATES = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"] as const;
const STATE_COLORS: Record<string, string> = {
  Active: "text-green-400 bg-green-950 border-green-800",
  Succeeded: "text-[#3FB950] bg-violet-950 border-[#2EA043]",
  Queued: "text-yellow-400 bg-yellow-950 border-yellow-800",
  Executed: "text-[#8B949E] bg-[#161B22] border-[#30363D]",
  Defeated: "text-red-400 bg-red-950 border-red-800",
  Pending: "text-[#8B949E] bg-[#161B22] border-[#30363D]",
  Canceled: "text-[#6E7681] bg-[#161B22] border-[#30363D]",
  Expired: "text-[#6E7681] bg-[#161B22] border-[#30363D]",
};

export default function GovernPage() {
  const { address } = useAccount();
  const isNotConfigured = !CRED_GOVERNOR_ADDRESS || !BASE_CREDIT_TOKEN_ADDRESS;

  const { data: votes } = useReadContract({
    address: BASE_CREDIT_TOKEN_ADDRESS,
    abi: BASE_CREDIT_TOKEN_ABI,
    functionName: "getVotes",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!BASE_CREDIT_TOKEN_ADDRESS },
  });

  const { data: delegates } = useReadContract({
    address: BASE_CREDIT_TOKEN_ADDRESS,
    abi: BASE_CREDIT_TOKEN_ABI,
    functionName: "delegates",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!BASE_CREDIT_TOKEN_ADDRESS },
  });

  const { data: threshold } = useReadContract({
    address: CRED_GOVERNOR_ADDRESS,
    abi: CRED_GOVERNOR_ABI,
    functionName: "proposalThreshold",
    query: { enabled: !!CRED_GOVERNOR_ADDRESS },
  });

  const notDelegated = delegates === "0x0000000000000000000000000000000000000000" || !delegates;
  const canPropose = votes !== undefined && threshold !== undefined && votes >= threshold;

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#E6EDF3]">
      <SiteNav activePath="/govern" />

      <main className="mx-auto max-w-3xl px-6 py-16 space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Governance</h1>
            <p className="mt-2 text-[#8B949E]">baseCREDIT holders vote on protocol parameters.</p>
          </div>
          {canPropose && (
            <Link href="/govern/new" className="rounded-md bg-[#238636] px-4 py-2 text-sm font-medium text-white hover:bg-[#2EA043] transition-colors">
              New Proposal
            </Link>
          )}
        </div>

        {isNotConfigured && (
          <div className="rounded-lg border border-yellow-800 bg-yellow-950/30 p-4 text-yellow-400 text-sm">
            Governance contracts not yet deployed.
          </div>
        )}

        {address && notDelegated && (
          <div className="rounded-lg border border-[#30363D] bg-[#161B22] p-4 flex items-center justify-between">
            <p className="text-sm text-[#E6EDF3]">Activate your voting power by delegating your tokens.</p>
            <Link href="/govern/delegate" className="text-sm text-[#3FB950] hover:text-[#3FB950]">Delegate</Link>
          </div>
        )}

        {address && (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-[#30363D] bg-[#161B22] p-4 space-y-1">
              <p className="text-xs text-[#6E7681] uppercase tracking-wider">Your voting power</p>
              <p className="text-xl font-mono font-semibold text-white">
                {votes !== undefined ? Number(formatEther(votes)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-[#30363D] bg-[#161B22] p-4 space-y-1">
              <p className="text-xs text-[#6E7681] uppercase tracking-wider">Proposal threshold</p>
              <p className="text-xl font-mono font-semibold text-white">
                {threshold !== undefined ? Number(formatEther(threshold)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}
              </p>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-[#30363D] bg-[#161B22] p-8 text-center text-[#6E7681] text-sm">
          Proposal indexing requires a subgraph or event scanner. Connect one to display live proposals.
          <br />
          <span className="text-xs text-[#6E7681] mt-2 block">Use The Graph or a custom indexer on Base Sepolia.</span>
        </div>
      </main>
    </div>
  );
}
