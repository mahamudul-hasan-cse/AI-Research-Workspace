import { createHmac, randomBytes } from "node:crypto";
import { isIP } from "node:net";

export const CHAT_RATE_LIMIT = { requests: 10, sharedRequests: 60, windowMs: 60_000, maxClients: 5000 } as const;

/**
 * Best-effort burst protection per warm server instance, not a distributed quota.
 * Synchronous admission avoids concurrent check/increment races. Expired entries
 * are pruned, and a full map rejects new clients rather than evicting live budgets.
 */
export function createChatRateLimiter() {
  const clients = new Map<string, { count: number; resetAt: number }>();
  const salt = randomBytes(32);
  return (headers: Headers, now = Date.now()) => {
    // Only Vercel's platform-provided IP is trusted. On other hosts all callers
    // share one bucket; arbitrary forwarded headers cannot mint new budgets.
    const candidate = process.env.VERCEL === "1" ? headers.get("x-vercel-forwarded-for")?.trim() : null;
    const identity = candidate && isIP(candidate) ? candidate : "shared";
    const limit = identity === "shared" ? CHAT_RATE_LIMIT.sharedRequests : CHAT_RATE_LIMIT.requests;
    const key = createHmac("sha256", salt).update(identity).digest("hex");
    for (const [client, bucket] of clients) {
      if (bucket.resetAt <= now) clients.delete(client);
    }
    let bucket = clients.get(key);
    if (!bucket) {
      if (clients.size >= CHAT_RATE_LIMIT.maxClients) {
        return { allowed: false, retryAfter: 60 };
      }
      bucket = { count: 0, resetAt: now + CHAT_RATE_LIMIT.windowMs };
      clients.set(key, bucket);
    }
    if (bucket.count >= limit) {
      return { allowed: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
    }
    bucket.count += 1;
    return { allowed: true, retryAfter: 0 };
  };
}

export const checkChatRateLimit = createChatRateLimiter();
