"use client";

export const dynamic = "force-dynamic";

import { useState, useCallback } from "react";
import lazyLoad from "next/dynamic";
import { signIn, signOut, useSession } from "next-auth/react";
import { useSignMessage } from "wagmi";
import { PUBLIC_NETWORK } from "@/lib/network";
import { SiteNav } from "@/components/SiteNav";
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
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { signMessageAsync } = useSignMessage();

  const githubConnected  = status === "authenticated";
  const walletConnected  = !!ethAddress;

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

  async function submitScoreOnChain() {
    if (!ethAddress) return;
    setOracleLoading(true);
    setActionError(null);
    try {
      const challengeResponse = await fetch("/api/wallet/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: ethAddress }),
      });
      const challenge = await challengeResponse.json();
      if (!challengeResponse.ok) throw new Error(challenge.error || "Unable to create wallet challenge");
      const signature = await signMessageAsync({ message: challenge.message });
      const res = await fetch("/api/oracle", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: ethAddress,
          nonce: challenge.nonce,
          expiresAt: challenge.expiresAt,
          signature,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBreakdown(data.breakdown);
        setRecentTx(data.txHash);
        setScoreSubmitted(true);
      }
      if (!res.ok) throw new Error(data.error || "Unable to bind wallet");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to bind wallet");
    } finally {
      setOracleLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#E6EDF3]">
      <SiteNav
        activePath="/dapp"
        right={
          githubConnected ? (
            <button onClick={() => signOut()} className="text-xs text-[#6E7681] hover:text-[#E6EDF3] transition-colors">
              {session?.user?.name}
            </button>
          ) : undefined
        }
      />

      <main className="mx-auto max-w-2xl px-4 py-10 space-y-4">
        <div className={`rounded-lg border px-3 py-2 text-xs ${PUBLIC_NETWORK.isTestnet ? "border-[#F0883E]/40 bg-[#161B22] text-[#F0883E]" : "border-[#2EA043]/40 bg-[#0D1117] text-[#3FB950]"}`}>
          Active network: {PUBLIC_NETWORK.name}{PUBLIC_NETWORK.isTestnet ? " — test funds only" : ""}
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Developer Credit</h1>
          <p className="text-sm text-[#6E7681] mt-0.5">Borrow ETH on Base against your GitHub contribution history.</p>
        </div>

        <div className={`rounded-md border p-4 bg-[#161B22] ${githubConnected ? "border-[#2EA043]/40" : "border-[#30363D]"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">1. Connect GitHub</p>
              <p className="text-xs text-[#6E7681] mt-0.5">
                We read your public contribution history to calculate your credit score.
              </p>
            </div>
            {githubConnected ? (
              <button
                onClick={fetchScore}
                disabled={scoreLoading}
                className="text-[#3FB950] text-xs font-medium disabled:opacity-50 hover:text-[#3FB950] transition-colors"
              >
                {scoreLoading ? "Calculating..." : breakdown ? "Recalculate Score" : "Calculate Score"}
              </button>
            ) : (
              <button
                onClick={() => signIn("github")}
                className="rounded-lg bg-[#21262D] border border-[#30363D] px-3 py-1.5 text-xs font-medium text-[#E6EDF3] hover:bg-[#30363D] transition-colors"
              >
                Connect GitHub
              </button>
            )}
          </div>
        </div>

        <div className={`rounded-md border p-4 bg-[#161B22] ${walletConnected ? "border-[#2EA043]/40" : "border-[#30363D]"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${githubConnected ? "text-white" : "text-[#6E7681]"}`}>2. Connect Wallet</p>
              <p className="text-xs text-[#6E7681] mt-0.5">MetaMask or Coinbase Wallet on {PUBLIC_NETWORK.name}.</p>
            </div>
            {githubConnected
              ? <WalletConnect onAddress={setEthAddress} />
              : <span className="text-xs text-[#6E7681]">Connect GitHub first</span>
            }
          </div>
        </div>

        {githubConnected && breakdown && (
          <ScoreCard breakdown={breakdown} loading={scoreLoading} onRefresh={fetchScore} />
        )}

        {githubConnected && walletConnected && breakdown && !scoreSubmitted && (
          <button
            onClick={submitScoreOnChain}
            disabled={oracleLoading}
            className="w-full rounded-md bg-[#238636] py-2.5 text-sm font-semibold text-white hover:bg-[#2EA043] disabled:opacity-50 transition-colors "
          >
            {oracleLoading ? "Awaiting wallet proof..." : "Sign Wallet Proof and Verify Score"}
          </button>
        )}
        {actionError && <p className="text-xs text-red-400">{actionError}</p>}

        {githubConnected && walletConnected && scoreSubmitted && (
          <>
            <button
              onClick={submitScoreOnChain}
              disabled={oracleLoading}
              className="w-full rounded-md border border-[#30363D] py-2 text-xs text-[#6E7681] hover:text-[#E6EDF3] disabled:opacity-50 transition-colors"
            >
              {oracleLoading ? "Awaiting wallet proof..." : "Refresh Verified On-Chain Score"}
            </button>
            <LoanPanel
              address={ethAddress!}
              breakdown={breakdown}
              onTxHash={setRecentTx}
            />
          </>
        )}

        {recentTx && (
          <div className="rounded-md border border-[#2EA043]/40 bg-[#0D1117] p-4 text-sm">
            <p className="font-medium text-[#3FB950]">Transaction submitted</p>
            <p className="text-[#3FB950] font-mono text-xs mt-1 break-all">{recentTx}</p>
            <a
              href={`${PUBLIC_NETWORK.explorerUrl}/tx/${recentTx}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#3FB950] underline text-xs mt-1 inline-block hover:text-[#3FB950]"
            >
              View on BaseScan
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
