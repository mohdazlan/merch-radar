/**
 * eBay OAuth2 client-credentials flow. App token cached in module scope for
 * ~2h (token TTL is 7200s; we refresh at 110min). Server-side only.
 */

const SCOPE = "https://api.ebay.com/oauth/api_scope";
const TOKEN_TTL_MS = 110 * 60 * 1000;

let cachedToken: { value: string; expiresAt: number } | null = null;

export function ebayApiBase(): string {
  return process.env.EBAY_ENV === "production"
    ? "https://api.ebay.com"
    : "https://api.sandbox.ebay.com";
}

export function ebayConfigured(): boolean {
  return Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);
}

export async function getAppToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }
  const id = process.env.EBAY_CLIENT_ID;
  const secret = process.env.EBAY_CLIENT_SECRET;
  if (!id || !secret) throw new Error("eBay credentials not configured");

  const res = await fetch(`${ebayApiBase()}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: SCOPE,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`eBay token request failed: ${res.status}`);
  }
  const data = (await res.json()) as { access_token: string };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + TOKEN_TTL_MS };
  return data.access_token;
}

/** exponential backoff on 429/5xx; refreshes the app token once on 401 */
export async function ebayFetch(
  path: string,
  init: RequestInit = {},
  attempts = 3,
): Promise<Response> {
  let token = await getAppToken();
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const res = await fetch(`${ebayApiBase()}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": process.env.EBAY_MARKETPLACE_ID ?? "EBAY_US",
      },
      cache: "no-store",
    });
    if (res.ok) return res;
    if (res.status === 401 && attempt === 0) {
      token = await getAppToken(true);
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      lastError = new Error(`eBay ${path} → ${res.status}`);
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      continue;
    }
    throw new Error(`eBay ${path} → ${res.status}`);
  }
  throw lastError ?? new Error(`eBay ${path} failed after ${attempts} attempts`);
}
