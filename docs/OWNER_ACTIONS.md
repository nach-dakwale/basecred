# BaseCred Owner Action Checklist

## Purpose

This checklist covers actions that code changes cannot complete because they
require owner-controlled accounts, fresh credentials, external provider
configuration, contract authority, or a funding decision.

Do not consider BaseCred ready for Base mainnet funding until every mandatory
item below is completed and its non-secret evidence is recorded.

## Non-Negotiable Safety Rules

- Keep the previous Base Sepolia contract
  `0x660726E88d838Da13FFbD3368302f88C8a717Ed4` unfunded.
- Treat all values previously committed in `contracts/.env`,
  `frontend/.env.local`, and `frontend/.env.production` as compromised.
- Never paste, print, store in Git, or include in handoff notes any private
  key, OAuth client secret, Auth secret, API token, or private RPC credential.
- Do not reuse a testnet key, OAuth application, oracle key, or Worker secret
  in the mainnet environment.
- Do not use `https://mainnet.base.org` as funded mainnet application
  infrastructure.
- Do not fund or publicly launch mainnet until the explicit funding approval
  gate in this document is complete.

## Owner Inputs Required

Provide these values through the appropriate secret/provider interfaces, not
through Git-tracked files or chat transcripts containing secret values:

| Input | Testnet | Mainnet |
| --- | --- | --- |
| Contract owner address | Fresh test admin or test multisig | Approved multisig address |
| Oracle signer | Fresh test-only signer | Fresh separately managed signer |
| Deployer funding | Faucet/test ETH only | Enough deployment gas only until launch approval |
| RPC provider | Base Sepolia endpoint or provider | Production-grade Base provider endpoint |
| GitHub OAuth app | Testnet app and callback domain | Separate production app and callback domain |
| Cloudflare Worker domain | Testnet Worker/custom domain | Mainnet Worker/custom domain |
| Runtime secrets | Independent testnet values | Independent mainnet values |
| Exposure cap | Test-only value | Conservative approved launch cap |
| Initial pool funding | Faucet/test funds only | Amount approved at final go-live gate |
| Alert destinations | Test notification route | Production monitored notification route |

## Execution Evidence: 2026-05-26 To 2026-05-27

The following checks were completed without inspecting or recording secret
values. The recorded testnet deployment used fresh Keychain-held roles; no
Worker or mainnet contract has been deployed. Owner-controlled actions
requiring external configuration, signatures, or approval remain unchecked
below.

| Validation | Non-secret evidence | Result |
| --- | --- | --- |
| Legacy Sepolia contract balance | Public Base Sepolia RPC read of `0x660726E88d838Da13FFbD3368302f88C8a717Ed4` on chain `84532` | Passed: contract code exists and balance is `0 wei` |
| Tracked credential cleanup | `git ls-files` and ignore checks; deletion of ignored compromised local copies without reading values | Passed for HEAD: populated environment files are not tracked; legacy ignored local environment copies were removed |
| Contract release gates | `npm ci`, `npm run test`, `npm run compile` | Passed: 10 contract tests passed and compilation completed |
| Frontend release gates | `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test` | Passed: lint/typecheck passed and 6 unit tests passed |
| Environment build selection | Testnet and mainnet OpenNext builds from a clean detached worktree using public placeholder contract/RPC inputs only | Passed as configuration validation only; no artifact deployed |
| Frontend/deploy safeguards | Rejection checks for Base public mainnet RPC and identical owner/oracle inputs | Passed: unsafe inputs rejected before deployment |
| Cloudflare legacy containment | Wrangler secret deletion and local ignored-file removal | Passed: legacy `basecred` secret binding list is empty; legacy ignored environment copies were removed without reading their values |
| Cloudflare separation | Read-only Wrangler environment inspection | In progress: intended `basecred-testnet` and `basecred-mainnet` Workers do not yet exist |
| Fresh signer creation | Independent private keys generated in memory and stored only in macOS Keychain | Passed for testnet deployer/owner/oracle and mainnet oracle; public addresses recorded below |
| Fresh testnet deployer funding | Public Base Sepolia RPC balance reads on 2026-05-27 | Passed for testnet deployment gas: fresh deployer received approximately `0.02498 ETH`; funding was forwarded externally from the exposed legacy EOA and does not remediate its compromise |
| Fresh Sepolia deployment | Public Base Sepolia transaction receipt and contract state reads on 2026-05-27 | Passed: fresh contract deployed with intended test-only roles and `0.01 ETH` cap; initial contract balance is `0 ETH` |
| Public source verification | Hardhat verification submission to Sourcify on 2026-05-27 | Partially passed: Sourcify exact full-match verified; BaseScan publication remains pending a `BASESCAN_API_KEY` entered outside Git |
| Testnet frontend build selection | Lint, typecheck, unit tests, OpenNext `build:testnet`, and Wrangler testnet dry run on 2026-05-27 | Passed for build/config validation: fresh testnet contract and chain `84532` selected; no Worker deployed |
| Dependency audit | Overrides plus `npm audit` and `npm audit --omit=dev` recheck on 2026-05-27 | Frontend full audit and contract production audit are clear; contract development/deployment tooling currently reports 35 findings (`18` low, `4` moderate, `13` high), pending assessment before any mainnet action |

## Phase 1: Revoke And Rotate Exposed Credentials

- [x] Confirm the old Base Sepolia contract remains unfunded. Verified through
      public Base Sepolia RPC balance reads on 2026-05-26 and 2026-05-27:
      `0 wei`.
- [ ] Retire the exposed Sepolia deployer/owner/oracle credential and never
      use it for any further action. It was operationally contained on
      2026-05-26 by removing local copies and deleting the legacy Worker's
      oracle binding, but it was later used externally on 2026-05-27 to
      forward test funds to the fresh deployer; treat it as compromised and
      unusable going forward.
- [ ] Rotate Auth.js/NextAuth secrets previously stored in tracked environment
      files.
- [ ] Rotate or replace GitHub OAuth client credentials that were stored in
      tracked environment files.
- [ ] Revoke and replace any exposed GitHub server API token, if one existed.
- [ ] Replace any previously deployed Cloudflare runtime secrets.
- [x] Confirm no rotated value was entered into Git-tracked files, command
      output captured in notes, or commit messages. Fresh private values were
      retained in Keychain or local wallet storage only; public addresses are
      recorded below.

Evidence to record without secrets:

| Item | Environment | Completion Date | Revoked/Rotated By | Notes |
| --- | --- | --- | --- | --- |
| Legacy unsafe contract balance | Testnet | 2026-05-26 | Public RPC read | `0 wei`; keep unfunded |
| Privileged wallet credentials | Testnet | 2026-05-26 | Codex execution | Fresh roles generated; compromised local copies removed; legacy Worker oracle binding deleted |
| Misrouted faucet funds at legacy EOA | Testnet | 2026-05-27 | Public RPC read | Approximately `0.02498 ETH` observed at exposed EOA `0xf4b2aB8Db0e7A1F84aCEE48D3C2e76C4a42C700A`, then forwarded externally to the fresh deployer; do not reuse this address |
| Auth secret | Testnet |  |  |  |
| GitHub OAuth credentials | Testnet |  |  |  |
| Worker runtime secrets | Testnet | 2026-05-26 | Codex execution | Legacy `basecred` binding list is empty; fresh isolated Worker secrets pending deployment |
| Auth secret | Mainnet |  |  | Newly created only |
| GitHub OAuth credentials | Mainnet |  |  | Newly created only |
| Worker runtime secrets | Mainnet |  |  | Newly created only |

## Phase 2: Establish Independent Roles And Providers

- [x] Create a fresh testnet oracle signer and test owner/admin arrangement.
- [ ] Select and approve the mainnet multisig owner address.
- [x] Create a separate mainnet oracle signer with a controlled operational
      process and minimal gas balance. Credential is held in Keychain and has
      not been funded.
- [ ] Confirm no owner and oracle addresses are identical within either
      environment.
- [ ] Select a production-grade mainnet server RPC provider and browser-safe
      client RPC endpoint.
- [ ] Decide and record the initial `MAX_TOTAL_PRINCIPAL_ETH` value for each
      environment.

Non-secret configuration record:

| Configuration | Testnet | Mainnet |
| --- | --- | --- |
| Deployer public address | `0xe85fB2228F484dE93C6D41A1bCb802d488054a7e` | Pending approved multisig workflow |
| Owner/multisig address | `0xeAA84647AAa3Af893f2666216cf5e6371d0c34AD` | Pending approved multisig |
| Oracle public address | `0x39a33072BB6dA521Fe6994F891AdDB0e4e4Ebc16` | `0xCAa3D33ece59b936F27c0A2E2A5918bba02A2Fe5` |
| RPC provider name | Base public Sepolia RPC, test-only |  |
| Browser RPC host, if public | `https://sepolia.base.org` (test-only) |  |
| Exposure cap | `0.01 ETH` initial test cap |  |

## Phase 3: Deploy And Verify Fresh Contracts

Perform deployment from `contracts/` on the implemented branch after all
contract tests pass:

```bash
npm ci
npm run test
npm run compile
npm run deploy:sepolia
npm run deploy:base
```

The deployment environment must be supplied outside Git according to
`contracts/.env.example`. Do not copy actual credential values into this
document.

- [x] Deploy a fresh Base Sepolia contract using fresh test-only roles.
- [x] Confirm the old Sepolia contract remains unfunded and is not referenced
      by the new frontend.
- [ ] Verify the fresh Sepolia contract source on BaseScan.
- [ ] Deploy a fresh Base mainnet contract only with the approved multisig
      owner, distinct oracle, production RPC provider, and approved exposure
      cap.
- [ ] Verify the fresh mainnet contract source on BaseScan.
- [ ] Confirm the constructor arguments, chain, owner, oracle, exposure cap,
      and paused state for both new deployments.
- [ ] Keep the mainnet pool unfunded until Phase 7 approval.

Deployment record:

| Field | Testnet | Mainnet |
| --- | --- | --- |
| Chain ID | `84532` | `8453` |
| Contract address | `0x4b26eB9487DFB97e967Bb45262AABfF73c816C72` |  |
| Deployment transaction hash | `0x7c9d37b9e77bdb3296781e9e0b771f52ed6d7c2b168ffcd98aa17d1811d27967` |  |
| Owner address | `0xeAA84647AAa3Af893f2666216cf5e6371d0c34AD` |  |
| Oracle address | `0x39a33072BB6dA521Fe6994F891AdDB0e4e4Ebc16` |  |
| Exposure cap | `0.01 ETH` |  |
| Verification URL | [Sourcify full match](https://repo.sourcify.dev/contracts/full_match/84532/0x4b26eB9487DFB97e967Bb45262AABfF73c816C72/) (BaseScan pending API token) |  |
| Initial balance after deploy | `0 ETH` | `0 ETH` until approval |

## Phase 4: Configure OAuth, Cloudflare And Frontend Deployments

Set up separate GitHub OAuth applications and separate Cloudflare Worker
deployments/domains.

- [ ] Configure the testnet OAuth callback URL for the selected testnet domain.
- [ ] Configure the mainnet OAuth callback URL for the selected production
      domain in a separate OAuth application.
- [ ] Replace placeholder public values in the environment-specific frontend
      deployment configuration with each fresh contract address and domain.
- [ ] Prepare ignored build-time files from
      `frontend/.env.testnet.example` and
      `frontend/.env.mainnet.example`.
- [ ] Set the following Cloudflare secrets independently for `testnet` and
      `mainnet`: `AUTH_SECRET`, `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`,
      `GITHUB_API_TOKEN`, `ORACLE_PRIVATE_KEY`, and `RPC_URL`.
- [ ] Build and deploy the testnet frontend artifact.
- [ ] Build and deploy the distinct mainnet frontend artifact.
- [ ] Confirm the visible network banner is correct on each deployed site.
- [ ] Confirm each environment points only to its own chain and fresh
      contract.

Public deployment record:

| Field | Testnet | Mainnet |
| --- | --- | --- |
| Frontend URL |  |  |
| OAuth callback URL | `https://basecred-testnet.nachdakwale.workers.dev/api/auth/callback/github` | `https://basecred-mainnet.nachdakwale.workers.dev/api/auth/callback/github` |
| Worker environment name | `testnet` | `mainnet` |
| Chain ID shown by UI | `84532` | `8453` |
| Contract shown/configured | `0x4b26eB9487DFB97e967Bb45262AABfF73c816C72` (build validation only) |  |
| Explorer base URL | `https://sepolia.basescan.org` | `https://basescan.org` |

Read-only Cloudflare observation on 2026-05-26:

| Worker | Deployment state | Secret-value handling |
| --- | --- | --- |
| `basecred` | Existing legacy Worker deployment | Exposed binding names deleted on 2026-05-26; legacy authenticated/oracle functionality disabled |
| `basecred-testnet` | Does not exist | Create only after fresh testnet configuration and secrets are ready |
| `basecred-mainnet` | Does not exist | Create only after approved mainnet configuration and secrets are ready |

## Phase 5: Validate Security Flows On Testnet

Before considering mainnet liquidity:

- [ ] Use a test GitHub identity and wallet to sign a binding challenge and
      confirm a score submission succeeds on the fresh Sepolia contract.
- [ ] Confirm the same identity cannot obtain simultaneous credit through a
      second wallet.
- [ ] Confirm challenge replay or an expired signature fails.
- [ ] Originate and repay a collateralized test loan; confirm reserved
      collateral returns correctly.
- [ ] Validate default handling on a test identity; confirm refresh/reborrow is
      blocked after liquidation.
- [ ] Exercise owner withdrawal protection while collateral is reserved.
- [ ] Exercise `pause()`, oracle revocation/rotation, and unpause procedures.
- [ ] Confirm API audit events and rate-limit behavior are visible in
      Cloudflare logging/monitoring.

## Phase 6: Monitoring And Incident Readiness

- [ ] Create alerts/dashboards for contract balance, outstanding principal,
      reserved collateral, defaults, paused state, score bindings,
      originations, liquidations, withdrawals, oracle changes, and ownership
      changes.
- [ ] Configure alerts for Worker failures, RPC errors, OAuth failures, API
      rate limits, invalid wallet proofs, and failed oracle writes.
- [ ] Record the operational contacts/signers able to invoke the mainnet
      multisig pause and oracle rotation procedures.
- [ ] Run a Sepolia incident drill: pause, revoke/rotate oracle, preserve
      logs, and require review before restoring operation.
- [ ] Record where release evidence and incident records will be retained.

## Phase 7: Mainnet Funding And Launch Approval

This phase requires an explicit owner decision after all earlier phases pass.

- [ ] Review dependency audit findings and resolve or explicitly accept the
      remaining production risk.
- [ ] Archive passing release-gate outputs for contract tests, contract
      compile, frontend lint, frontend typecheck, frontend tests, both frontend
      builds, and deployment/configuration validation.
- [ ] Reconfirm that every exposed credential has been revoked or rotated.
- [ ] Reconfirm mainnet ownership is held by the approved multisig and the
      oracle role is separate.
- [ ] Reconfirm the mainnet contract is verified, paused/unpaused as intended,
      and configured with the approved exposure cap.
- [ ] Obtain written approval for initial mainnet liquidity amount and final
      go-live decision.
- [ ] Fund only the fresh verified mainnet contract with the approved amount.
- [ ] Monitor the initial launch under the capped exposure policy and pause on
      unexpected behavior.

Approval record:

| Decision | Value |
| --- | --- |
| Approved exposure cap |  |
| Approved initial liquidity |  |
| Approving owner/multisig reference |  |
| Approval date |  |
| Funding transaction hash |  |
| Go-live confirmation |  |

## Current Blockers

- The legacy Worker secret bindings and local compromised environment copies
  have been removed. GitHub requires interactive sudo authentication to revoke
  the old OAuth application and create independent testnet/mainnet OAuth
  applications; fresh Auth/OAuth/optional API token secrets remain pending.
- Fresh testnet roles and a separate unfunded mainnet oracle are recorded.
  Approved mainnet multisig ownership, production RPC provider selection,
  mainnet exposure cap, and alert destinations remain pending.
- A fresh Sepolia contract is deployed and Sourcify full-match verified.
  BaseScan source publication still requires a `BASESCAN_API_KEY` entered
  outside Git, and the testnet Worker cannot be deployed until fresh OAuth and
  Worker secrets are entered through provider interfaces.
- Security-flow execution, monitoring setup, and the Sepolia incident drill
  require the isolated testnet Worker, fresh OAuth application, and operational
  test identities.
- Frontend dependency audit findings were remediated to zero. Contract runtime
  has no production dependency findings; its development/deployment tooling
  currently reports 35 findings, including 13 high-severity findings after the
  2026-05-27 advisory recheck. These findings must be assessed and addressed
  or explicitly accepted before mainnet deployment or funding.
- Mainnet deployment, funding, and go-live remain unauthorized; no liquidity
  transaction has been performed.

## Completion Standard

The owner-action work is complete only when the evidence tables above contain
non-secret records for both environments, the fresh contract/frontend
deployments have been validated, monitoring and incident procedures have been
tested, and written mainnet funding approval is recorded.

Until then:

- The old Sepolia contract remains unfunded.
- The fresh mainnet contract, if deployed, remains unfunded.
- BaseCred must not be described as mainnet-ready for real liquidity.
