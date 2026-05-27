# BaseCred

Undercollateralized ETH loans on Base, credit-scored by GitHub reputation.

**Live demo:** https://basecred-testnet.nachdakwale.workers.dev/dapp

> Status: **Testnet only.** The contract runs on Base Sepolia. Mainnet is not deployed.

---

## What it does

Connect a GitHub account, get scored by an on-chain-aware oracle that reads your public contribution history, and borrow ETH against that reputation. Identity binding prevents the same GitHub account from minting fresh wallets to bypass exposure limits.

## Architecture

- **Smart contract** - Solidity on Base Sepolia. Stores identity bindings (GitHub identity hash to wallet), credit scores, and loan state. Enforces collateral requirements by tier, tracks defaults permanently, caps aggregate exposure.
- **Frontend** - Next.js 15, Auth.js (GitHub OAuth), viem, deployed to Cloudflare Workers via OpenNext. Server-side oracle endpoint signs score submissions with a dedicated key.
- **Oracle** - Server-side route reads the authenticated GitHub session, scores public contribution history (repos, stars, commit frequency, account age), generates a proof nonce, and calls `setScoreAndBind` on the contract.

## Try it

1. Go to https://basecred-testnet.nachdakwale.workers.dev/dapp
2. Click "Connect GitHub" and authorize the OAuth app
3. Click "Refresh Verified On-Chain Score" to mint your credit score on-chain
4. Connect your wallet (MetaMask or Coinbase Wallet) on Base Sepolia
5. Request a small loan - amount depends on your tier (Tier 1: 0.05 ETH, Tier 4: 0.75 ETH)
6. Repay with 10% flat interest within the repayment window

Need Base Sepolia ETH? Use the [Alchemy faucet](https://www.alchemy.com/faucets/base-sepolia).

## Local dev

**Prerequisites:** Node.js 20+, a GitHub OAuth app, a Cloudflare account.

```bash
git clone https://github.com/nach-dakwale/basecred
cd basecred

# Contracts
cd contracts
npm install
cp .env.example .env          # fill in DEPLOYER_PRIVATE_KEY, ORACLE_ADDRESS, OWNER_ADDRESS
npm run compile
npm run test

# Frontend
cd ../frontend
npm install
cp .env.testnet.example .env.testnet.local  # fill in contract address
cp .env.example .env.local                  # fill in AUTH_SECRET, AUTH_GITHUB_*, ORACLE_PRIVATE_KEY
npm run dev
```

The dev server runs at http://localhost:3000. Set your GitHub OAuth app callback URL to `http://localhost:3000/api/auth/callback/github`.

## Threat model

**Identity binding** prevents a single GitHub account from borrowing through multiple wallets. `setScoreAndBind` consumes a proof nonce and stores a hash of the GitHub identity. A second wallet bind requires a 30-day migration cooldown with no active loan.

**Default persistence** - liquidated identities are permanently blocked from new borrowing. The frontend surfaces this as "defaulted - borrowing permanently blocked."

**Collateral reservation** - `withdrawPool` only accesses free liquidity above reserved borrower collateral. Active loan collateral cannot be swept by the owner.

**Oracle separation** - The contract owner and oracle are distinct addresses. The oracle can be rotated or revoked by the owner without a contract upgrade.

## Running CI locally

```bash
# Contracts
cd contracts && npm run compile && npm run test

# Frontend
cd frontend && npm run lint && npm run typecheck && npm run test

# Build testnet Worker (requires .env.testnet.local)
npm run build:testnet
```

## License

MIT
