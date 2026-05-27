export const dynamic = "force-dynamic";

import { formatEther } from "viem";
import {
  adminClient, CONTRACT, ORACLE_WALLET, ORACLE_LOW_BALANCE_THRESHOLD,
  ADMIN_ABI, EVENT_LOAN_REQUESTED, EVENT_LOAN_REPAID, EVENT_LOAN_LIQUIDATED,
} from "@/lib/admin-chain";
import { PUBLIC_NETWORK } from "@/lib/network";

async function fetchOverview() {
  const [poolBalance, oracleBalance, outstandingPrincipal, loanRequested, loanRepaid, loanLiquidated] =
    await Promise.all([
      adminClient.getBalance({ address: CONTRACT }),
      adminClient.getBalance({ address: ORACLE_WALLET }),
      adminClient.readContract({
        address: CONTRACT, abi: ADMIN_ABI, functionName: "totalOutstandingPrincipal",
      }),
      adminClient.getLogs({ address: CONTRACT, event: EVENT_LOAN_REQUESTED, fromBlock: 0n }),
      adminClient.getLogs({ address: CONTRACT, event: EVENT_LOAN_REPAID, fromBlock: 0n }),
      adminClient.getLogs({ address: CONTRACT, event: EVENT_LOAN_LIQUIDATED, fromBlock: 0n }),
    ]);

  const closedIds = new Set([
    ...loanRepaid.map((e) => e.args.identityId),
    ...loanLiquidated.map((e) => e.args.identityId),
  ]);
  const activeLoanCount = loanRequested.filter(
    (e) => !closedIds.has(e.args.identityId)
  ).length;

  return { poolBalance, oracleBalance, outstandingPrincipal, activeLoanCount };
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 bg-zinc-900 ${warn ? "border-amber-700" : "border-zinc-800"}`}>
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className={`text-lg font-semibold font-mono ${warn ? "text-amber-300" : "text-white"}`}>{value}</p>
    </div>
  );
}

export default async function AdminOverviewPage() {
  const { poolBalance, oracleBalance, outstandingPrincipal, activeLoanCount } = await fetchOverview();
  const oracleLow = oracleBalance < ORACLE_LOW_BALANCE_THRESHOLD;
  const explorerUrl = PUBLIC_NETWORK.explorerUrl;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Pool Overview</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Contract:{" "}
          <a
            href={`${explorerUrl}/address/${CONTRACT}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-blue-400 hover:underline"
          >
            {CONTRACT}
          </a>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Pool ETH Balance" value={`${parseFloat(formatEther(poolBalance)).toFixed(4)} ETH`} />
        <Stat
          label="Outstanding Principal"
          value={`${parseFloat(formatEther(outstandingPrincipal)).toFixed(4)} ETH`}
        />
        <Stat label="Active Loans" value={String(activeLoanCount)} />
        <Stat
          label="Oracle Wallet Balance"
          value={`${parseFloat(formatEther(oracleBalance)).toFixed(6)} ETH`}
          warn={oracleLow}
        />
      </div>

      {oracleLow && (
        <div className="rounded-lg border border-amber-700 bg-amber-950/40 px-4 py-3 text-sm text-amber-300">
          Oracle wallet balance is below 0.0005 ETH. Top up{" "}
          <a
            href={`${explorerUrl}/address/${ORACLE_WALLET}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-amber-200"
          >
            {ORACLE_WALLET}
          </a>{" "}
          to ensure transactions can continue.
        </div>
      )}
    </div>
  );
}
