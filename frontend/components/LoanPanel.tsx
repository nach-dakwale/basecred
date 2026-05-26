"use client";

import { useEffect, useRef, useState } from "react";
import { useBlockNumber, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
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
  onTxHash:   (hash: string) => void;
}

const INTEREST_BPS = 1000n;
const BPS_DENOMINATOR = 10000n;
const BLOCK_TIME_SECONDS = 2;

export function LoanPanel({ address, breakdown, onTxHash }: Props) {
  const [amount, setAmount] = useState("");
  const handledHash = useRef<string | undefined>(undefined);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { data: loan, refetch: refetchLoan } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "loans",
    args: [address as `0x${string}`],
  });
  const { data: currentBlock } = useBlockNumber({ chainId: baseSepolia.id, watch: true });

  const loanTuple = loan as readonly [bigint, bigint, bigint, boolean] | undefined;
  const activeLoan: ActiveLoan | null = loanTuple?.[3]
    ? { amount: loanTuple[0], collateral: loanTuple[1], dueBlock: loanTuple[2], active: loanTuple[3] }
    : null;

  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: !!hash },
  });

  useEffect(() => {
    if (!hash || !isConfirmed || handledHash.current === hash) return;
    handledHash.current = hash;
    onTxHash(hash);
    void refetchLoan();
  }, [hash, isConfirmed, onTxHash, refetchLoan]);

  if (activeLoan?.active) {
    const interestWei = (activeLoan.amount * INTEREST_BPS) / BPS_DENOMINATOR;
    const repayWei = activeLoan.amount + interestWei;
    const remainingBlocks = currentBlock !== undefined && activeLoan.dueBlock > currentBlock
      ? activeLoan.dueBlock - currentBlock
      : 0n;
    const dueDate = currentBlock !== undefined
      ? new Date(Date.now() + Number(remainingBlocks) * BLOCK_TIME_SECONDS * 1000)
      : null;

    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 space-y-4 text-zinc-100">
        <h2 className="text-sm font-semibold text-white">Active Loan</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-md bg-zinc-800/60 border border-zinc-700/50 p-3">
            <p className="text-xs text-zinc-500">Borrowed</p>
            <p className="font-medium text-white mt-0.5">{formatEther(activeLoan.amount)} ETH</p>
          </div>
          <div className="rounded-md bg-zinc-800/60 border border-zinc-700/50 p-3">
            <p className="text-xs text-zinc-500">Interest owed (10%)</p>
            <p className="font-medium text-white mt-0.5">{formatEther(interestWei)} ETH</p>
          </div>
          <div className="rounded-md bg-zinc-800/60 border border-zinc-700/50 p-3 col-span-2">
            <p className="text-xs text-zinc-500">Total repayment due</p>
            <p className="font-semibold text-white mt-0.5">{formatEther(repayWei)} ETH</p>
            <p className="text-xs text-zinc-500 mt-2">Estimated due date</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {dueDate
                ? dueDate.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
                : `Block ${activeLoan.dueBlock.toString()}`}
            </p>
          </div>
        </div>
        {error && <p className="text-xs text-red-400">{error.message}</p>}
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
          className="w-full rounded-md bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
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
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 space-y-4 text-zinc-100">
      <h2 className="text-sm font-semibold text-white">Request a Loan</h2>
      {maxEth === 0 ? (
        <p className="text-sm text-zinc-500">
          Your score is too low to borrow. Contribute to web3 open source projects to raise it.
        </p>
      ) : (
        <>
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-500">Amount (max {maxEth} ETH)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0.001"
                max={maxEth}
                step="0.001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
              />
              <span className="flex items-center text-sm text-zinc-500 pr-1">ETH</span>
            </div>
          </div>
          {colNeeded && (
            <div className="rounded-md border border-zinc-700 bg-zinc-800/60 p-3 text-xs text-zinc-400">
              {breakdown?.collateralPct === 0
                ? "No collateral required for your tier."
                : `${colNeeded} ETH will be locked as collateral (${breakdown?.collateralPct}%).`}
            </div>
          )}
          {error && <p className="text-xs text-red-400">{error.message}</p>}
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
            className="w-full rounded-md bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Submitting..." : "Request Loan"}
          </button>
          <p className="text-xs text-zinc-600">
            10% flat interest. 30-day repayment window. Defaulted loans slash your credit score.
          </p>
        </>
      )}
    </div>
  );
}
