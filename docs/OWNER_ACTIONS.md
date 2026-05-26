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

## Execution Evidence: 2026-05-26

The following checks were completed without inspecting local secret values,
deploying contracts or Workers, or transferring funds. Owner-controlled
actions requiring credentials, external configuration, signatures, or
approval remain unchecked below.

| Validation | Non-secret evidence | Result |
| --- | --- | --- |
| Legacy Sepolia contract balance | Public Base Sepolia RPC read of `0x660726E88d838Da13FFbD3368302f88C8a717Ed4` on chain `84532` | Passed: contract code exists and balance is `0 wei` |
| Tracked credential cleanup | `git ls-files` and ignore checks | Passed for HEAD: populated environment files are not tracked; ignored legacy local files remain present and were not inspected |
| Contract release gates | `npm ci`, `npm run test`, `npm run compile` | Passed: 10 contract tests passed and compilation completed |
| Frontend release gates | `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test` | Passed: lint/typecheck passed and 6 unit tests passed |
| Environment build selection | Testnet and mainnet OpenNext builds from a clean detached worktree using public placeholder contract/RPC inputs only | Passed as configuration validation only; no artifact deployed |
| Frontend/deploy safeguards | Rejection checks for Base public mainnet RPC and identical owner/oracle inputs | Passed: unsafe inputs rejected before deployment |
| Cloudflare separation | Read-only Wrangler environment inspection | Blocked: legacy `basecred` Worker exists; intended `basecred-testnet` and `basecred-mainnet` Workers do not yet exist |
| Dependency audit | `npm audit` and `npm audit --omit=dev` | Blocking assessment recorded: contract tooling has 43 findings including 3 high; frontend production paths have 23 moderate findings |

## Phase 1: Revoke And Rotate Exposed Credentials

- [x] Confirm the old Base Sepolia contract remains unfunded. Verified through a
      public Base Sepolia RPC balance read on 2026-05-26: `0 wei`.
- [ ] Revoke the exposed Sepolia deployer/owner/oracle credential and never use
      it for any fresh deployment.
- [ ] Rotate Auth.js/NextAuth secrets previously stored in tracked environment
      files.
- [ ] Rotate or replace GitHub OAuth client credentials that were stored in
      tracked environment files.
- [ ] Revoke and replace any exposed GitHub server API token, if one existed.
- [ ] Replace any previously deployed Cloudflare runtime secrets.
- [ ] Confirm no rotated value was entered into Git-tracked files, command
      output captured in notes, or commit messages.

Evidence to record without secrets:

| Item | Environment | Completion Date | Revoked/Rotated By | Notes |
| --- | --- | --- | --- | --- |
| Legacy unsafe contract balance | Testnet | 2026-05-26 | Public RPC read | `0 wei`; keep unfunded |
| Privileged wallet credentials | Testnet |  |  |  |
| Auth secret | Testnet |  |  |  |
| GitHub OAuth credentials | Testnet |  |  |  |
| Worker runtime secrets | Testnet |  |  | Legacy `basecred` Worker still has secret bindings; replacement or authorized disabling is pending |
| Auth secret | Mainnet |  |  | Newly created only |
| GitHub OAuth credentials | Mainnet |  |  | Newly created only |
| Worker runtime secrets | Mainnet |  |  | Newly created only |

## Phase 2: Establish Independent Roles And Providers

- [ ] Create a fresh testnet oracle signer and test owner/admin arrangement.
- [ ] Select and approve the mainnet multisig owner address.
- [ ] Create a separate mainnet oracle signer with a controlled operational
      process and minimal gas balance.
- [ ] Confirm no owner and oracle addresses are identical within either
      environment.
- [ ] Select a production-grade mainnet server RPC provider and browser-safe
      client RPC endpoint.
- [ ] Decide and record the initial `MAX_TOTAL_PRINCIPAL_ETH` value for each
      environment.

Non-secret configuration record:

| Configuration | Testnet | Mainnet |
| --- | --- | --- |
| Owner/multisig address |  |  |
| Oracle public address |  |  |
| RPC provider name |  |  |
| Browser RPC host, if public |  |  |
| Exposure cap |  |  |

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

- [ ] Deploy a fresh Base Sepolia contract using fresh test-only roles.
- [ ] Confirm the old Sepolia contract remains unfunded and is not referenced
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
| Contract address |  |  |
| Deployment transaction hash |  |  |
| Owner address |  |  |
| Oracle address |  |  |
| Exposure cap |  |  |
| Verification URL |  |  |
| Initial balance after deploy |  | `0 ETH` until approval |

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
| OAuth callback URL |  |  |
| Worker environment name | `testnet` | `mainnet` |
| Chain ID shown by UI | `84532` | `8453` |
| Contract shown/configured |  |  |
| Explorer base URL | `https://sepolia.basescan.org` | `https://basescan.org` |

Read-only Cloudflare observation on 2026-05-26:

| Worker | Deployment state | Secret-value handling |
| --- | --- | --- |
| `basecred` | Existing legacy Worker deployment | Secret binding names present; values not read; rotation/revocation pending |
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

- The owner must revoke the exposed wallet authority and rotate Auth, OAuth,
  GitHub token, and legacy Worker credentials through their provider
  interfaces. The existing Worker can be disabled only with an explicit
  decision to interrupt the legacy application or after replacement values are
  ready.
- Fresh testnet owner/oracle public addresses, approved mainnet multisig and
  separate oracle public addresses, RPC provider selection, exposure caps,
  domains, and alert destinations have not been supplied.
- No fresh contract or isolated Worker deployment can proceed until those
  inputs exist and secrets are entered directly through provider interfaces.
- Security-flow execution, monitoring setup, and the Sepolia incident drill
  require the fresh testnet deployment and operational accounts.
- Dependency audit findings remain unaccepted and unresolved. No production
  funding decision can be made until this risk is resolved or explicitly
  accepted by the owner after review.
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
