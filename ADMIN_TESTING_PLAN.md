# Admin View Testing Plan

Live URL: https://basecred-testnet.nachdakwale.workers.dev/admin

## Auth

| Test | Method | Expected |
|---|---|---|
| No credentials | `curl https://.../admin` | 401 + `WWW-Authenticate: Basic realm="BaseCred Admin"` |
| Wrong password | `curl -u admin:wrong https://.../admin` | 401 |
| Correct password | `curl -u admin:$PASS https://.../admin` | 200 |
| Correct password | `curl -u admin:$PASS https://.../admin/loans` | 200 |
| Correct password | `curl -u admin:$PASS https://.../admin/identities` | 200 |

Auth is enforced by `middleware.ts`. No redirect loop — the browser gets a 401 with
`WWW-Authenticate` and shows its native dialog.

## /admin — Pool Overview

| Check | How to verify |
|---|---|
| Pool ETH balance shows correctly | Compare with `cast balance $CONTRACT --rpc-url $RPC` |
| Outstanding principal is 0 (no active loans yet) | On-chain view call |
| Active loan count is 0 | Computed from LoanRequested - repaid/liquidated events |
| Oracle wallet balance shows | Compare `cast balance 0xae10cc5f84c52dd69b21bfc8837ffd8c1daad6c1` |
| Oracle amber warning fires at < 0.0005 ETH | Manually drain oracle wallet below threshold, reload |
| Contract address is a BaseScan link | Click it — should open sepolia.basescan.org |

## /admin/loans — Loans Table

| Check | How to verify |
|---|---|
| Empty state shows "No loans found" | Current state (no loans yet) |
| After a loan is requested, row appears | Go through dapp flow, then reload /admin/loans |
| Status badge = "active" for live loan | Compare with `loans(identityId)` on-chain |
| Status badge = "repaid" after repay | Complete the repay flow, reload |
| Status badge = "liquidated" after liquidation | Fast-forward past due block on testnet, liquidate |
| Wallet links open BaseScan | Click wallet address in table |

## /admin/identities — Identity Lookup

| Input | Expected |
|---|---|
| Unbound wallet address (42 char 0x) | Red error: "No identity bound to this wallet." |
| Invalid format string | Red error: "Enter a wallet address (0x..., 42 chars) or identity ID (0x..., 66 chars)." |
| Bound wallet address | Shows identityId, score, tier, scoreSetAt, loan state |
| Valid identityId (66 char 0x) | Shows wallet, score, tier, loan state |
| Unbound identityId | Red error: "No wallet bound to this identity ID." |

To get a bound wallet for testing: go through the full dapp flow at /dapp
(connect GitHub, connect wallet, submit score on-chain). Then use that wallet address
in the identities lookup.

## Known Bugs Fixed During Testing

1. **getLogs block range**: `fromBlock: 0n` caused "query exceeds max block range 2000"
   on the public Base Sepolia RPC. Fixed by using `CONTRACT_DEPLOY_BLOCK = 42054200n`.

2. **Rate limiting**: Fetching 3 event types concurrently made ~60 getLogs calls,
   hitting the public RPC's per-second rate limit. Fixed by batching all three
   event types into a single paginated sweep with `events: [...]` (~20 calls total).

3. **Auth redirect loop**: Redirecting to `/admin/login` caused infinite redirects
   because `/admin/login` is inside the admin layout and re-triggered auth.
   Fixed by moving auth to `middleware.ts` which returns 401 + `WWW-Authenticate`
   directly, triggering the browser's native Basic Auth dialog.

## Infrastructure Notes

- Auth secret: stored as Cloudflare Worker secret `ADMIN_PASSWORD`
- RPC: public `https://sepolia.base.org` (set as `RPC_URL` secret) — no getLogs pagination needed beyond ~20 pages for current contract age
- Debug route available at `/api/admin-debug` for RPC health checks
- Contract deploy block hardcoded in `lib/admin-chain.ts` — update this if contract is redeployed
