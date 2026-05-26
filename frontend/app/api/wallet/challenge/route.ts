import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { bytesToHex, getAddress } from "viem";
import { auth } from "@/auth";
import { PUBLIC_NETWORK } from "@/lib/network";
import { allowApiRequest, requestIp } from "@/lib/rate-limit";
import { bindingMessage, CHALLENGE_TTL_MS, identityIdForGitHubUser } from "@/lib/wallet-binding";

export async function POST(request: NextRequest) {
  const session = await auth();
  const githubId = (session as { githubId?: string } | null)?.githubId;
  if (!githubId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { wallet } = await request.json() as { wallet?: string };
    if (!wallet) return NextResponse.json({ error: "Wallet is required" }, { status: 400 });
    const identityId = identityIdForGitHubUser(githubId);
    if (!await allowApiRequest("challenge", identityId, requestIp(request))) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }
    const challenge = {
      wallet: getAddress(wallet),
      identityId,
      nonce: bytesToHex(randomBytes(32)),
      expiresAt: Date.now() + CHALLENGE_TTL_MS,
      chainId: PUBLIC_NETWORK.chain.id,
      contractAddress: PUBLIC_NETWORK.contractAddress,
      networkName: PUBLIC_NETWORK.name,
    };
    return NextResponse.json({ ...challenge, message: bindingMessage(challenge) });
  } catch {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }
}
