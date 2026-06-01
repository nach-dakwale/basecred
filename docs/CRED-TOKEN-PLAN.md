# CRED Token: Governance + Dividends

## Overview

Add a native token (CRED) to BaseCred that gives holders two rights:
1. **Dividends** -- pro-rata share of interest collected by the loan pool
2. **Governance** -- on-chain voting over protocol parameters

Token holders become the underwriters. They fund the pool, earn yield from borrower interest, and set the risk parameters they're exposed to.

---

## Token Design

| Property | Value |
|---|---|
| Name | BaseCred |
| Symbol | CRED |
| Standard | ERC-20 + ERC-20Votes (OpenZeppelin) |
| Supply | Fixed: 100,000,000 CRED |
| Decimals | 18 |

**Distribution (TBD, placeholder):**
- 40% -- founding team, 4-year vest, 1-year cliff
- 30% -- public sale / community
- 20% -- liquidity + treasury
- 10% -- grants / ecosystem

---

## New Contracts

### 1. `CredToken.sol`

Standard ERC-20 with ERC-20Votes extension for governance checkpointing.

- Fixed supply minted to deployer at construction
- Supports `delegate()` so holders can self-delegate or assign votes
- No mint/burn post-deploy

### 2. `CredDividends.sol`

Pull-based dividend distributor. Borrowers repay into `GitHubLoanPool`; interest is forwarded here on repayment.

**Core mechanism (ERC-20 dividend pattern):**
- Tracks a global `rewardPerTokenStored` (scaled by 1e18)
- On each ETH deposit: `rewardPerTokenStored += amount * 1e18 / totalSupply`
- Each holder tracks `rewardPerTokenPaid` -- their snapshot at last claim
- `pendingReward(account)` = `balance * (rewardPerTokenStored - rewardPerTokenPaid) / 1e18`
- `claim()` sends accumulated ETH to caller

No push distribution -- holders claim when they want. Gas stays low regardless of holder count.

**Key functions:**
```
receiveInterest() external payable          // called by LoanPool on repayment
claim() external                            // holder pulls their share
pendingReward(address) view returns (uint)  // how much is claimable
```

**Accounting invariant:** `sum(pendingReward(all holders)) <= address(this).balance`

### 3. `CredGovernor.sol`

OpenZeppelin `Governor` + `GovernorVotes` + `GovernorTimelockControl`.

- Proposals are queued through a `TimelockController` before execution
- Voting token: `CredToken` (ERC-20Votes)
- Quorum: 4% of total supply
- Voting delay: 1 day (time between proposal and voting start)
- Voting period: 5 days
- Timelock delay: 2 days (between vote passing and execution)

**Governable parameters on `GitHubLoanPool`:**
- `INTEREST_BPS` (currently hardcoded 1000 = 10%) -- make mutable, owner = timelock
- `maxTotalPrincipal` -- max pool exposure
- Tier thresholds (score cutoffs for tiers 1-4)
- Max loan per tier
- Collateral BPS per tier
- Oracle address

### 4. `TimelockController.sol`

Standard OZ timelock. Proposer = Governor, executor = Governor, admin = zero address post-setup (fully decentralized). Delay: 2 days.

---

## Changes to `GitHubLoanPool`

1. **Make parameters mutable** -- extract `INTEREST_BPS`, tier thresholds, max loans, and collateral ratios from constants/hardcoded into storage variables with setter functions. Setters restricted to `onlyOwner` (which will be the timelock).

2. **Forward interest on repayment** -- in `repayLoan()`, calculate the interest portion and call `CredDividends.receiveInterest{value: interest}()` instead of letting it sit in the pool.

3. **Transfer ownership to timelock** -- after deployment, call `transferOwnership(timelockAddress)`.

---

## Deployment Sequence

```
1. Deploy CredToken(initialOwner)
2. Deploy TimelockController(delay=2days, proposers=[], executors=[])
3. Deploy CredGovernor(credToken, timelock)
4. Grant PROPOSER_ROLE to governor on timelock
5. Grant EXECUTOR_ROLE to governor on timelock
6. Renounce TIMELOCK_ADMIN_ROLE from deployer on timelock
7. Deploy CredDividends(credToken)
8. Upgrade GitHubLoanPool: make params mutable, add dividends forwarding
9. Call GitHubLoanPool.transferOwnership(timelockAddress)
10. Distribute CRED tokens per allocation
```

---

## Files to Create / Modify

| File | Action |
|---|---|
| `contracts/contracts/CredToken.sol` | Create |
| `contracts/contracts/CredDividends.sol` | Create |
| `contracts/contracts/CredGovernor.sol` | Create |
| `contracts/contracts/GitHubLoanPool.sol` | Modify (mutable params + interest forwarding) |
| `contracts/deploy/03_cred_token.ts` | Create |
| `contracts/deploy/04_cred_dividends.ts` | Create |
| `contracts/deploy/05_cred_governor.ts` | Create |
| `contracts/test/CredToken.test.ts` | Create |
| `contracts/test/CredDividends.test.ts` | Create |
| `contracts/test/CredGovernor.test.ts` | Create |
| `frontend/app/govern/page.tsx` | Create (governance UI) |
| `frontend/app/dividends/page.tsx` | Create (claim UI) |

---

## Open Questions

- **Token distribution:** Who gets what at launch? Need to decide before deploy.
- **Initial pool ownership:** During testnet, keep deployer as owner until governance is battle-tested?
- **CRED price / sale:** Are we doing a public sale or airdrop first?
- **Voting quorum:** 4% of 100M = 4M CRED. Is that realistic given distribution?
- **Interest split:** Does 100% of interest go to dividends, or do we keep a protocol fee (e.g. 20% treasury, 80% holders)?

---

## Implementation Order

1. `CredToken.sol` + tests -- no dependencies, start here
2. `CredDividends.sol` + tests -- depends on token
3. Modify `GitHubLoanPool.sol` -- make params mutable, wire interest forwarding
4. `CredGovernor.sol` + timelock + tests -- depends on token
5. Deployment scripts
6. Frontend: dividends claim page
7. Frontend: governance proposals page
