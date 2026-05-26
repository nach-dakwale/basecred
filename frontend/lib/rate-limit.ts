import { getCloudflareContext } from "@opennextjs/cloudflare";

interface RateLimiter {
  limit(input: { key: string }): Promise<{ success: boolean }>;
}

const fallbackBuckets = new Map<string, { count: number; resetAt: number }>();
const LOCAL_LIMIT = 8;
const LOCAL_WINDOW_MS = 60_000;

function localLimit(key: string): boolean {
  const now = Date.now();
  const bucket = fallbackBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    fallbackBuckets.set(key, { count: 1, resetAt: now + LOCAL_WINDOW_MS });
    return true;
  }
  if (bucket.count >= LOCAL_LIMIT) return false;
  bucket.count += 1;
  return true;
}

export async function allowApiRequest(route: string, identityId: string, ipAddress: string): Promise<boolean> {
  const key = `${route}:${identityId}:${ipAddress}`;
  try {
    const context = await getCloudflareContext({ async: true });
    const limiter = (context.env as unknown as { API_RATE_LIMITER?: RateLimiter }).API_RATE_LIMITER;
    if (limiter) return (await limiter.limit({ key })).success;
  } catch {
    // Local Next.js execution has no Cloudflare binding.
  }
  if (process.env.NODE_ENV === "production") return false;
  return localLimit(key);
}

export function requestIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP") || request.headers.get("x-forwarded-for") || "local";
}
