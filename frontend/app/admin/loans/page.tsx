export const dynamic = "force-dynamic";

import { formatEther } from "viem";
import {
  getAdminClient, CONTRACT, ADMIN_ABI,
  EVENT_LOAN_REQUESTED, EVENT_LOAN_REPAID, EVENT_LOAN_LIQUIDATED,
} from "@/lib/admin-chain";
import { PUBLIC_NETWORK } from "@/lib/network";

type LoanStatus = "active" | "repaid" | "liquidated" | "defaulted";

interface LoanRow {
  identityId: string;
  wallet: string;
  amount: bigint;
  collateral: bigint;
  dueBlock: bigint;
  status: LoanStatus;
}

function statusBadge(status: LoanStatus) {
  const styles: Record<LoanStatus, string> = {
    active: "bg-blue-950 text-blue-300 border-blue-800",
    repaid: "bg-green-950 text-green-300 border-green-800",
    liquidated: "bg-red-950 text-red-300 border-red-800",
    defaulted: "bg-amber-950 text-amber-300 border-amber-700",
  };
  return (
    <span className={`rounded border px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

async function fetchLoans(): Promise<LoanRow[]> {
  const client = getAdminClient();
  const [requested, repaid, liquidated] = await Promise.all([
    client.getLogs({ address: CONTRACT, event: EVENT_LOAN_REQUESTED, fromBlock: 0n }),
    client.getLogs({ address: CONTRACT, event: EVENT_LOAN_REPAID, fromBlock: 0n }),
    client.getLogs({ address: CONTRACT, event: EVENT_LOAN_LIQUIDATED, fromBlock: 0n }),
  ]);

  const repaidIds = new Set(repaid.map((e) => e.args.identityId));
  const liquidatedIds = new Set(liquidated.map((e) => e.args.identityId));

  const rows = await Promise.all(
    requested.map(async (e) => {
      const identityId = e.args.identityId as `0x${string}`;
      const wallet = e.args.wallet as `0x${string}`;
      const loan = await client.readContract({
        address: CONTRACT, abi: ADMIN_ABI, functionName: "loans",
        args: [identityId],
      });
      const isDefaulted = await client.readContract({
        address: CONTRACT, abi: ADMIN_ABI, functionName: "defaulted",
        args: [identityId],
      });

      const [amount, collateral, dueBlock] = loan;

      let status: LoanStatus = "active";
      if (liquidatedIds.has(identityId)) status = "liquidated";
      else if (repaidIds.has(identityId)) status = "repaid";
      else if (isDefaulted) status = "defaulted";

      return {
        identityId,
        wallet,
        amount,
        collateral,
        dueBlock,
        status,
      } satisfies LoanRow;
    })
  );

  return rows;
}

export default async function LoansPage() {
  const loans = await fetchLoans();
  const explorerUrl = PUBLIC_NETWORK.explorerUrl;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-white">Loans</h1>
        <p className="text-xs text-zinc-500 mt-1">{loans.length} total loan request{loans.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 border-b border-zinc-800">
            <tr className="text-left text-xs text-zinc-500">
              <th className="px-4 py-3 font-medium">Wallet</th>
              <th className="px-4 py-3 font-medium">Identity ID</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Collateral</th>
              <th className="px-4 py-3 font-medium">Due Block</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {loans.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-600 text-xs">
                  No loans found
                </td>
              </tr>
            )}
            {loans.map((loan) => (
              <tr key={loan.identityId + loan.wallet} className="bg-zinc-950 hover:bg-zinc-900 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">
                  <a
                    href={`${explorerUrl}/address/${loan.wallet}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    {shortAddr(loan.wallet)}
                  </a>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                  {loan.identityId.slice(0, 12)}...
                </td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-200">
                  {parseFloat(formatEther(loan.amount)).toFixed(4)} ETH
                </td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                  {parseFloat(formatEther(loan.collateral)).toFixed(4)} ETH
                </td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                  {loan.dueBlock === 0n ? "—" : loan.dueBlock.toString()}
                </td>
                <td className="px-4 py-3">{statusBadge(loan.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
