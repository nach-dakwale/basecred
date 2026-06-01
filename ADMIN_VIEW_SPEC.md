# Admin View Spec

## Goal

A password-protected `/admin` route in the existing Cloudflare Worker that lets the operator monitor loan health, identity bindings, and pool state without touching the contract or chain explorers.

## What data is available on-chain

All state lives in `GitHubLoanPool` at `NEXT_PUBLIC_CONTRACT_ADDRESS`.

**View calls (free, no gas):**
- `walletForIdentity(bytes32)` → address
- `identityForWallet(address)` → bytes32
- `scores(bytes32)` → uint256
- `scoreSetAt(bytes32)` → uint256 (timestamp)
- `loans(bytes32)` → (amount, collateral, dueBlock, active)
- `defaulted(bytes32)` → bool
- `tier(bytes32)` → uint8
- `totalOutstandingPrincipal()` (slot 4 in contract)
- `poolBalance` → `address(contract).balance`

**Events (indexed, queryable via `eth_getLogs`):**
- `ScoreSet(bytes32 indexed identityId, address indexed wallet, uint256 score, bytes32 proofNonce)`
- `WalletBound(bytes32 indexed identityId, address indexed wallet)`
- `WalletMigrated(bytes32 indexed identityId, address indexed previousWallet, address indexed wallet)`
- `LoanRequested(bytes32 indexed identityId, address indexed wallet, uint256 amount, uint256 collateral)`
- `LoanRepaid(bytes32 indexed identityId, address indexed wallet)`
- `LoanLiquidated(bytes32 indexed identityId, address indexed wallet, uint256 amount, uint256 collateral)`

**The identity gap:** `identityId = keccak256("github:{githubNumericId}")`. The numeric GitHub ID is not stored anywhere — only in oracle audit logs. The admin view should expose wallet + identityId. A "GitHub login" column is only possible if we add an identity index (see Future Work).

## Route structure

All routes live under `/admin` in the Next.js app.

```
app/admin/
  layout.tsx        # auth gate
  page.tsx          # pool overview dashboard
  loans/
    page.tsx        # active + historical loans table
  identities/
    page.tsx        # wallet ↔ identityId lookup
```

## Auth gate

Use HTTP Basic Auth checked in the layout against a new Worker secret `ADMIN_PASSWORD`. No UI login form — the browser's native Basic Auth dialog is fine for an operator tool.

```ts
// app/admin/layout.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }) {
  const authHeader = (await headers()).get("authorization") ?? "";
  const [, encoded] = authHeader.split(" ");
  const [, pass] = Buffer.from(encoded ?? "", "base64").toString().split(":");
  if (pass !== process.env.ADMIN_PASSWORD) redirect("/admin/login");
  return children;
}
```

Add `ADMIN_PASSWORD` as a Worker secret (`wrangler secret put ADMIN_PASSWORD --env testnet`).

## Pages

### Pool Overview (`/admin`)

Fetches via public RPC at render time (server component, no caching).

| Field | Source |
|---|---|
| Pool ETH balance | `eth_getBalance(contractAddress)` |
| Total outstanding principal | `totalOutstandingPrincipal()` view call |
| Active loan count | count of `LoanRequested` minus `LoanRepaid` / `LoanLiquidated` |
| Oracle wallet balance | `eth_getBalance(oracleAddress)` — alert if < 0.0005 ETH |
| Contract address | env var, linked to BaseScan |

### Loans Table (`/admin/loans`)

Pull all `LoanRequested` events from block 0, then for each `identityId` call `loans(identityId)` to get current state.

Columns: wallet (truncated, linked to BaseScan), identityId (first 10 chars), amount, collateral, due block, status (active / repaid / defaulted / liquidated), score at time of loan.

Filter controls: status, overdue only.

### Identity Lookup (`/admin/identities`)

Input: wallet address or identityId hex.
- Wallet input: call `identityForWallet(wallet)` → show identityId, score, tier, loan state
- identityId input: call `walletForIdentity(id)` → same

No GitHub username resolution unless a future identity index is added.

## Data fetching pattern

Use `viem`'s `publicClient` already wired in `lib/network.ts`. Create a shared `getAdminClient()` that uses the server-side `RPC_URL` (not the browser one).

```ts
// lib/admin-chain.ts
import { createPublicClient, http } from "viem";
import { PUBLIC_NETWORK, serverRpcUrl } from "./network";
import { ABI } from "./contract";

export const adminClient = createPublicClient({
  chain: PUBLIC_NETWORK.chain,
  transport: http(serverRpcUrl()),
});

export const CONTRACT = PUBLIC_NETWORK.contractAddress;
```

For event fetching, use `adminClient.getLogs({ address: CONTRACT, event: ..., fromBlock: 0n })`. On Sepolia this is fine; on mainnet add block range pagination.

## Future work

**Identity index:** To show GitHub usernames, the oracle route should write a KV entry `identityId → githubLogin` on every successful `setScoreAndBind`. Add a Cloudflare KV namespace `IDENTITY_INDEX` to `wrangler.toml` and write from `app/api/oracle/route.ts` after the tx confirms. The admin view can then resolve names.

**Overdue alerts:** A cron trigger (`wrangler.toml` `[triggers]`) that runs daily, scans active loans, checks `dueBlock < currentBlock`, and logs or notifies if any are past due.

**Export:** CSV download of the loans table for accounting.

## Files to create/modify

| File | Action |
|---|---|
| `app/admin/layout.tsx` | create — Basic Auth gate |
| `app/admin/page.tsx` | create — pool overview |
| `app/admin/loans/page.tsx` | create — loans table |
| `app/admin/identities/page.tsx` | create — identity lookup |
| `lib/admin-chain.ts` | create — shared viem client for admin |
| `wrangler.toml` | add `ADMIN_PASSWORD` secret reference to both envs |

No new dependencies needed. Uses viem (already installed) and existing Next.js server components.
