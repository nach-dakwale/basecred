import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchAndScore } from "@/lib/scoring";

export async function GET(req: NextRequest) {
  void req;
  const session = await auth();
  const token = (session as { githubAccessToken?: string } | null)?.githubAccessToken;
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const result = await fetchAndScore(token);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Score fetch failed:", err);
    return NextResponse.json({ error: "GitHub API error" }, { status: 502 });
  }
}
