// Web3-focused GitHub credit scorer for BaseCred

const WEB3_ORGS = new Set([
  // Base / Ethereum core
  "ethereum", "ethers-io", "wevm", "base-org", "wagmi-dev",
  "foundry-rs", "OpenZeppelin", "safe-global", "hardhat-foundation",
  // Solana
  "solana-labs", "coral-xyz",
  // Other major chains
  "stacks-network", "hirosystems", "paritytech", "polkadot-fellows",
  "cosmos", "tendermint", "near",
  // Major DeFi / infra
  "Uniswap", "aave", "compound-finance", "MakerDAO", "transmissions11",
]);

export interface GitHubData {
  accountAgeYears:    number;
  web3MergedPRs:      number;
  otherOssMergedPRs:  number;
  personalRepoEvents: number;
}

export interface ScoreBreakdown {
  score:          number;
  web3Points:     number;
  ossPoints:      number;
  personalPoints: number;
  ageBonus:       number;
  tier:           0 | 1 | 2 | 3 | 4;
  maxLoanEth:     number;
  collateralPct:  number;
}

const TIERS = [
  { minScore: 601, maxLoanEth: 0.75, collateralPct: 0   },
  { minScore: 501, maxLoanEth: 0.40, collateralPct: 20  },
  { minScore: 351, maxLoanEth: 0.15, collateralPct: 50  },
  { minScore: 201, maxLoanEth: 0.05, collateralPct: 100 },
] as const;

function ageBonusPts(years: number): number {
  if (years >= 5) return 200;
  if (years >= 3) return 100;
  if (years >= 1) return 30;
  return 0;
}

export function calculateScore(data: GitHubData): ScoreBreakdown {
  const web3Points     = Math.min(data.web3MergedPRs * 20, 400);
  const ossPoints      = Math.min(data.otherOssMergedPRs * 5, 150);
  const personalPoints = Math.min(Math.floor(data.personalRepoEvents * 0.5), 50);
  const ageBonus       = ageBonusPts(data.accountAgeYears);

  const score = Math.min(web3Points + ossPoints + personalPoints + ageBonus, 650);
  const tier  = TIERS.find((t) => score >= t.minScore);

  return {
    score,
    web3Points,
    ossPoints,
    personalPoints,
    ageBonus,
    tier:          tier ? ((TIERS.length - TIERS.indexOf(tier)) as 1 | 2 | 3 | 4) : 0,
    maxLoanEth:    tier?.maxLoanEth    ?? 0,
    collateralPct: tier?.collateralPct ?? 0,
  };
}

export function isWeb3Org(org: string): boolean {
  return WEB3_ORGS.has(org);
}

export interface FetchScoreResult {
  data:      GitHubData;
  breakdown: ScoreBreakdown;
}

export async function fetchAndScore(githubLogin: string, githubApiToken?: string): Promise<FetchScoreResult> {
  if (!/^[A-Za-z0-9-]{1,39}$/.test(githubLogin)) throw new Error("Invalid GitHub login");
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "BaseCred/1.0",
  };
  if (githubApiToken) headers.Authorization = `Bearer ${githubApiToken}`;

  const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(githubLogin)}`, { headers });
  if (!userRes.ok) throw new Error(`GitHub API ${userRes.status}`);
  const user = await userRes.json();

  const accountAgeYears =
    (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365);

  const web3Query = `is:pr is:merged author:${user.login} ${[...WEB3_ORGS].map((o) => `org:${o}`).join(" ")}`;
  const web3Res   = await fetch(
    `https://api.github.com/search/issues?q=${encodeURIComponent(web3Query)}&per_page=1`,
    { headers }
  );
  if (!web3Res.ok) throw new Error(`GitHub API ${web3Res.status}`);
  const web3MergedPRs = ((await web3Res.json()).total_count ?? 0) as number;

  const allPrsRes = await fetch(
    `https://api.github.com/search/issues?q=${encodeURIComponent(`is:pr is:merged author:${user.login}`)}&per_page=1`,
    { headers }
  );
  if (!allPrsRes.ok) throw new Error(`GitHub API ${allPrsRes.status}`);
  const otherOssMergedPRs = Math.max(0, ((await allPrsRes.json()).total_count ?? 0) - web3MergedPRs);

  const eventsRes = await fetch(
    `https://api.github.com/users/${user.login}/events/public?per_page=100`,
    { headers }
  );
  if (!eventsRes.ok) throw new Error(`GitHub API ${eventsRes.status}`);
  const events = await eventsRes.json();
  const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const personalRepoEvents = Array.isArray(events)
    ? events.filter(
        (e: { type: string; created_at: string }) =>
          e.type === "PushEvent" && new Date(e.created_at).getTime() > oneYearAgo
      ).length
    : 0;

  const data: GitHubData = { accountAgeYears, web3MergedPRs, otherOssMergedPRs, personalRepoEvents };
  return { data, breakdown: calculateScore(data) };
}
