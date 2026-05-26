import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchAndScore } from "@/lib/scoring";
import { allowApiRequest, requestIp } from "@/lib/rate-limit";
import { identityIdForGitHubUser } from "@/lib/wallet-binding";

export async function GET(req: NextRequest) {
  const session = await auth();
  const githubSession = session as { githubId?: string; githubLogin?: string } | null;
  if (!githubSession?.githubId || !githubSession.githubLogin) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const identityId = identityIdForGitHubUser(githubSession.githubId);
    if (!await allowApiRequest("score", identityId, requestIp(req))) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }
    const result = await fetchAndScore(githubSession.githubLogin, process.env.GITHUB_API_TOKEN);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Score fetch failed:", err);
    return NextResponse.json({ error: "GitHub API error" }, { status: 502 });
  }
}
