"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { encodeFunctionData } from "viem";
import Link from "next/link";
import { CRED_GOVERNOR_ABI, CRED_GOVERNOR_ADDRESS } from "@/lib/contracts/cred-governor";

const POOL_SETTERS = [
  { label: "Set interest rate (BPS)", fn: "setInterestBps", argLabel: "BPS (e.g. 1000 = 10%)", argType: "uint256" },
  { label: "Set protocol fee (BPS)", fn: "setProtocolFeeBps", argLabel: "BPS (e.g. 2000 = 20%)", argType: "uint256" },
  { label: "Set max total principal (ETH)", fn: "setMaxTotalPrincipal", argLabel: "Wei amount", argType: "uint256" },
] as const;

export default function NewProposalPage() {
  const { address } = useAccount();
  const [description, setDescription] = useState("");
  const [selectedAction, setSelectedAction] = useState(0);
  const [argValue, setArgValue] = useState("");
  const [targetAddress, setTargetAddress] = useState("");

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!CRED_GOVERNOR_ADDRESS || !description || !targetAddress || !argValue) return;

    const action = POOL_SETTERS[selectedAction];
    const calldata = encodeFunctionData({
      abi: [{ name: action.fn, type: "function", stateMutability: "nonpayable", inputs: [{ name: "value", type: action.argType }], outputs: [] }],
      functionName: action.fn,
      args: [BigInt(argValue)],
    });

    writeContract({
      address: CRED_GOVERNOR_ADDRESS,
      abi: CRED_GOVERNOR_ABI,
      functionName: "propose",
      args: [
        [targetAddress as `0x${string}`],
        [0n],
        [calldata],
        description,
      ],
    });
  }

  if (!address) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <p className="text-zinc-400">Connect your wallet to create a proposal.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
        <Link href="/govern" className="text-zinc-400 hover:text-white text-sm">← Governance</Link>
        <span className="font-semibold text-sm text-white">New Proposal</span>
      </header>

      <main className="mx-auto max-w-xl px-6 py-16">
        <h1 className="text-2xl font-bold text-white mb-8">Create Proposal</h1>

        {isSuccess ? (
          <div className="rounded-lg border border-green-800 bg-green-950/30 p-6 text-center space-y-3">
            <p className="text-green-400 font-medium">Proposal submitted</p>
            <p className="text-zinc-400 text-sm">Voting starts after the 1-day delay.</p>
            <Link href="/govern" className="text-blue-400 text-sm hover:text-blue-300">View all proposals</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Action</label>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(Number(e.target.value))}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {POOL_SETTERS.map((a, i) => (
                  <option key={a.fn} value={i}>{a.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Target contract address</label>
              <input
                value={targetAddress}
                onChange={(e) => setTargetAddress(e.target.value)}
                placeholder="0x..."
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-zinc-400">{POOL_SETTERS[selectedAction].argLabel}</label>
              <input
                value={argValue}
                onChange={(e) => setArgValue(e.target.value)}
                placeholder="0"
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Explain the rationale for this change..."
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={!description || !argValue || !targetAddress || isPending || confirming || !CRED_GOVERNOR_ADDRESS}
              className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isPending || confirming ? "Submitting..." : "Submit Proposal"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
