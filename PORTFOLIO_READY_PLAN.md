# BaseCred Portfolio-Ready Plan

**Goal:** make BaseCred safe to publish on GitHub and list on `nachdakwale.com/projects.html` as a working Base Sepolia (testnet) demo. Mainnet deployment is **out of scope** for this run.

**Working directory:** `/Users/nachdakwale/projects/basecred`
**Current branch:** `feat/mainnet-dual-environment`
**Target end state:** public GitHub repo `nach-dakwale/basecred`, clean history, fresh identity-bound contract live on Sepolia with a seeded pool, polished README, and a new `<li>` entry in `~/projects/nachdakwale.github.io/projects.html`.

---

## Authoritative context

Before doing anything else, read these in full:

- `MAINNET_READINESS.md` — full security review. The findings labeled "pre-remediation" apply to the currently-live Sepolia contract; the `feat/mainnet-dual-environment` branch implements the fixes.
- `.env.mainnet.local` — secrets already acquired by the previous session (Alchemy, Etherscan V2, Tenderly, agent signer wallet). **Do not commit this file.** It is gitignored. Do not use mainnet-specific values from it during this run; only the agent signer keypair and the Etherscan key are relevant if a verification step calls for it. Mainnet work is deferred.
- `~/projects/nachdakwale.github.io/projects.html` — search for `data-project-id="instadomain-mcp"` for the listing pattern to mirror.
- `~/Brain/projects/basecred.md` — keep this file in sync as you go (Status, addresses, key decisions).

User constraints to respect (from Brain memory + global preferences):
- No em dashes anywhere (code, copy, commits).
- Keep every source file ≤ 250 lines.
- Commit each logical unit of work; never leave uncommitted changes.
- Conventional commit messages.
- Git identity is auto-fixed to `Nach Dakwale <nach@nachdakwale.com>` by the hook; do not override.
- Never spend real money. This entire plan is testnet only and free tier only.
- Never recommend self-hosted VPS or paid hosting for this project; Cloudflare Workers free tier is the deploy target.

---

## Phase 1 — Sanitize git history (BEFORE any push)

The repo cannot be made public until the committed secrets are gone from history. The committed files are `contracts/.env` and `frontend/.env.local` (per `MAINNET_READINESS.md` finding #2).

1. Confirm the secrets are still in history:
   ```
   git log --all --full-history -- contracts/.env frontend/.env.local | head
   ```
2. Use `git filter-repo` to strip both paths from all commits:
   ```
   pip install --user git-filter-repo  # if not installed
   git filter-repo --invert-paths --path contracts/.env --path frontend/.env.local --force
   ```
3. Verify with `git log --all --full-history -- contracts/.env frontend/.env.local` — should be empty.
4. Also strip any other paths that grep turns up as containing live secrets (`grep -rIn 'PRIVATE_KEY\|AUTH_SECRET\|AUTH_GITHUB_SECRET' .git/` against the rewritten repo to spot-check).
5. Force-push will be required when the repo is pushed to GitHub later; that is acceptable because the repo has no public remote yet.

**Acceptance:** `git log -p --all | grep -E '0x[a-fA-F0-9]{64}|AUTH_SECRET=' | head` returns nothing that looks like a real secret.

Treat the previously-committed Sepolia owner/oracle key and the AUTH_GITHUB_SECRET as permanently compromised. The history scrub prevents future readers from finding them, but the fresh Sepolia deploy in Phase 2 must use brand-new keys regardless.

---

## Phase 2 — Fresh Sepolia deploy from the identity-bound contract

The currently-live contract `0x660726E88d838Da13FFbD3368302f88C8a717Ed4` on Base Sepolia has the multi-wallet credit-reuse exploit and the leaked owner key. Replace it.

1. Make sure you are on `feat/mainnet-dual-environment` and tests pass:
   ```
   cd contracts && npm install && npm run compile && npm run test
   cd ../frontend && npm install && npm run typecheck && npm run test
   ```
2. Generate a fresh Sepolia owner + oracle keypair (two distinct keys; the new contract separates these roles):
   ```
   node -e "const {generatePrivateKey, privateKeyToAccount} = require('viem/accounts'); for (const r of ['owner','oracle']) { const pk = generatePrivateKey(); console.log(r, privateKeyToAccount(pk).address, pk); }"
   ```
   Save both into `contracts/.env` (gitignored) following the variable names in `contracts/.env.example`. Never include the private keys in any committed file.
3. Fund the new owner on Base Sepolia from the Coinbase / Base public faucet (free). Need only enough for deploy gas — ~0.01 Sepolia ETH is plenty.
4. Deploy with the correct script. `package.json` currently references `scripts/deploy.ts` but the checked-in script is `scripts/deploy.js` (finding #8). Fix the mismatch before running:
   - Rename or update `package.json` so `npm run deploy:sepolia` actually resolves.
   - The deploy script must read owner + oracle from env and revert if either is missing.
5. Run the Sepolia deploy. Record the new contract address in `~/Brain/projects/basecred.md` and in `frontend/.env.testnet` (gitignored copy of the example).
6. Seed the new pool with 0.05–0.1 Sepolia ETH from the funded owner key (the contract's `depositPool` or equivalent in the new identity-bound version).
7. Update the live frontend to point at the new contract:
   - `frontend/wrangler.toml` testnet env: set `NEXT_PUBLIC_CONTRACT_ADDRESS` to the new address.
   - Update OAuth callback URL on GitHub OAuth app `3623442` if the Worker URL is changing (it should not — same `basecred-testnet.nachdakwale.workers.dev/dapp` Worker, only the contract is new).
8. Deploy the testnet Worker:
   ```
   cd frontend && npm run build:testnet && npx wrangler deploy --env testnet
   ```
9. Verify the dapp loads at `https://basecred-testnet.nachdakwale.workers.dev/dapp`, GitHub OAuth completes, a score lands on the new contract, and a small loan request succeeds end to end. Use Playwright or `gstack`'s browse skill for the smoke test.

**Acceptance:**
- New contract address recorded.
- Pool > 0 on the new contract.
- A test GitHub login → score → loan flow completes end to end.
- The old contract `0x6607…7Ed4` is no longer referenced anywhere in the repo (grep for the full address).

---

## Phase 3 — Repo hygiene

1. **ESLint 9 flat config** (finding #10). Add `frontend/eslint.config.mjs` using `@eslint/js` + `eslint-config-next` flat compat. Run `npm run lint` and fix any new findings until it passes clean.
2. **LICENSE.** Add MIT at repo root.
3. **README.md** at repo root. ≤ 250 lines. Sections:
   - One-paragraph what / why.
   - Live demo link (`https://basecred-testnet.nachdakwale.workers.dev/dapp`).
   - Architecture diagram or bullet list: Solidity contract on Base Sepolia, Next.js 15 + Auth.js + viem frontend on Cloudflare Workers via OpenNext, server-signed oracle endpoint.
   - "Try it" steps: connect GitHub, get scored, request a small loan, repay.
   - Local dev: prerequisites, `npm install`, env file copies, `npm run dev`.
   - Threat model + identity-binding explanation (short).
   - Tested with: `npm run test` (contracts) and `npm run test` (frontend), `npm run lint`, `npm run typecheck`. Mention these are CI gates.
   - Status: **Testnet only.** Explicitly state mainnet is not deployed.
   - License.
4. Confirm the **"Base Sepolia (testnet only)" banner** is rendered in the dapp UI on every page. If not, add it as a small persistent ribbon. Acceptance: visible on `/`, `/dapp`, and any sub-routes.
5. **OG image.** Generate a 1200×630 PNG at `frontend/public/og.png` (simple: project name, one-line description, BaseCred logo or emoji). Wire it into Next.js metadata so `<meta property="og:image">` resolves at the deployed Worker URL.
6. **Conventional commits throughout.** Group changes logically (one commit per: lint fix, license, readme, banner, og, contract redeploy address bump). Do not bundle everything into one mega-commit.

**Acceptance:**
- `npm run lint`, `npm run typecheck`, and all tests pass on a clean checkout.
- README renders cleanly on GitHub preview (test by pushing to a private fork first if uncertain).
- Sharing the dapp URL on a chat client renders the OG card correctly.

---

## Phase 4 — Publish

1. Create the public GitHub repo:
   ```
   gh repo create nach-dakwale/basecred --public --source . --description "Undercollateralized ETH loans on Base, credit-scored by GitHub reputation" --homepage "https://basecred-testnet.nachdakwale.workers.dev/dapp" --remote origin
   ```
2. Push (force, because of the history rewrite):
   ```
   git push -u origin feat/mainnet-dual-environment:main --force
   ```
   Then make `main` the default branch on GitHub and delete the old branch.
3. Add a GitHub repo topic list: `base`, `defi`, `solidity`, `nextjs`, `cloudflare-workers`, `auth-js`, `viem`.
4. Optional but recommended: set up Cloudflare custom domain `basecred.nachdakwale.com` pointing at the testnet Worker. Free. If the user does not want a new subdomain, skip; do not block.

**Acceptance:** `https://github.com/nach-dakwale/basecred` loads, README renders, live site link works, no secrets in any commit.

---

## Phase 5 — Add to portfolio page

Edit `~/projects/nachdakwale.github.io/projects.html`. Mirror the InstaDomain pattern. Place the BaseCred `<li>` in chronological order (it is a 2026 project — slot it next to the other 2026 items).

```html
<li class="project-item" data-project-id="basecred">
    <button class="project-header" type="button" aria-expanded="false">
        <span class="project-name">BaseCred</span>
        <span class="project-desc">Undercollateralized ETH loans on Base, credit-scored by GitHub reputation</span>
        <span class="project-year">2026</span>
    </button>
    <div class="project-details">
        <p>
            Connect a GitHub account, get scored by an on-chain-aware oracle that
            reads your public contribution history, and borrow ETH against that
            reputation. Identity-bound credit prevents the same GitHub account
            from minting fresh wallets to bypass exposure limits. Live on Base
            Sepolia as a working demo.
        </p>
        <div class="project-detail-links">
            <a class="detail-link" href="https://github.com/nach-dakwale/basecred" target="_blank" rel="noopener noreferrer" title="GitHub" aria-label="BaseCred on GitHub">
                <i class="fab fa-github"></i>
            </a>
            <a class="detail-link" href="https://basecred-testnet.nachdakwale.workers.dev/dapp" target="_blank" rel="noopener noreferrer" title="Live demo" aria-label="BaseCred live demo">
                <i class="fas fa-external-link-alt"></i>
            </a>
        </div>
    </div>
</li>
```

Commit, push, confirm `https://nachdakwale.com/projects.html` renders the new item correctly (GitHub Pages auto-deploys from `main`).

**Acceptance:** new item visible on the live portfolio, expand/collapse works, both links open the expected destinations.

---

## Final checks before declaring done

- Visit the live dapp from a fresh browser profile (no cookies, no existing GitHub session). Connect a real GitHub account that is not Nach's. Confirm score + loan request succeed on the new contract.
- Visit the GitHub repo and read the README from a stranger's perspective. Tighten anything that does not parse cold.
- Run the full CI gate locally one more time on the freshly-cloned repo: contract tests, frontend lint + typecheck + tests, both Worker builds.
- Update `~/Brain/projects/basecred.md`:
  - Status: still `Active`, add a new section "Portfolio listing" with the GitHub URL and listing date.
  - Replace the old contract address with the new one.
  - Move the "Next steps" items that are now done.
  - Add the new "Open questions" that emerged (mainnet still gated on funding; whether to add a custom domain).
- Commit and push the Brain update.

## Out of scope for this run

- Anything mainnet. Mainnet artifacts in `.env.mainnet.local` are not to be used. Mainnet deployment, Safe deployment, funding, monitoring wiring all wait for a separate go-live run that requires user approval.
- Refactoring beyond what is needed to pass lint and ship the demo.
- Marketing copy beyond the portfolio item.
- Analytics, error tracking, paywalls, premium tiers.

## Reporting

When done, return a single message back to the parent that includes:

- New Sepolia contract address.
- GitHub repo URL.
- Live portfolio listing URL section anchor.
- Any deviations from this plan and why.
- Any items left undone with reason.
