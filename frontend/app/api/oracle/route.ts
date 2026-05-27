import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, isHex, verifyMessage } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { auth } from "@/auth";
import { auditEvent } from "@/lib/audit";
import { ABI } from "@/lib/contract";
import { PUBLIC_NETWORK, serverRpcUrl } from "@/lib/network";
import { allowApiRequest, requestIp } from "@/lib/rate-limit";
import { fetchAndScore, type ScoreBreakdown } from "@/lib/scoring";
import { bindingMessage, identityIdForGitHubUser, parseBindingRequest } from "@/lib/wallet-binding";

const SCORE_CACHE_TTL_MS = 60 * 60 * 1000;
const scoreCache = new Map<string, { breakdown: ScoreBreakdown; cachedAt: number }>();

export async function POST(request: NextRequest) {
  const session = await auth();
  const githubSession = session as { githubId?: string; githubLogin?: string } | null;
  if (!githubSession?.githubId || !githubSession.githubLogin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const identityId = identityIdForGitHubUser(githubSession.githubId);

  try {
    if (!await allowApiRequest("oracle", identityId, requestIp(request))) {
      auditEvent("oracle.rate_limited", { identityId });
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }
    const { challenge, signature } = parseBindingRequest(
      await request.json(),
      identityId,
      PUBLIC_NETWORK.chain.id,
      PUBLIC_NETWORK.contractAddress,
      PUBLIC_NETWORK.name,
    );
    let validSignature = false;
    try {
      validSignature = await verifyMessage({ address: challenge.wallet, message: bindingMessage(challenge), signature });
    } catch {
      validSignature = false;
    }
    if (!validSignature) {
      auditEvent("oracle.invalid_signature", { identityId, wallet: challenge.wallet });
      return NextResponse.json({ error: "Invalid wallet proof" }, { status: 401 });
    }

    const oracleKey = process.env.ORACLE_PRIVATE_KEY;
    if (!oracleKey || !isHex(oracleKey) || oracleKey.length !== 66) {
      auditEvent("oracle.not_configured", { identityId });
      return NextResponse.json({ error: "Oracle not configured" }, { status: 503 });
    }
    const cached = scoreCache.get(githubSession.githubId);
    const now = Date.now();
    const breakdown = cached && now - cached.cachedAt < SCORE_CACHE_TTL_MS
      ? cached.breakdown
      : (await fetchAndScore(githubSession.githubLogin, process.env.GITHUB_API_TOKEN)).breakdown;
    scoreCache.set(githubSession.githubId, { breakdown, cachedAt: now });

    const account = privateKeyToAccount(oracleKey);
    const transport = http(serverRpcUrl());
    const publicClient = createPublicClient({ chain: PUBLIC_NETWORK.chain, transport });
    const walletClient = createWalletClient({ account, chain: PUBLIC_NETWORK.chain, transport });
    const simulation = await publicClient.simulateContract({
      account,
      address: PUBLIC_NETWORK.contractAddress,
      abi: ABI,
      functionName: "setScoreAndBind",
      args: [identityId, challenge.wallet, BigInt(breakdown.score), challenge.nonce],
    });
    const hash = await walletClient.writeContract(simulation.request);
    await publicClient.waitForTransactionReceipt({ hash });
    auditEvent("oracle.score_bound", { identityId, wallet: challenge.wallet, score: breakdown.score, txHash: hash });
    return NextResponse.json({ txHash: hash, score: breakdown.score, breakdown });
  } catch (error) {
    auditEvent("oracle.failed", { identityId });
    console.error("Oracle request failed", error instanceof Error ? error.name : "unknown error");
    return NextResponse.json({ error: "Oracle request failed" }, { status: 400 });
  }
}
