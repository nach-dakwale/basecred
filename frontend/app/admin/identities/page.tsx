export const dynamic = "force-dynamic";

import { isAddress, isHex, formatEther } from "viem";
import { getAdminClient, CONTRACT, ADMIN_ABI } from "@/lib/admin-chain";
import { PUBLIC_NETWORK } from "@/lib/network";

interface IdentityResult {
  wallet: string;
  identityId: string;
  score: bigint;
  scoreSetAt: bigint;
  tier: number;
  loan: { amount: bigint; collateral: bigint; dueBlock: bigint; active: boolean };
  defaulted: boolean;
}

async function lookupIdentity(query: string): Promise<IdentityResult | { error: string }> {
  const client = getAdminClient();
  let wallet: string;
  let identityId: `0x${string}`;

  if (isAddress(query)) {
    wallet = query;
    identityId = await client.readContract({
      address: CONTRACT, abi: ADMIN_ABI, functionName: "identityForWallet",
      args: [query as `0x${string}`],
    });
    if (identityId === "0x0000000000000000000000000000000000000000000000000000000000000000") {
      return { error: "No identity bound to this wallet." };
    }
  } else if (isHex(query) && query.length === 66) {
    identityId = query as `0x${string}`;
    wallet = await client.readContract({
      address: CONTRACT, abi: ADMIN_ABI, functionName: "walletForIdentity",
      args: [identityId],
    });
    if (wallet === "0x0000000000000000000000000000000000000000") {
      return { error: "No wallet bound to this identity ID." };
    }
  } else {
    return { error: "Enter a wallet address (0x..., 42 chars) or identity ID (0x..., 66 chars)." };
  }

  const [score, scoreSetAt, tier, loanTuple, isDefaulted] = await Promise.all([
    client.readContract({ address: CONTRACT, abi: ADMIN_ABI, functionName: "scores", args: [identityId] }),
    client.readContract({ address: CONTRACT, abi: ADMIN_ABI, functionName: "scoreSetAt", args: [identityId] }),
    client.readContract({ address: CONTRACT, abi: ADMIN_ABI, functionName: "tier", args: [identityId] }),
    client.readContract({ address: CONTRACT, abi: ADMIN_ABI, functionName: "loans", args: [identityId] }),
    client.readContract({ address: CONTRACT, abi: ADMIN_ABI, functionName: "defaulted", args: [identityId] }),
  ]);

  const [loanAmount, loanCollateral, loanDueBlock, loanActive] = loanTuple;
  const loan = { amount: loanAmount, collateral: loanCollateral, dueBlock: loanDueBlock, active: loanActive };

  return { wallet, identityId, score, scoreSetAt, tier, loan, defaulted: isDefaulted };
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-sm font-mono text-zinc-100 break-all">{value}</span>
    </div>
  );
}

export default async function IdentitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const result = query ? await lookupIdentity(query) : null;
  const explorerUrl = PUBLIC_NETWORK.explorerUrl;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-white">Identity Lookup</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Resolve a wallet address to its identity ID, or vice versa.
        </p>
      </div>

      <form method="GET" className="flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="0x... wallet address or identity ID"
          className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-zinc-800 border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 transition-colors"
        >
          Look up
        </button>
      </form>

      {result && "error" in result && (
        <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {result.error}
        </div>
      )}

      {result && !("error" in result) && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 space-y-4">
          <Field label="Wallet" value={
            <a
              href={`${explorerUrl}/address/${result.wallet}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              {result.wallet}
            </a>
          } />
          <Field label="Identity ID" value={result.identityId} />
          <div className="grid grid-cols-3 gap-4">
            <Field label="Score" value={result.score.toString()} />
            <Field label="Tier" value={result.tier.toString()} />
            <Field label="Score Set At" value={
              result.scoreSetAt > 0n
                ? new Date(Number(result.scoreSetAt) * 1000).toISOString()
                : "—"
            } />
          </div>
          <div className="border-t border-zinc-800 pt-4">
            <p className="text-xs text-zinc-500 mb-3">Loan State</p>
            {result.loan.active ? (
              <div className="grid grid-cols-3 gap-4">
                <Field label="Amount" value={`${parseFloat(formatEther(result.loan.amount)).toFixed(4)} ETH`} />
                <Field label="Collateral" value={`${parseFloat(formatEther(result.loan.collateral)).toFixed(4)} ETH`} />
                <Field label="Due Block" value={result.loan.dueBlock.toString()} />
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                {result.defaulted ? "Defaulted — no active loan." : "No active loan."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
