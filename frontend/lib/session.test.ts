import { describe, expect, it } from "vitest";
import { addPublicGitHubIdentity } from "@/lib/session";

describe("public browser session", () => {
  it("includes public identity fields but never copies an OAuth access token", () => {
    const session = addPublicGitHubIdentity(
      { user: { name: "developer" } },
      { githubId: "123", githubLogin: "developer", githubAccessToken: "must-not-leak" } as never,
    ) as unknown as Record<string, unknown>;
    expect(session.githubId).toBe("123");
    expect(session.githubLogin).toBe("developer");
    expect(session.githubAccessToken).toBeUndefined();
  });
});
