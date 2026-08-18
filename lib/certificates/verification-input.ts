export type ParsedVerificationInput =
  | {
      navigationPath: string;
      token: string;
      type: "token";
      valid: true;
    }
  | {
      code: string;
      navigationPath: string;
      type: "short_code";
      valid: true;
    }
  | {
      error: string;
      valid: false;
    };

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const SHORT_CODE_PATTERN = /^BB-[0-9A-F]{8}$/;

function isLikelyDangerousScheme(input: string): boolean {
  const lower = input.trim().toLowerCase();
  return (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("file:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("//")
  );
}

export function normalizeShortVerificationCode(raw: string): string | null {
  const normalized = raw.trim().toUpperCase();
  if (SHORT_CODE_PATTERN.test(normalized)) {
    return normalized;
  }
  return null;
}

export function parseVerificationInput(
  rawInput: string | null | undefined,
  options?: {
    trustedOrigins?: readonly string[];
  },
): ParsedVerificationInput {
  if (!rawInput) {
    return {
      error: "Verification input cannot be empty.",
      valid: false,
    };
  }

  const trimmed = rawInput.trim();
  if (trimmed.length === 0 || trimmed.length > 2048) {
    return {
      error: "Verification input is invalid or exceeds maximum length.",
      valid: false,
    };
  }

  if (isLikelyDangerousScheme(trimmed)) {
    return {
      error: "This QR code is not a Barangay Bato certificate verification code.",
      valid: false,
    };
  }

  // 1. Direct Short Verification Code check (e.g. BB-12345678)
  const shortCode = normalizeShortVerificationCode(trimmed);
  if (shortCode) {
    return {
      code: shortCode,
      navigationPath: `/verify?code=${shortCode}`,
      type: "short_code",
      valid: true,
    };
  }

  // 2. Direct Raw Token check (43 characters base64url)
  if (TOKEN_PATTERN.test(trimmed)) {
    return {
      navigationPath: `/verify/${trimmed}`,
      token: trimmed,
      type: "token",
      valid: true,
    };
  }

  // 3. Relative path check: /verify/<token> or /verify?code=<shortCode>
  if (trimmed.startsWith("/verify/")) {
    const candidate = trimmed.slice("/verify/".length).split("?")[0]?.split("#")[0]?.trim();
    if (candidate && TOKEN_PATTERN.test(candidate)) {
      return {
        navigationPath: `/verify/${candidate}`,
        token: candidate,
        type: "token",
        valid: true,
      };
    }
  }

  if (trimmed.startsWith("/verify?code=")) {
    const rawCode = trimmed.slice("/verify?code=".length).split("&")[0]?.split("#")[0]?.trim();
    const candidateCode = rawCode ? normalizeShortVerificationCode(rawCode) : null;
    if (candidateCode) {
      return {
        code: candidateCode,
        navigationPath: `/verify?code=${candidateCode}`,
        type: "short_code",
        valid: true,
      };
    }
  }

  // 4. Absolute URL check
  try {
    const parsed = new URL(trimmed);

    // Only allow http: / https:
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        error: "This QR code is not a Barangay Bato certificate verification code.",
        valid: false,
      };
    }

    // Validate origin against trusted origins if provided
    if (options?.trustedOrigins && options.trustedOrigins.length > 0) {
      const isTrusted = options.trustedOrigins.some((origin) => {
        try {
          const trustedUrl = new URL(origin);
          return parsed.origin.toLowerCase() === trustedUrl.origin.toLowerCase();
        } catch {
          return false;
        }
      });

      if (!isTrusted) {
        return {
          error: "This QR code is not a Barangay Bato certificate verification code.",
          valid: false,
        };
      }
    }

    // Check pathname: /verify/<token>
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts.length === 2 && pathParts[0] === "verify") {
      const candidateToken = pathParts[1];
      if (candidateToken && TOKEN_PATTERN.test(candidateToken)) {
        return {
          navigationPath: `/verify/${candidateToken}`,
          token: candidateToken,
          type: "token",
          valid: true,
        };
      }
    }

    // Check search param: /verify?code=<shortCode>
    if (pathParts.length === 1 && pathParts[0] === "verify") {
      const queryCode = parsed.searchParams.get("code");
      if (queryCode) {
        const candidateCode = normalizeShortVerificationCode(queryCode);
        if (candidateCode) {
          return {
            code: candidateCode,
            navigationPath: `/verify?code=${candidateCode}`,
            type: "short_code",
            valid: true,
          };
        }
      }
    }
  } catch {
    // Not a valid URL
  }

  return {
    error: "This QR code is not a Barangay Bato certificate verification code.",
    valid: false,
  };
}
