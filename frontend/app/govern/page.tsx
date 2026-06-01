"use client";
export const dynamic = "force-dynamic";

import { useAccount, useReadContract } from "wagmi";
import Link from "next/link";
import { CRED_GOVERNOR_ABI, CRED_GOVERNOR_ADDRESS, ProposalState } from "@/lib/contracts/cred-governor";
import { BASE_CREDIT_TOKEN_ABI, BASE_CREDIT_TOKEN_ADDRESS } from "@/lib/contracts/base-credit-token";
import { formatEther } from "viem";

const PROPOSAL_STATES = ["Pending", "Active", "Canceled", "Defeated", "Succeeded", "Queued", "Expired", "Executed"] as const;
const STATE_COLORS: Record<string, string> = {
  Active: "text-green-400 bg-green-950 border-green-800",
  Succeeded: "text-blue-400 bg-blue-950 border-blue-800",
  Queued: "text-yellow-400 bg-yellow-950 border-yellow-800",
  Executed: "text-zinc-400 bg-zinc-900 border-zinc-700",
  Defeated: "text-red-400 bg-red-950 border-red-800",
  Pending: "text-zinc-400 bg-zinc-900 border-zinc-700",
  Canceled: "text-zinc-500 bg-zinc-900 border-zinc-800",
  Expired: "text-zinc-500 bg-zinc-900 border-zinc-800",
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-sm tracking-tight text-white">BaseCred</span>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-zinc-400 hover:text-white">Home</Link>
          <Link href="/dapp" className="text-zinc-400 hover:text-white">App</Link>
          <Link href="/dividends" className="text-zinc-400 hover:text-white">Dividends</Link>
          <Link href="/govern" className="text-white">Govern</Link>
          <Link href="/sale" className="text-zinc-400 hover:text-white">Token Sale</Link>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16 space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Governance</h1>
            <p className="mt-2 text-zinc-400">baseCREDIT holders vote on protocol parameters.</p>
          </div>
          {canPropose && (
            <Link href="/govern/new" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors">
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
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4 flex items-center justify-between">
            <p className="text-sm text-zinc-300">Activate your voting power by delegating your tokens.</p>
            <Link href="/govern/delegate" className="text-sm text-blue-400 hover:text-blue-300">Delegate</Link>
          </div>
        )}

        {address && (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-1">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Your voting power</p>
              <p className="text-xl font-mono font-semibold text-white">
                {votes !== undefined ? Number(formatEther(votes)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-1">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Proposal threshold</p>
              <p className="text-xl font-mono font-semibold text-white">
                {threshold !== undefined ? Number(formatEther(threshold)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}
              </p>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-500 text-sm">
          Proposal indexing requires a subgraph or event scanner. Connect one to display live proposals.
          <br />
          <span className="text-xs text-zinc-600 mt-2 block">Use The Graph or a custom indexer on Base Sepolia.</span>
        </div>
      </main>
    </div>
  );
}
