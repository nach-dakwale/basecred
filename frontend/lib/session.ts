export interface PublicGitHubSession {
  githubId?: string;
  githubLogin?: string;
}

export function addPublicGitHubIdentity<T extends object>(
  session: T,
  token: { githubId?: unknown; githubLogin?: unknown },
): T & PublicGitHubSession {
  const result = session as T & PublicGitHubSession;
  if (typeof token.githubId === "string") result.githubId = token.githubId;
  if (typeof token.githubLogin === "string") result.githubLogin = token.githubLogin;
  return result;
}
