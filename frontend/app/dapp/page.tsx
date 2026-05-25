"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import lazyLoad from "next/dynamic";
import { signIn, signOut, useSession } from "next-auth/react";
import { useReadContract } from "wagmi";
import { ABI, CONTRACT_ADDRESS } from "@/lib/contract";
import type { ScoreBreakdown } from "@/lib/scoring";

const WalletConnect = lazyLoad(
  () => import("@/components/WalletConnect").then((m) => ({ default: m.WalletConnect })),
  { ssr: false }
);
const ScoreCard = lazyLoad(
  () => import("@/components/ScoreCard").then((m) => ({ default: m.ScoreCard })),
  { ssr: false }
);
const LoanPanel = lazyLoad(
  () => import("@/components/LoanPanel").then((m) => ({ default: m.LoanPanel })),
  { ssr: false }
);

export default function DappPage() {
  const { data: session, status } = useSession();
  const [ethAddress, setEthAddress]     = useState<string | null>(null);
  const [breakdown, setBreakdown]       = useState<ScoreBreakdown | null>(null);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [oracleLoading, setOracleLoading] = useState(false);
  const [recentTx, setRecentTx]         = useState<string | null>(null);

  const githubConnected  = status === "authenticated";
  const walletConnected  = !!ethAddress;
  const scoreSubmitted   = !!breakdown;

  const { data: activeLoan } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi:     ABI,
    functionName: "loans",
    args:    ethAddress ? [ethAddress as `0x${string}`] : undefined,
    query:   { enabled: !!ethAddress },
  });

  // wagmi returns struct fields as a tuple: [amount, collateral, dueBlock, active]
  const loanTuple = activeLoan as readonly [bigint, bigint, bigint, boolean] | undefined;
  const activeLoanData = loanTuple?.[3]
    ? { amount: loanTuple[0], collateral: loanTuple[1], dueBlock: loanTuple[2], active: loanTuple[3] }
    : null;

  const fetchScore = useCallback(async () => {
    setScoreLoading(true);
    try {
      const res = await fetch("/api/score");
      if (res.ok) {
        const data = await res.json();
        setBreakdown(data.breakdown);
      }
    } finally {
      setScoreLoading(false);
    }
  }, []);

  useEffect(() => { if (githubConnected) fetchScore(); }, [githubConnected, fetchScore]);

  async function submitScoreOnChain() {
    if (!ethAddress) return;
    setOracleLoading(true);
    try {
      const res = await fetch("/api/oracle", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ethAddress }),
      });
      if (res.ok) {
        const data = await res.json();
        setBreakdown(data.breakdown);
        setRecentTx(data.txHash);
      }
    } finally {
      setOracleLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 flex items-center justify-between">
        <a href="/" className="font-bold text-lg tracking-tight">BaseCred</a>
        <div className="flex items-center gap-3">
          {githubConnected && (
            <button onClick={() => signOut()} className="text-sm text-zinc-500 hover:text-zinc-800">
              {session?.user?.name} (GitHub)
            </button>
          )}
          <WalletConnect onAddress={setEthAddress} />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Developer Credit</h1>
          <p className="text-zinc-500 mt-1">Borrow ETH on Base against your GitHub contribution history.</p>
        </div>

        <div className={`rounded-xl border p-5 bg-white ${githubConnected ? "border-green-200" : "border-zinc-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">1. Connect GitHub</p>
              <p className="text-sm text-zinc-500 mt-0.5">
                We read your public contribution history to calculate your credit score.
              </p>
            </div>
            {githubConnected ? (
              <span className="text-green-600 text-sm font-medium">Connected</span>
            ) : (
              <button
                onClick={() => signIn("github")}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
              >
                Connect GitHub
              </button>
            )}
          </div>
        </div>

        <div className={`rounded-xl border p-5 bg-white ${walletConnected ? "border-green-200" : "border-zinc-200"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">2. Connect Wallet</p>
              <p className="text-sm text-zinc-500 mt-0.5">MetaMask or Coinbase Wallet on Base Sepolia.</p>
            </div>
            <WalletConnect onAddress={setEthAddress} />
          </div>
        </div>

        {githubConnected && breakdown && (
          <ScoreCard breakdown={breakdown} loading={scoreLoading} onRefresh={fetchScore} />
        )}

        {githubConnected && walletConnected && !scoreSubmitted && (
          <button
            onClick={submitScoreOnChain}
            disabled={oracleLoading}
            className="w-full rounded-xl bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {oracleLoading ? "Submitting score on-chain..." : "Verify Score On-Chain"}
          </button>
        )}

        {githubConnected && walletConnected && scoreSubmitted && (
          <>
            {!activeLoanData && (
              <button
                onClick={submitScoreOnChain}
                disabled={oracleLoading}
                className="w-full rounded-lg border border-zinc-200 py-2 text-sm text-zinc-500 hover:text-zinc-800 disabled:opacity-50 transition-colors"
              >
                {oracleLoading ? "Refreshing..." : "Refresh On-Chain Score"}
              </button>
            )}
            <LoanPanel
              address={ethAddress!}
              breakdown={breakdown}
              activeLoan={activeLoanData}
              onTxHash={(hash: string) => setRecentTx(hash)}
            />
          </>
        )}

        {recentTx && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm">
            <p className="font-medium text-blue-800">Transaction submitted</p>
            <p className="text-blue-600 font-mono text-xs mt-1 break-all">{recentTx}</p>
            <a
              href={`https://sepolia.basescan.org/tx/${recentTx}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 underline text-xs mt-1 inline-block"
            >
              View on BaseScan
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
