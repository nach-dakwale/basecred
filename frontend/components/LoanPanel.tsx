"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { baseSepolia } from "wagmi/chains";
import { ABI, CONTRACT_ADDRESS } from "@/lib/contract";
import type { ScoreBreakdown } from "@/lib/scoring";

interface ActiveLoan {
  amount:     bigint;
  collateral: bigint;
  dueBlock:   bigint;
  active:     boolean;
}

interface Props {
  address:    string;
  breakdown:  ScoreBreakdown | null;
  activeLoan: ActiveLoan | null;
  onTxHash:   (hash: string) => void;
}

export function LoanPanel({ address: _address, breakdown, activeLoan, onTxHash }: Props) {
  const [amount, setAmount] = useState("");
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  useWaitForTransactionReceipt({
    hash,
    query: {
      enabled: !!hash,
      select: () => { if (hash) onTxHash(hash); },
    },
  });

  if (activeLoan?.active) {
    const repayWei = activeLoan.amount + activeLoan.amount / 10n;
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4 text-zinc-900">
        <h2 className="font-semibold text-lg">Active Loan</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-zinc-500">Borrowed</p>
            <p className="font-semibold">{formatEther(activeLoan.amount)} ETH</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-zinc-500">Collateral locked</p>
            <p className="font-semibold">{formatEther(activeLoan.collateral)} ETH</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3 col-span-2">
            <p className="text-zinc-500">Total repayment due</p>
            <p className="font-semibold text-lg">{formatEther(repayWei)} ETH</p>
            <p className="text-xs text-zinc-400">Due at block {activeLoan.dueBlock.toString()}</p>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error.message}</p>}
        <button
          onClick={() =>
            writeContract({
              address: CONTRACT_ADDRESS,
              abi: ABI,
              functionName: "repayLoan",
              value: repayWei,
              chain: baseSepolia,
            })
          }
          disabled={isPending}
          className="w-full rounded-lg bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Submitting..." : `Repay ${formatEther(repayWei)} ETH`}
        </button>
      </div>
    );
  }

  const maxEth    = breakdown?.maxLoanEth ?? 0;
  const amountNum = parseFloat(amount) || 0;
  const colNeeded = amount && breakdown && breakdown.collateralPct > 0
    ? ((amountNum * breakdown.collateralPct) / 100).toFixed(4)
    : null;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4 text-zinc-900">
      <h2 className="font-semibold text-lg">Request a Loan</h2>
      {maxEth === 0 ? (
        <p className="text-sm text-zinc-500">
          Your score is too low to borrow. Contribute to web3 open source projects to raise it.
        </p>
      ) : (
        <>
          <div className="space-y-2">
            <label className="text-sm text-zinc-600">Amount (max {maxEth} ETH)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0.001"
                max={maxEth}
                step="0.001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="flex items-center text-sm text-zinc-500 pr-1">ETH</span>
            </div>
          </div>
          {colNeeded && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">
              <p className="text-amber-800">
                {breakdown?.collateralPct === 0
                  ? "No collateral required for your tier."
                  : `${colNeeded} ETH will be locked as collateral (${breakdown?.collateralPct}%).`}
              </p>
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error.message}</p>}
          <button
            onClick={() => {
              if (!amount || amountNum <= 0 || amountNum > maxEth) return;
              const colWei = colNeeded ? parseEther(colNeeded as `${number}`) : 0n;
              writeContract({
                address: CONTRACT_ADDRESS,
                abi: ABI,
                functionName: "requestLoan",
                args: [parseEther(amount as `${number}`)],
                value: colWei,
                chain: baseSepolia,
              });
            }}
            disabled={isPending || !amount || amountNum <= 0 || amountNum > maxEth}
            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Submitting..." : "Request Loan"}
          </button>
          <p className="text-xs text-zinc-400">
            10% flat interest. 30-day repayment window. Defaulted loans slash your credit score.
          </p>
        </>
      )}
    </div>
  );
}
