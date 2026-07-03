"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { WalletConnect } from "@/components/WalletConnect";
import { SiteNav } from "@/components/SiteNav";
import { CRED_SALE_ABI, CRED_SALE_ADDRESS } from "@/lib/contracts/cred-sale";

export default function SalePage() {
  const { address } = useAccount();
  const [ethInput, setEthInput] = useState("");
  const isNotConfigured = !CRED_SALE_ADDRESS;

  const { data: hardCap } = useReadContract({ address: CRED_SALE_ADDRESS, abi: CRED_SALE_ABI, functionName: "hardCapWei", query: { enabled: !!CRED_SALE_ADDRESS } });
  const { data: totalRaised } = useReadContract({ address: CRED_SALE_ADDRESS, abi: CRED_SALE_ABI, functionName: "totalRaisedWei", query: { enabled: !!CRED_SALE_ADDRESS } });
  const { data: price } = useReadContract({ address: CRED_SALE_ADDRESS, abi: CRED_SALE_ABI, functionName: "priceWeiPerToken", query: { enabled: !!CRED_SALE_ADDRESS } });
  const { data: startTime } = useReadContract({ address: CRED_SALE_ADDRESS, abi: CRED_SALE_ABI, functionName: "startTime", query: { enabled: !!CRED_SALE_ADDRESS } });
  const { data: endTime } = useReadContract({ address: CRED_SALE_ADDRESS, abi: CRED_SALE_ABI, functionName: "endTime", query: { enabled: !!CRED_SALE_ADDRESS } });

  const weiIn = ethInput ? parseEther(ethInput) : 0n;
  const { data: preview } = useReadContract({
    address: CRED_SALE_ADDRESS,
    abi: CRED_SALE_ABI,
    functionName: "previewBuy",
    args: [weiIn],
    query: { enabled: !!CRED_SALE_ADDRESS && weiIn > 0n },
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [now, setNow] = useState(() => BigInt(Math.floor(Date.now() / 1000)));
  useEffect(() => {
    const id = setInterval(() => setNow(BigInt(Math.floor(Date.now() / 1000))), 30_000);
    return () => clearInterval(id);
  }, []);
  const saleActive = startTime !== undefined && endTime !== undefined && now >= startTime && now <= endTime;
  const progressPct = hardCap && totalRaised ? Number((totalRaised * 100n) / hardCap) : 0;

  function handleBuy() {
    if (!CRED_SALE_ADDRESS || !weiIn) return;
    writeContract({ address: CRED_SALE_ADDRESS, abi: CRED_SALE_ABI, functionName: "buy", value: weiIn });
  }

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#E6EDF3]">
      <SiteNav activePath="/sale" />

      <main className="mx-auto max-w-lg px-6 py-16 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">baseCREDIT Private Sale</h1>
          <p className="mt-2 text-[#8B949E]">
            baseCREDIT earns 80% of borrower interest as ETH dividends and grants governance rights over protocol parameters.
          </p>
        </div>

        {isNotConfigured && (
          <div className="rounded-lg border border-yellow-800 bg-yellow-950/30 p-4 text-yellow-400 text-sm">
            Sale contract not yet deployed. Check back after launch.
          </div>
        )}

        {!isNotConfigured && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#8B949E]">Raised</span>
              <span className="text-white font-mono">
                {totalRaised !== undefined ? formatEther(totalRaised) : "—"} / {hardCap !== undefined ? formatEther(hardCap) : "—"} ETH
              </span>
            </div>
            <div className="h-2 rounded-full bg-[#21262D] overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, #196C2E, #3FB950)" }} />
            </div>
            <div className="flex justify-between text-xs text-[#6E7681]">
              <span>{progressPct}% filled</span>
              {price !== undefined && <span>{formatEther(price)} ETH per baseCREDIT</span>}
            </div>
          </div>
        )}

        {!saleActive && !isNotConfigured && (
          <div className="rounded-lg border border-[#30363D] bg-[#161B22] p-4 text-[#8B949E] text-sm text-center">
            {startTime && now < startTime ? "Sale has not started yet." : "Sale has ended."}
          </div>
        )}

        {saleActive && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-[#8B949E]">ETH to spend</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={ethInput}
                  onChange={(e) => setEthInput(e.target.value)}
                  placeholder="0.0"
                  className="w-full rounded-md border border-[#30363D] bg-[#161B22] px-3 py-2.5 pr-16 text-sm text-white font-mono focus:outline-none focus:border-[#238636]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6E7681]">ETH</span>
              </div>
            </div>

            {preview !== undefined && weiIn > 0n && (
              <div className="rounded-md border border-[#30363D] bg-[#161B22]/50 p-3 flex justify-between text-sm">
                <span className="text-[#8B949E]">You receive</span>
                <span className="text-white font-mono">
                  {Number(formatEther(preview)).toLocaleString(undefined, { maximumFractionDigits: 2 })} baseCREDIT
                </span>
              </div>
            )}

            {!address ? (
              <WalletConnect onAddress={() => {}} />
            ) : isSuccess ? (
              <div className="rounded-md border border-green-800 bg-green-950/30 p-4 text-center text-green-400 text-sm">
                Purchase confirmed. baseCREDIT is in your wallet.
              </div>
            ) : (
              <button
                onClick={handleBuy}
                disabled={!weiIn || weiIn === 0n || isPending || confirming}
                className="w-full rounded-md bg-[#238636] px-4 py-3 text-sm font-medium text-white hover:bg-[#2EA043] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isPending || confirming ? "Buying..." : "Buy baseCREDIT"}
              </button>
            )}
          </div>
        )}

        <div className="rounded-lg border border-[#30363D] bg-[#161B22] p-5 space-y-3 text-sm text-[#8B949E]">
          <p className="font-medium text-white">What you get</p>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>80% of all borrower interest paid as ETH — claimable any time</li>
            <li>Voting rights on interest rates, loan tiers, and pool parameters</li>
            <li>No lockup — tokens are transferable immediately</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
