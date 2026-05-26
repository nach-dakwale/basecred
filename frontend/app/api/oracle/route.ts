import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchAndScore } from "@/lib/scoring";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { ABI, CONTRACT_ADDRESS } from "@/lib/contract";
import type { ScoreBreakdown } from "@/lib/scoring";

const SCORE_CACHE_TTL_MS = 60 * 60 * 1000;
const scoreCache = new Map<string, { breakdown: ScoreBreakdown; cachedAt: number }>();

export async function POST(req: NextRequest) {
  const session = await auth();
  const githubSession = session as { githubAccessToken?: string; githubLogin?: string } | null;
  const token = githubSession?.githubAccessToken;
  const githubLogin = githubSession?.githubLogin;
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { ethAddress } = (await req.json()) as { ethAddress?: string };
  if (!ethAddress) return NextResponse.json({ error: "ethAddress required" }, { status: 400 });

  const oracleKey = process.env.ORACLE_PRIVATE_KEY;
  if (!oracleKey) return NextResponse.json({ error: "Oracle not configured" }, { status: 500 });

  try {
    let breakdown: ScoreBreakdown;

    if (githubLogin) {
      const cached = scoreCache.get(githubLogin);
      const now = Date.now();

      if (cached && now - cached.cachedAt < SCORE_CACHE_TTL_MS) {
        breakdown = cached.breakdown;
      } else {
        ({ breakdown } = await fetchAndScore(token));
        scoreCache.set(githubLogin, { breakdown, cachedAt: now });
      }
    } else {
      ({ breakdown } = await fetchAndScore(token));
    }

    const account = privateKeyToAccount(oracleKey as `0x${string}`);
    const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http() });
    const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });

    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: "setScore",
      args: [ethAddress as `0x${string}`, BigInt(breakdown.score)],
    });

    await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({ txHash: hash, score: breakdown.score, breakdown });
  } catch (err) {
    console.error("Oracle error:", err);
    return NextResponse.json({ error: "Oracle error" }, { status: 500 });
  }
}
