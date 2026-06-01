# CRED Token: Governance + Dividends

## Decisions Locked

| Decision | Value |
|---|---|
| Protocol fee | 20% of all interest collected |
| Holder dividend | 80% of all interest collected |
| Token distribution | Private token sale |
| Governance | Token holders via on-chain voting |
| Interest split execution | On-chain, automatic at repayment time |

---

## Overview

Add a native token (CRED) to BaseCred that gives holders two rights:
1. **Dividends** -- 80% of borrower interest, distributed pro-rata to CRED holders
2. **Governance** -- on-chain voting over protocol parameters

The remaining 20% of interest goes to a protocol treasury controlled by the team (initially an EOA, migrated to multisig).

Token holders become the underwriters. They fund the pool, earn yield from borrower interest, and govern the risk parameters they're exposed to.

---

## Token Design

| Property | Value |
|---|---|
| Name | BaseCred |
| Symbol | CRED |
| Standard | ERC-20 + ERC-20Votes (OpenZeppelin) |
| Supply | Fixed: 100,000,000 CRED |
| Decimals | 18 |

**Distribution:**
- 40% -- founding team, 4-year vest, 1-year cliff
- 40% -- private sale (investors fund the loan pool)
- 10% -- liquidity + treasury reserve
- 10% -- grants / ecosystem / future community

---

## Architecture

```
Borrower
  |
  | repayLoan() + interest
  v
GitHubLoanPool
  |
  |-- 80% interest --> CredDividends --> claim() --> CRED holders
  |-- 20% interest --> treasury EOA/multisig
  |
  | (parameters governed by)
  v
CredGovernor --> TimelockController --> GitHubLoanPool.setX()
      ^
      |
   CRED holders vote
```

---

## Contracts to Build

### 1. `CredToken.sol`

Standard ERC-20 with ERC-20Votes extension for governance checkpointing.

- Fixed supply minted to deployer at construction
- Supports `delegate()` -- holders must self-delegate to activate voting weight
- No mint/burn post-deploy
- Inherits: `ERC20`, `ERC20Permit`, `ERC20Votes`

```solidity
constructor(address initialOwner) {
    _mint(initialOwner, 100_000_000 * 10**18);
}
```

### 2. `CredDividends.sol`

Pull-based ETH dividend distributor. Receives 80% of interest from the loan pool on every repayment.

**Core mechanism (ERC-20 dividend pattern):**
- Tracks a global `rewardPerTokenStored` (scaled by 1e18)
- On each ETH deposit: `rewardPerTokenStored += deposit * 1e18 / totalSupply`
- Each holder has a `rewardPerTokenPaid` snapshot updated on every balance change or claim
- `pendingReward(account)` = `balance * (rewardPerTokenStored - rewardPerTokenPaid[account]) / 1e18 + unclaimed[account]`
- `claim()` sends accumulated ETH to caller and zeroes their balance

**Key invariant:** `sum(pendingReward(all holders)) <= address(this).balance`

**Key functions:**
```
receiveInterest() external payable              // only callable by loan pool
claim() external returns (uint256)              // pull pending ETH
pendingReward(address) view returns (uint256)   // live claimable amount
notifyBalanceChange(address, uint256, uint256)  // called by token on transfer
```

**Note:** `CredDividends` needs to hook into token transfers so `rewardPerTokenPaid` snapshots stay accurate when CRED moves between wallets. Two options:
- Option A: CredToken calls `notifyBalanceChange` in `_update()` override (tight coupling)
- Option B: Holders manually checkpoint before transferring (worse UX)

**Decision: Option A.** CredToken will have a `dividends` address it calls on every transfer, mint, and burn.

### 3. `CredPrivateSale.sol`

Simple fixed-rate sale contract for the private round.

- Owner sets: price in ETH per CRED, hard cap in ETH, start/end timestamps
- Buyers send ETH, receive CRED immediately at the fixed rate
- Owner can withdraw raised ETH at any time
- Owner can recover unsold CRED after sale ends
- No vesting on buyer side (vesting handled off-chain or via separate contract later)

```
buy() external payable              // send ETH, receive CRED
withdraw() external onlyOwner       // pull raised ETH
recoverUnsoldTokens() external      // after sale end, recover remaining CRED
```

### 4. `CredGovernor.sol`

OpenZeppelin `Governor` + `GovernorVotes` + `GovernorTimelockControl`.

| Parameter | Value |
|---|---|
| Voting token | CRED (ERC-20Votes) |
| Quorum | 4% of total supply (4,000,000 CRED) |
| Voting delay | 1 day |
| Voting period | 5 days |
| Timelock delay | 2 days |
| Proposal threshold | 100,000 CRED (0.1% of supply) |

**Governable parameters on `GitHubLoanPool`:**
- `interestBps` (currently hardcoded 1000 = 10%)
- `maxTotalPrincipal`
- `protocolFeeBps` (the 20/80 split)
- Tier score thresholds (4 values)
- Max loan per tier (4 values)
- Collateral BPS per tier (4 values)
- `oracle` address

### 5. `TimelockController` (OZ standard, no custom code)

- Proposer: CredGovernor
- Executor: CredGovernor
- Admin: renounced after setup (fully decentralized)
- Delay: 2 days

---

## Changes to `GitHubLoanPool`

### Make parameters mutable

Extract hardcoded values into storage with governance-controlled setters:

```solidity
// Before (constants)
uint256 public constant INTEREST_BPS = 1000;

// After (mutable, owner = timelock)
uint256 public interestBps = 1000;
function setInterestBps(uint256 bps) external onlyOwner { ... }
```

Parameters to make mutable:
- `interestBps`
- `protocolFeeBps` (new -- currently implicit 0%)
- `tierThresholds[4]`
- `tierMaxLoans[4]`
- `tierCollateralBps[4]`

### Wire interest forwarding on repayment

In `repayLoan()`, split interest at payment time:

```solidity
uint256 interest = (amount * interestBps) / 10000;
uint256 protocolCut = (interest * protocolFeeBps) / 10000;  // 20%
uint256 holderCut = interest - protocolCut;                  // 80%

if (protocolCut > 0) _send(treasury, protocolCut);
if (holderCut > 0) ICredDividends(dividends).receiveInterest{value: holderCut}();
```

New storage: `address public dividends` and `address public treasury`.

### Transfer ownership to timelock after deployment

`transferOwnership(timelockAddress)` called in deploy script.

---

## Frontend Pages to Build

### `/dividends` -- Claim Dividends

- Shows user's CRED balance
- Shows pending claimable ETH
- Shows all-time claimed
- Shows protocol-wide stats: total interest distributed, APY estimate
- Claim button

### `/govern` -- Governance Hub

- Active proposals list with vote counts and time remaining
- Past proposals with outcomes
- Create proposal form (for holders above threshold)
- Individual proposal page: description, calldatas, vote buttons (For / Against / Abstain)
- Delegation widget: delegate your votes to self or another address

### `/sale` -- Private Sale (if we want a UI)

- Amount of ETH to send, shows CRED received
- Progress bar: ETH raised vs cap
- Buy button
- Only accessible during sale window

---

## Deployment Sequence

```
1.  Deploy CredToken(deployer)
2.  Deploy CredDividends(credToken)
3.  Set CredToken.dividends = CredDividends address
4.  Deploy CredPrivateSale(credToken, pricePerToken, cap, start, end)
5.  Transfer 40M CRED to CredPrivateSale
6.  Transfer 40M CRED to team vesting contract (or deployer for now)
7.  Transfer 10M CRED to treasury wallet
8.  Transfer 10M CRED to grants multisig
9.  Deploy TimelockController(delay=2days, proposers=[], executors=[])
10. Deploy CredGovernor(credToken, timelock)
11. Grant PROPOSER_ROLE to governor on timelock
12. Grant EXECUTOR_ROLE to governor on timelock
13. Renounce TIMELOCK_ADMIN_ROLE from deployer on timelock
14. Upgrade GitHubLoanPool: mutable params, interest forwarding, set dividends + treasury addresses
15. GitHubLoanPool.transferOwnership(timelockAddress)
16. Verify all contracts on Basescan
```

---

## Files to Create / Modify

### Contracts

| File | Action | Depends On |
|---|---|---|
| `contracts/contracts/CredToken.sol` | Create | -- |
| `contracts/contracts/CredDividends.sol` | Create | CredToken |
| `contracts/contracts/CredPrivateSale.sol` | Create | CredToken |
| `contracts/contracts/CredGovernor.sol` | Create | CredToken, Timelock |
| `contracts/contracts/GitHubLoanPool.sol` | Modify | CredDividends |
| `contracts/deploy/03_cred_token.ts` | Create | -- |
| `contracts/deploy/04_cred_dividends.ts` | Create | CredToken deploy |
| `contracts/deploy/05_cred_private_sale.ts` | Create | CredToken deploy |
| `contracts/deploy/06_cred_governor.ts` | Create | CredToken, Timelock deploy |
| `contracts/deploy/07_wire_pool.ts` | Create | All above |
| `contracts/test/CredToken.test.ts` | Create | -- |
| `contracts/test/CredDividends.test.ts` | Create | CredToken |
| `contracts/test/CredPrivateSale.test.ts` | Create | CredToken |
| `contracts/test/CredGovernor.test.ts` | Create | CredToken |
| `contracts/test/LoanPool.dividends.test.ts` | Create | All contracts |

### Frontend

| File | Action | Notes |
|---|---|---|
| `frontend/app/dividends/page.tsx` | Create | Claim UI |
| `frontend/app/dividends/components/ClaimCard.tsx` | Create | Main claim widget |
| `frontend/app/dividends/components/StatsBar.tsx` | Create | Protocol-wide stats |
| `frontend/app/govern/page.tsx` | Create | Proposal list |
| `frontend/app/govern/[id]/page.tsx` | Create | Single proposal + voting |
| `frontend/app/govern/new/page.tsx` | Create | Create proposal |
| `frontend/app/govern/components/ProposalCard.tsx` | Create | -- |
| `frontend/app/govern/components/VoteButtons.tsx` | Create | -- |
| `frontend/app/govern/components/DelegateWidget.tsx` | Create | -- |
| `frontend/app/sale/page.tsx` | Create | Private sale UI |
| `frontend/lib/contracts/cred-token.ts` | Create | ABI + address config |
| `frontend/lib/contracts/cred-dividends.ts` | Create | ABI + address config |
| `frontend/lib/contracts/cred-governor.ts` | Create | ABI + address config |
| `frontend/lib/contracts/cred-sale.ts` | Create | ABI + address config |
| `frontend/app/layout.tsx` | Modify | Add nav links for new pages |

---

## Build Order (Phases)

### Phase 1: Token + Dividends (no governance dependency)
1. `CredToken.sol` + tests
2. `CredDividends.sol` + tests
3. Modify `GitHubLoanPool.sol` -- interest forwarding + mutable params
4. Integration test: borrow -> repay -> dividends flow

### Phase 2: Private Sale
5. `CredPrivateSale.sol` + tests
6. Deploy scripts for token + dividends + sale (testnet)
7. Frontend: `/sale` page

### Phase 3: Governance
8. `CredGovernor.sol` + tests
9. Deploy scripts for governor + timelock (testnet)
10. Wire pool ownership to timelock
11. Frontend: `/govern` pages

### Phase 4: Dividends UI
12. Frontend: `/dividends` page
13. Add nav links

### Phase 5: Testnet QA + Mainnet Deploy
14. End-to-end test on Base Sepolia
15. Mainnet deployment
16. Basescan verification

---

## Open Questions

- **Team vesting:** Use a vesting contract on-chain, or handle off-chain for now?
- **Private sale price:** What ETH/CRED rate? Need to decide before deploying sale contract.
- **Treasury address:** EOA or multisig? Gnosis Safe recommended before mainnet.
- **Quorum realism:** 4% = 4M CRED to reach quorum. If private sale holders are passive, proposals may never pass. Consider lowering to 1-2%.
