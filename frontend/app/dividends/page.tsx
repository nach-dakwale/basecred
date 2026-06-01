"use client";
export const dynamic = "force-dynamic";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther } from "viem";
import Link from "next/link";
import { WalletConnect } from "@/components/WalletConnect";
import { BASE_CREDIT_TOKEN_ABI, BASE_CREDIT_TOKEN_ADDRESS } from "@/lib/contracts/base-credit-token";
import { CRED_DIVIDENDS_ABI, CRED_DIVIDENDS_ADDRESS } from "@/lib/contracts/cred-dividends";

export default function DividendsPage() {
  const { address } = useAccount();

  const { data: balance } = useReadContract({
    address: BASE_CREDIT_TOKEN_ADDRESS,
    abi: BASE_CREDIT_TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!BASE_CREDIT_TOKEN_ADDRESS },
  });

  const { data: pending, refetch: refetchPending } = useReadContract({
    address: CRED_DIVIDENDS_ADDRESS,
    abi: CRED_DIVIDENDS_ABI,
    functionName: "pendingReward",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!CRED_DIVIDENDS_ADDRESS },
  });

  const { data: totalDistributed } = useReadContract({
    address: CRED_DIVIDENDS_ADDRESS,
    abi: CRED_DIVIDENDS_ABI,
    functionName: "totalDistributed",
    query: { enabled: !!CRED_DIVIDENDS_ADDRESS },
  });

  const { writeContract, data: claimHash, isPending: claimPending } = useWriteContract();
  const { isLoading: claimConfirming, isSuccess: claimSuccess } = useWaitForTransactionReceipt({ hash: claimHash });

  function handleClaim() {
    if (!CRED_DIVIDENDS_ADDRESS) return;
    writeContract({ address: CRED_DIVIDENDS_ADDRESS, abi: CRED_DIVIDENDS_ABI, functionName: "claim" });
  }

  const isNotConfigured = !BASE_CREDIT_TOKEN_ADDRESS || !CRED_DIVIDENDS_ADDRESS;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-sm tracking-tight text-white">BaseCred</span>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-zinc-400 hover:text-white">Home</Link>
          <Link href="/dapp" className="text-zinc-400 hover:text-white">App</Link>
          <Link href="/dividends" className="text-white">Dividends</Link>
          <Link href="/govern" className="text-zinc-400 hover:text-white">Govern</Link>
          <Link href="/sale" className="text-zinc-400 hover:text-white">Token Sale</Link>
        </nav>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-16 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Dividends</h1>
          <p className="mt-2 text-zinc-400">80% of borrower interest is distributed to baseCREDIT holders.</p>
        </div>

        {isNotConfigured && (
          <div className="rounded-lg border border-yellow-800 bg-yellow-950/30 p-4 text-yellow-400 text-sm">
            Token contracts not yet deployed. Check back after mainnet launch.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 space-y-1">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Your baseCREDIT</p>
            <p className="text-2xl font-mono font-semibold text-white">
              {balance !== undefined ? Number(formatEther(balance)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 space-y-1">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Claimable ETH</p>
            <p className="text-2xl font-mono font-semibold text-white">
              {pending !== undefined ? Number(formatEther(pending)).toFixed(6) : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 space-y-1 sm:col-span-2">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Total interest distributed (all time)</p>
            <p className="text-2xl font-mono font-semibold text-white">
              {totalDistributed !== undefined ? `${Number(formatEther(totalDistributed)).toFixed(4)} ETH` : "—"}
            </p>
          </div>
        </div>

        {!address ? (
          <WalletConnect onAddress={() => {}} />
        ) : (
          <button
            onClick={handleClaim}
            disabled={!pending || pending === 0n || claimPending || claimConfirming || isNotConfigured}
            className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {claimPending || claimConfirming ? "Claiming..." : claimSuccess ? "Claimed!" : "Claim ETH"}
          </button>
        )}

        <p className="text-xs text-zinc-600">
          Dividends accumulate automatically as borrowers repay loans. Claim any time — no lockup.
          Holding baseCREDIT without self-delegating still earns dividends.
        </p>
      </main>
    </div>
  );
}
