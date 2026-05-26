# BaseCred Mainnet Readiness Review

Reviewed: 2026-05-26
Repository: `/Users/nachdakwale/projects/basecred`
Purpose: Handoff document for an implementing agent preparing BaseCred for a safe Base mainnet launch while retaining Base Sepolia as a live test environment.

## Launch Decision

Do not fund or launch BaseCred on Base mainnet in its current form.

The public Base Sepolia application is responding at `https://basecred.nachdakwale.workers.dev/dapp`, and its configured contract exists on Base Sepolia at:

```text
0x660726E88d838Da13FFbD3368302f88C8a717Ed4
```

Verified on 2026-05-26:

```text
Chain ID: 84532 (Base Sepolia)
Contract code present: yes
Paused: false
Pool balance: 0 ETH
Owner and oracle: the same externally owned account
```

Keep this deployment unfunded. Its controlling key has been committed to the repository and its borrowing model can be drained by a single qualifying identity using multiple wallets.

## Critical Blockers

### 1. Credit Can Be Reused Across Unlimited Wallets

Severity: Critical

The authenticated oracle endpoint accepts a caller-provided wallet address and writes the GitHub-derived score to that address:

- `frontend/app/api/oracle/route.ts:20-21`
- `frontend/app/api/oracle/route.ts:47-52`

The contract permits a sufficiently high scored address to borrow without collateral:

- `contracts/contracts/GitHubLoanPool.sol:66-90`
- `contracts/contracts/GitHubLoanPool.sol:92-113`

Exploit path:

1. A GitHub account qualifies for tier 4.
2. The account requests its score for wallet A and takes an uncollateralized loan.
3. The same account requests its score for wallet B and takes another loan.
4. Repeat with fresh wallets until available liquidity is exhausted.

Required remediation:

- Bind the scored GitHub identity to an on-chain borrower identity, not an arbitrary wallet address.
- Require wallet ownership proof, such as a signed challenge with nonce and expiration, before registering a wallet.
- Enforce one outstanding credit position and default history per identity.
- Decide whether wallet changes are prohibited or require explicit migration with cooldown/review.
- Add adversarial tests demonstrating that a single GitHub identity cannot borrow using multiple wallets.

### 2. Live Privileged Key Is Tracked In Git

Severity: Critical

Populated sensitive environment files are tracked:

- `contracts/.env`
- `frontend/.env.local`

The deployed Sepolia contract owner and oracle resolve to the same address derived from those tracked credentials. This means the existing deployment cannot be considered secure for holding meaningful test liquidity, and the key must never be reused for mainnet.

Required remediation:

- Rotate the deployer, owner, oracle, OAuth, and authentication secrets that were committed.
- Remove sensitive files from git tracking and prevent reintroduction with `.gitignore`.
- Assess whether repository history has been pushed/shared; if so, assume committed secrets are permanently exposed.
- Store Cloudflare runtime secrets with `wrangler secret put`, per environment.
- Redeploy the testnet contract using fresh test-only roles.
- Deploy mainnet using fresh keys with a multisig owner and separately managed oracle.

## High-Priority Protocol And Application Issues

### 3. Defaulted Borrowers Can Borrow Again

Severity: High

`liquidate()` clears an overdue loan but does not persist delinquency, unpaid debt, or score impairment:

- `contracts/contracts/GitHubLoanPool.sol:134-146`

The frontend claims, "Defaulted loans slash your credit score," but no contract or application behavior implements that policy:

- `frontend/components/LoanPanel.tsx:166-168`

Required remediation:

- Persist default state or outstanding bad debt against the bound identity.
- Define a recovery policy: permanent block, manual review, repayment of debt, cooldown, or explicitly reduced borrowing capacity.
- Make displayed product claims match enforced behavior.
- Test liquidation followed by attempted score refresh and re-borrow.

### 4. Owner Can Withdraw Borrower Collateral

Severity: High

`withdrawPool()` permits the owner to withdraw any contract balance without reserving collateral owed on active loans:

- `contracts/contracts/GitHubLoanPool.sol:148-152`

If collateral is withdrawn, a later successful repayment can revert or fail to return collateral to the borrower.

Required remediation:

- Track aggregate collateral reserved for active loans.
- Restrict administrative withdrawals to free liquidity above required reserves.
- Add invariant tests covering active collateral through withdrawal, repayment, and liquidation.

### 5. Oracle And Administration Controls Are Not Mainnet-Grade

Severity: High

The app signs `setScore()` transactions using a runtime private key:

- `frontend/app/api/oracle/route.ts:23-24`
- `frontend/app/api/oracle/route.ts:43-54`

The contract has one immutable oracle role and no score range check:

- `contracts/contracts/GitHubLoanPool.sol:6-7`
- `contracts/contracts/GitHubLoanPool.sol:54-63`

Required remediation:

- Separate oracle authority from contract ownership.
- Place owner/admin rights behind a multisig for mainnet.
- Add controlled oracle rotation and emergency revocation.
- Cap valid scores on-chain at the scoring system maximum (`650` currently).
- Establish per-identity and protocol-wide exposure limits before accepting real liquidity.
- Add monitoring for score writes, originations, liquidations, withdrawals, balance, and paused state.

### 6. GitHub OAuth Access Token Is Included In Browser Session Data

Severity: High

The NextAuth session callback copies `githubAccessToken` into the session object available to client components:

- `frontend/auth.ts:15-25`

The access token is only needed by server-side API routes:

- `frontend/app/api/score/route.ts`
- `frontend/app/api/oracle/route.ts`

Required remediation:

- Keep the GitHub token on the server side or in server-only JWT handling.
- Return only non-sensitive profile/session information to the browser.
- Recheck the requested GitHub scopes and use the least access necessary.

## Deployment And Repository Issues

### 7. There Is No Mainnet Configuration

Severity: Medium

The application is currently wired only for Base Sepolia:

- `contracts/hardhat.config.js:6-13`
- `frontend/lib/wagmi.ts:3-14`
- `frontend/app/api/oracle/route.ts:4-7`
- `frontend/components/LoanPanel.tsx:4-7`
- `frontend/app/dapp/page.tsx:128-130`
- `frontend/app/dapp/page.tsx:175-181`
- `frontend/wrangler.toml:8-10`

Base network identifiers from Base documentation:

| Environment | Chain ID | Public RPC endpoint |
| --- | ---: | --- |
| Base Mainnet | `8453` | `https://mainnet.base.org` |
| Base Sepolia | `84532` | `https://sepolia.base.org` |

Base states that its public RPC endpoints are rate-limited and not intended as production application infrastructure. Use a production RPC provider or operated infrastructure for a funded mainnet product.

### 8. Contract Deploy Script Does Not Run As Configured

Severity: Medium

`contracts/package.json` calls:

```json
"deploy:sepolia": "hardhat run scripts/deploy.ts --network baseSepolia"
```

The checked-in script is:

```text
contracts/scripts/deploy.js
```

Required remediation:

- Correct the deploy command and add a Base mainnet deployment command.
- Require explicit environment selection and reject missing oracle/admin configuration.
- Add verification and deployment-address recording to the launch process.

### 9. Generated Output And Dependencies Are Tracked

Severity: Medium

No project `.gitignore` was found. The repository tracks:

```text
128400 frontend/node_modules files
19255  contracts/node_modules files
1466   frontend/.next files
1136   frontend/.open-next files
5      contracts/artifacts/cache files
3      frontend/.wrangler files
```

Required remediation:

- Add ignore rules for dependencies, generated builds, local state, artifacts/cache as appropriate, and private env files.
- Untrack generated and secret files in a controlled cleanup commit.
- Preserve only intentional deploy metadata or verified contract artifacts where needed.

### 10. Frontend Lint Gate Is Broken

Severity: Medium

`frontend/package.json` defines `npm run lint` as `eslint`, but ESLint 9 requires a flat `eslint.config.*` file and none exists.

Required remediation:

- Add a valid ESLint configuration compatible with Next.js and ESLint 9.
- Run lint and typecheck in CI prior to deployment.

## Verified Checks

Performed against the current repository state on 2026-05-26:

| Check | Result |
| --- | --- |
| Public `/dapp` Worker route | HTTP `200` |
| Public unauthenticated `/api/score` route | HTTP `401`, expected |
| Base Sepolia contract code at configured address | Present |
| Base Sepolia contract pool balance | `0 ETH` |
| Base Sepolia contract paused state | `false` |
| Contract tests: `npx hardhat test --no-compile` | `26 passing` |
| Frontend typecheck: `npx tsc --noEmit --incremental false` | Passed |
| Frontend lint: `npm run lint` | Failed: no ESLint 9 flat config |

Passing tests only cover the current intended behavior. They do not cover the critical multi-wallet credit reuse, default re-borrow, collateral reserve, secret exposure, or role-management risks.

## Required Mainnet Workstream

Execute in this order because later deployment work is not meaningful until credit loss paths are closed.

### Phase 1: Stop Unsafe Funding And Rotate Credentials

- Do not fund the existing Base Sepolia deployment.
- Rotate all committed credentials.
- Add ignore rules and remove private/generated files from tracking.
- Redeploy Sepolia with fresh, test-only owner and oracle roles.

### Phase 2: Redesign Credit Identity Enforcement

- Establish a stable borrower identity keyed to verified GitHub identity.
- Require signed wallet binding.
- Enforce single active credit use and persisted default history at the identity level.
- Ensure score refreshes cannot reset default consequences.

### Phase 3: Harden The Contract

- Reserve collateral against administrative withdrawals.
- Add score bounds and configurable exposure controls.
- Add owner/oracle rotation and emergency administration.
- Use a multisig owner for mainnet.
- Add threat-driven tests and invariants.

### Phase 4: Harden The Web And Oracle Runtime

- Remove GitHub tokens from browser session data.
- Rate-limit and audit scoring/oracle requests.
- Move runtime secrets to environment-specific Cloudflare secret bindings.
- Add transaction and protocol monitoring.

### Phase 5: Configure And Validate Deployments

- Add Base mainnet contract deployment support.
- Deploy and verify independent contracts on Sepolia and mainnet.
- Fund mainnet only after contract/security review and a limited-risk launch policy are in place.

## Running Testnet And Mainnet Simultaneously

Testnet and mainnet must be independent deployments. Do not use one contract, one privileged wallet, or one frontend build artifact for both environments.

### Target Layout

| Concern | Testnet | Mainnet |
| --- | --- | --- |
| Network | Base Sepolia (`84532`) | Base Mainnet (`8453`) |
| Contract | Fresh disposable/test deployment | Reviewed funded deployment |
| Liquidity | Faucet/test funds only | Capped real liquidity |
| Owner | Test admin wallet/multisig | Mainnet multisig |
| Oracle | Test-only key | Separate secured mainnet oracle |
| Frontend | `basecred-testnet` Worker/custom domain | `basecred` Worker/production domain |
| OAuth | Test callback URL/application | Production callback URL/application |
| Monitoring | Test alerts/logging | Production alerts and incident controls |

### Configuration Changes Needed

1. Introduce environment-selected network configuration in the frontend.

   At minimum parameterize:

   ```text
   NEXT_PUBLIC_CHAIN_ID
   NEXT_PUBLIC_CONTRACT_ADDRESS
   NEXT_PUBLIC_EXPLORER_URL
   RPC_URL or environment-specific server-side RPC configuration
   ```

   Eliminate direct hard-coding of `baseSepolia` in user transaction and oracle code.

2. Configure both networks in Hardhat.

   Expected commands should be conceptually equivalent to:

   ```text
   npm run deploy:sepolia
   npm run deploy:base
   ```

   Each deployment must use its own oracle/owner setup and record the resulting contract address.

3. Use two Cloudflare Wrangler environments.

   Suggested shape:

   ```toml
   name = "basecred"
   main = ".open-next/worker.js"
   compatibility_date = "2025-01-01"
   compatibility_flags = ["nodejs_compat"]

   [env.testnet.vars]
   NEXTAUTH_URL = "https://<testnet-domain>"
   NEXT_PUBLIC_CHAIN_ID = "84532"
   NEXT_PUBLIC_CONTRACT_ADDRESS = "<fresh-sepolia-address>"
   NEXT_PUBLIC_EXPLORER_URL = "https://sepolia.basescan.org"

   [env.mainnet.vars]
   NEXTAUTH_URL = "https://<mainnet-domain>"
   NEXT_PUBLIC_CHAIN_ID = "8453"
   NEXT_PUBLIC_CONTRACT_ADDRESS = "<reviewed-mainnet-address>"
   NEXT_PUBLIC_EXPLORER_URL = "https://basescan.org"
   ```

   Supply sensitive values separately for each environment:

   ```text
   AUTH_SECRET
   AUTH_GITHUB_ID
   AUTH_GITHUB_SECRET
   ORACLE_PRIVATE_KEY
   ```

4. Build and deploy each frontend environment separately.

   Next.js exposes `NEXT_PUBLIC_*` configuration in browser bundles at build time. The mainnet bundle and testnet bundle must be built with their corresponding chain and contract settings, then deployed to distinct Workers/domains.

5. Keep operational boundaries separate.

   - Never share oracle keys between environments.
   - Never let testnet code or test secrets control mainnet.
   - Keep testnet available as a product sandbox after mainnet launches.
   - Display the active network clearly in the UI, particularly on testnet.

## Implementation Acceptance Criteria

Before any mainnet liquidity is deposited, the next agent should be able to show:

- A test proving the same GitHub identity cannot originate simultaneous loans through multiple wallets.
- A test proving a defaulted identity cannot simply refresh score and borrow again.
- A test proving admin withdrawals cannot consume collateral owed to active borrowers.
- Fresh credentials and deployments with separate owner/oracle roles.
- No committed production or test private keys/OAuth secrets.
- Working `lint`, typecheck, and contract test gates.
- Distinct, functional Sepolia and mainnet environment configuration.
- Documented monitoring, pause, oracle rotation, and incident-response procedures.

## Primary Documentation References

- Base network configuration and chain identifiers: <https://docs.base.org/base-chain/quickstart/connecting-to-base>
- Base RPC overview: <https://docs.base.org/base-chain/api-reference/rpc-overview>
- Cloudflare Wrangler environments and environment-specific secrets: <https://developers.cloudflare.com/workers/wrangler/environments/>
