import { getDatabaseProvider, type DatabaseProvider } from "@/lib/db/provider";

function isPrivateHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (
    lower === "localhost" ||
    lower.endsWith(".localhost") ||
    lower.endsWith(".local")
  ) {
    return true;
  }
  if (lower === "127.0.0.1" || lower === "0.0.0.0" || lower === "::1") {
    return true;
  }

  // Check IPv4 private ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16
  const parts = lower.split(".");
  if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
    const num0 = Number(parts[0]);
    const num1 = Number(parts[1]);
    if (num0 === 10) return true;
    if (num0 === 127) return true;
    if (num0 === 0) return true;
    if (num0 === 192 && num1 === 168) return true;
    if (num0 === 172 && num1 >= 16 && num1 <= 31) return true;
    if (num0 === 169 && num1 === 254) return true;
  }
  return false;
}

export function validatePublicAppUrl(
  rawUrl: string | undefined,
  provider: DatabaseProvider = getDatabaseProvider(),
): string {
  const trimmed = rawUrl?.trim();
  if (!trimmed) {
    if (provider === "sqlite") {
      return "http://localhost:3000";
    }
    throw new Error(
      "NEXT_PUBLIC_APP_URL is required in production Turso mode for certificate issuance and QR generation.",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(
      `Invalid NEXT_PUBLIC_APP_URL: "${trimmed}" is not a valid URL.`,
    );
  }

  if (provider === "turso") {
    if (parsed.protocol !== "https:") {
      throw new Error(
        `Invalid NEXT_PUBLIC_APP_URL: production Turso mode requires https:// protocol, received "${parsed.protocol}".`,
      );
    }
    if (isPrivateHostname(parsed.hostname)) {
      throw new Error(
        `Invalid NEXT_PUBLIC_APP_URL: production Turso mode does not permit private/local hostname "${parsed.hostname}".`,
      );
    }
  }

  return parsed.origin;
}

export function getPublicAppUrl(
  provider: DatabaseProvider = getDatabaseProvider(),
): string {
  return validatePublicAppUrl(process.env.NEXT_PUBLIC_APP_URL, provider);
}

export function buildVerificationUrl(
  token: string,
  provider: DatabaseProvider = getDatabaseProvider(),
): string {
  const origin = getPublicAppUrl(provider);
  const cleanToken = token.trim();
  return `${origin}/verify/${encodeURIComponent(cleanToken)}`;
}
