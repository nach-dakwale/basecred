# BaseCred Operations And Launch Controls

## Current Safety Position

The previously deployed Base Sepolia contract at
`0x660726E88d838Da13FFbD3368302f88C8a717Ed4` must remain unfunded. It uses
credentials that were committed to Git and predates identity-bound borrowing.

This repository now contains code for fresh independent Base Sepolia and Base
mainnet deployments. Code changes cannot rotate disclosed credentials or make
the old contract safe. Mainnet is not authorized until the manual gates below
are complete.

Use `docs/OWNER_ACTIONS.md` as the execution checklist and non-secret evidence
record for every owner-controlled action required before mainnet funding.

## Mandatory Credential Rotation

Assume all values formerly present in `contracts/.env`, `frontend/.env.local`,
and `frontend/.env.production` are compromised, including any key or secret
removed from the current Git tree. If repository history was ever shared, it
cannot be remediated by deleting the latest file version.

Before any new deployment:

1. Replace the former Sepolia deployer, owner, and oracle key material with
   fresh test-only roles.
2. Create fresh mainnet roles. Set `OWNER_ADDRESS` to a reviewed multisig and
   use a separate, narrowly funded oracle signer.
3. Rotate Auth.js/NextAuth secrets and both GitHub OAuth applications' client
   secrets. Use independent testnet and production OAuth applications.
4. Revoke any old Cloudflare secret values and enter fresh secrets separately
   for each Worker environment.
5. Do not reuse the disclosed Sepolia role on mainnet or deposit liquidity into
   its old deployment.

Never store generated credentials in repository files. Local ignored `.env`
files are suitable only for disposable local/test setup; deployed secrets must
be set through Cloudflare secret bindings or the deployment secret manager.
After rotating their contents, remove legacy ignored `frontend/.env.local` and
`frontend/.env.production` before any deployable build, or build from a clean
checkout. Next.js production builds automatically load those filenames, so
providing environment-specific public variables alone does not isolate a build
from legacy server-side values.

## Contract Safety Model

The fresh contract binds a stable hashed GitHub user ID to one wallet through
an oracle-submitted, wallet-signed proof nonce. A proof nonce is consumed
on-chain, and a bound identity cannot switch wallets while a loan is active.
Otherwise, wallet migration requires 30 days after the last wallet change;
ordinary score refreshes do not restart that waiting period.

Loans, scores, and defaults are keyed by the verified identity rather than a
caller-supplied wallet. Liquidation permanently marks the identity defaulted
and records unpaid principal; that identity cannot refresh a score or borrow
again. This is intentionally conservative until a reviewed recovery mechanism
exists.

The contract also enforces:

- Maximum score of `650`.
- Configured aggregate active principal limit, adjustable only while paused.
- Reserved collateral excluded from owner withdrawals.
- Distinct oracle and owner roles, oracle rotation/revocation, and two-step
  ownership transfer.

Use a mainnet multisig as `owner`; do not make the mainnet oracle the owner.

## Fresh Contract Deployment

Install and test:

```bash
cd contracts
npm ci
npm test
npm run compile
```

Prepare environment variables outside Git using `contracts/.env.example` as a
field reference. Choose a conservative `MAX_TOTAL_PRINCIPAL_ETH`; it is the
hard cap on active principal and should be small for an initial mainnet launch.

Deploy a new testnet instance with new test-only roles:

```bash
npm run deploy:sepolia
```

Deploy mainnet only after all gates in this document are signed off:

```bash
npm run deploy:base
```

The mainnet deploy script refuses to use Base's public mainnet RPC endpoint.
Supply `BASE_MAINNET_RPC_URL` from production-grade operated infrastructure or
a provider selected by the owner. Verify each fresh deployment on BaseScan and
record the deployed contract address, constructor parameters, transaction hash,
chain ID, owner, oracle, exposure cap, and verification URL in the release
record.

## Frontend Environments

Build and deploy two independent frontend artifacts. `NEXT_PUBLIC_*` settings
are embedded during build and cannot be switched safely after one shared build.

1. Copy `frontend/.env.testnet.example` to the ignored
   `frontend/.env.testnet.local`, then enter the fresh Sepolia contract and the
   selected browser-safe RPC URL.
2. Copy `frontend/.env.mainnet.example` to the ignored
   `frontend/.env.mainnet.local`, then enter the reviewed mainnet contract and
   a browser-safe production RPC endpoint.
3. Replace the zero contract placeholders and example callback domains in
   `frontend/wrangler.toml` before deployment.
4. Configure the matching callback URL in each independent GitHub OAuth
   application for its Worker/custom domain.

Build and deploy separately:

```bash
cd frontend
npm ci
npm run lint
npm run typecheck
npm test
npm run deploy:testnet
npm run deploy:mainnet
```

The Worker has per-environment native rate-limit bindings for score/challenge
and oracle requests. Treat attempts returning `429`, invalid wallet proofs, or
failed score-binding transactions as security-relevant events.

## Cloudflare Runtime Secrets

`wrangler.toml` contains only public build/runtime selections and rate-limit
bindings. Enter each secret independently in both environments; values must be
different between testnet and mainnet where they control authority:

```bash
npx wrangler secret put AUTH_SECRET --env testnet
npx wrangler secret put AUTH_GITHUB_ID --env testnet
npx wrangler secret put AUTH_GITHUB_SECRET --env testnet
npx wrangler secret put GITHUB_API_TOKEN --env testnet
npx wrangler secret put ORACLE_PRIVATE_KEY --env testnet
npx wrangler secret put RPC_URL --env testnet

npx wrangler secret put AUTH_SECRET --env mainnet
npx wrangler secret put AUTH_GITHUB_ID --env mainnet
npx wrangler secret put AUTH_GITHUB_SECRET --env mainnet
npx wrangler secret put GITHUB_API_TOKEN --env mainnet
npx wrangler secret put ORACLE_PRIVATE_KEY --env mainnet
npx wrangler secret put RPC_URL --env mainnet
```

`GITHUB_API_TOKEN` is a server-side token used only to raise public GitHub API
rate limits; the signed-in user's OAuth access token is not exposed in browser
session data. Give this token only the minimum public-read permissions needed.

## Monitoring And Incident Response

Monitor each environment independently for:

- `ScoreSet`, `WalletBound`, `WalletMigrated`, `LoanRequested`,
  `LoanLiquidated`, `PoolWithdrawn`, `Paused`, `OracleUpdated`, and ownership
  events.
- Total balance, reserved collateral, outstanding principal, default counts,
  API rate-limit denials, invalid proof attempts, and failed oracle writes.
- Owner/oracle/multisig changes, RPC availability, Worker errors, and GitHub
  OAuth failure rates.

Before mainnet funding, test the pause and oracle-revocation procedures using
Sepolia. For suspected oracle compromise or anomalous originations:

1. Have the owner multisig call `pause()`.
2. Revoke or rotate the oracle using `setOracle(address(0))` or a fresh oracle.
3. Disable the Worker oracle secret and preserve audit/chain transaction data.
4. Do not unpause or add liquidity until the incident is reviewed and any new
   deployment decision is recorded.

## Mainnet Go-Live Gates

The human owner must explicitly confirm all of the following before funding:

- All previously committed secrets and keys have been rotated or revoked.
- Fresh Sepolia and mainnet contract addresses are recorded and verified.
- Mainnet owner is the approved multisig; oracle is separate and secured.
- RPC provider values, Worker environment values/secrets, OAuth callback URLs,
  and monitoring/alert recipients are configured for each environment.
- Release-gate results are archived, exposure cap and initial liquidity are
  approved, and the final go-live decision has been made by the owner.
